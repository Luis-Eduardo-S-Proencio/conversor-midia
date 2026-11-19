/**
 * Worker de imagens: decodifica, converte, gera prévias e monta ZIP fora da thread principal.
 * Cada pedido recebe exatamente uma resposta, de sucesso ou com um código de erro estável.
 */
import { encodeBmp } from '../core/image/encode/bmp'
import { icoHeader, icoSizes } from '../core/image/encode/ico'
import { pdfParts } from '../core/image/encode/pdf'
import type { PixelSource } from '../core/image/encode/pixels'
import { encodeTiff } from '../core/image/encode/tiff'
import { OUTPUT_FORMAT_INFO, type OutputFormat } from '../core/image/formats'
import type { ProcessingErrorCode } from '../core/image/messages'
import type {
  ConvertJob,
  ConvertOutput,
  ImageJob,
  JobOutput,
  PreviewJob,
  PreviewOutput,
  WorkerRequest,
  WorkerResponse,
  ZipJob,
  ZipOutput,
} from './image-protocol'

class JobError extends Error {
  readonly code: ProcessingErrorCode

  constructor(code: ProcessingErrorCode) {
    super(code)
    this.code = code
  }
}

let webpEncoding: Promise<boolean> | undefined

/** O Safari não gera WEBP pelo canvas: devolve PNG sem avisar. Uma imagem de 1×1 revela isso. */
function canEncodeWebp(): Promise<boolean> {
  webpEncoding ??= (async () => {
    try {
      const canvas = new OffscreenCanvas(1, 1)
      canvas.getContext('2d')?.fillRect(0, 0, 1, 1)
      const blob = await canvas.convertToBlob({ type: 'image/webp' })
      return blob.type === 'image/webp'
    } catch {
      return false // sem codificador: o formato fica indisponível na interface
    }
  })()
  return webpEncoding
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (error) {
    // Navegadores que não conhecem o valor "from-image" recusam a opção com TypeError;
    // nesse caso tenta sem ela (o padrão também respeita a orientação EXIF).
    if (!(error instanceof TypeError)) throw new JobError('decode-failed')
  }
  try {
    return await createImageBitmap(file)
  } catch {
    throw new JobError('decode-failed')
  }
}

interface Surface {
  canvas: OffscreenCanvas
  context: OffscreenCanvasRenderingContext2D
}

/**
 * Canvas grande demais para a memória do aparelho falha ao criar ou devolve contexto nulo.
 * `willReadFrequently` deixa os pixels na memória comum, onde lê-los (getImageData) é rápido.
 */
function createSurface(width: number, height: number, willReadFrequently = false): Surface {
  try {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently })
    if (context) return { canvas, context }
  } catch {
    // Falha de alocação: tratada abaixo com o mesmo código do contexto nulo.
  }
  throw new JobError('canvas-unavailable')
}

/** Zerar as dimensões libera a memória do canvas na hora, sem esperar a coleta. */
function release(canvas: OffscreenCanvas) {
  canvas.width = 0
  canvas.height = 0
}

async function encode(canvas: OffscreenCanvas, mimeType: string, quality?: number): Promise<Blob> {
  let blob: Blob
  try {
    blob = await canvas.convertToBlob({ type: mimeType, quality })
  } catch {
    throw new JobError('encode-failed')
  }
  // O navegador pode entregar PNG no lugar do formato pedido, sem erro.
  if (blob.type !== mimeType) throw new JobError('encode-unsupported')
  return blob
}

/** Formatos que o próprio app escreve a partir dos pixels do canvas (`core/image/encode`). */
const PIXEL_ENCODERS = { bmp: encodeBmp, tiff: encodeTiff } as const
type PixelFormat = keyof typeof PIXEL_ENCODERS
const isPixelFormat = (format: OutputFormat): format is PixelFormat => format in PIXEL_ENCODERS

function pixelSource({ canvas, context }: Surface): PixelSource {
  return { width: canvas.width, height: canvas.height, readRows: (y, rows) => context.getImageData(0, y, canvas.width, rows).data }
}

/** Cada parte vira Blob na hora: o navegador guarda os bytes e a faixa lida pode ser liberada. */
function blobFromParts(parts: Iterable<Uint8Array<ArrayBuffer>>, type: string): Blob {
  const blobs: Blob[] = []
  try {
    for (const part of parts) blobs.push(new Blob([part]))
  } catch (error) {
    if (import.meta.env.DEV) console.error(error) // detalhe técnico só em desenvolvimento
    throw new JobError('encode-failed')
  }
  return new Blob(blobs, { type })
}

/** ICO com os tamanhos padrão; imagens não quadradas ficam centralizadas, com margens transparentes. */
async function encodeIco(source: OffscreenCanvas): Promise<Blob> {
  const images: Array<{ size: number; png: Blob }> = []
  for (const size of icoSizes(source.width, source.height)) {
    const { canvas, context } = createSurface(size, size)
    try {
      const scale = Math.min(size / source.width, size / source.height)
      const width = Math.max(1, Math.round(source.width * scale))
      const height = Math.max(1, Math.round(source.height * scale))
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height)
      images.push({ size, png: await encode(canvas, 'image/png') })
    } finally {
      release(canvas)
    }
  }
  const header = icoHeader(images.map(({ size, png }) => ({ size, byteLength: png.size })))
  return new Blob([header, ...images.map(({ png }) => png)], { type: OUTPUT_FORMAT_INFO.ico.mimeType })
}

/** PDF de uma página com a imagem em JPG, que entra no arquivo sem ser copiada. */
async function encodePdf(canvas: OffscreenCanvas, quality: number): Promise<Blob> {
  const jpeg = await encode(canvas, 'image/jpeg', quality)
  const { head, tail } = pdfParts({ width: canvas.width, height: canvas.height, imageLength: jpeg.size })
  return new Blob([head, jpeg, tail], { type: OUTPUT_FORMAT_INFO.pdf.mimeType })
}

async function encodeAs(job: ConvertJob, surface: Surface): Promise<Blob> {
  const { target } = job
  const format = OUTPUT_FORMAT_INFO[target]
  if (isPixelFormat(target)) return blobFromParts(PIXEL_ENCODERS[target](pixelSource(surface)), format.mimeType)
  if (target === 'ico') return encodeIco(surface.canvas)
  if (target === 'pdf') return encodePdf(surface.canvas, job.quality)
  return encode(surface.canvas, format.mimeType, format.lossy ? job.quality : undefined)
}

/**
 * Desenha a imagem nas medidas do destino. Reduções fortes passam por etapas de metade: num passo só,
 * o Firefox, que não tem `imageSmoothingQuality`, cria listras falsas (moiré); a cada metade, qualquer
 * motor tira a média dos pixels. Cada etapa ocupa um quarto da memória da anterior e é liberada em seguida.
 */
function drawResized(target: Surface, bitmap: ImageBitmap) {
  const { width, height } = target.canvas
  let step: OffscreenCanvas | undefined
  try {
    for (;;) {
      const source = step ?? bitmap
      const stepWidth = source.width >= width * 2 ? Math.round(source.width / 2) : source.width
      const stepHeight = source.height >= height * 2 ? Math.round(source.height / 2) : source.height
      if (stepWidth === source.width && stepHeight === source.height) break
      const next = createSurface(stepWidth, stepHeight)
      next.context.imageSmoothingQuality = 'high'
      next.context.drawImage(source, 0, 0, stepWidth, stepHeight)
      if (step) release(step)
      step = next.canvas
    }
    target.context.imageSmoothingQuality = 'high'
    target.context.drawImage(step ?? bitmap, 0, 0, width, height)
  } finally {
    if (step) release(step)
  }
}

async function convert(job: ConvertJob): Promise<ConvertOutput> {
  const format = OUTPUT_FORMAT_INFO[job.target]
  const bitmap = await decode(job.file)
  const { width, height } = job.resize ?? bitmap
  let surface: Surface | undefined
  try {
    surface = createSurface(width, height, isPixelFormat(job.target))
    if (!format.supportsAlpha) {
      // Formato sem transparência: o fundo escolhido aparece onde a imagem era transparente.
      surface.context.fillStyle = job.background
      surface.context.fillRect(0, 0, width, height)
    }
    if (job.resize) drawResized(surface, bitmap)
    else surface.context.drawImage(bitmap, 0, 0)
    bitmap.close() // o canvas já tem os pixels; libera a imagem decodificada antes de codificar
    const blob = await encodeAs(job, surface)
    return { kind: 'convert', blob, width, height }
  } finally {
    bitmap.close()
    if (surface) release(surface.canvas)
  }
}

async function scaled(bitmap: ImageBitmap, maxSide: number, mimeType: string): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const { canvas, context } = createSurface(width, height)
  try {
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    return await encode(canvas, mimeType, 0.85)
  } finally {
    release(canvas)
  }
}

/** Prévia e miniatura reduzidas: a imagem original inteira nunca vai para a tela. */
async function preview(job: PreviewJob): Promise<PreviewOutput> {
  const bitmap = await decode(job.file)
  try {
    const mimeType = (await canEncodeWebp()) ? 'image/webp' : 'image/png'
    const previewBlob = await scaled(bitmap, job.previewSize, mimeType)
    const thumbnail = await scaled(bitmap, job.thumbnailSize, mimeType)
    return { kind: 'preview', preview: previewBlob, thumbnail, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/**
 * ZIP montado em fluxo: um arquivo por vez na memória, e cada pedaço do ZIP vira Blob na hora.
 * BMP e TIFF não têm compressão; montar tudo de uma vez guardaria o lote inteiro duas vezes.
 */
async function zip(job: ZipJob): Promise<ZipOutput> {
  const { Zip, ZipPassThrough } = await import('fflate')
  const parts: Blob[] = []
  let failure: unknown
  const archive = new Zip((error, chunk) => {
    if (error) failure = error
    // O fflate entrega Uint8Array de ArrayBuffer comum; o tipo genérico só não sabe disso.
    else parts.push(new Blob([chunk as Uint8Array<ArrayBuffer>]))
  })
  for (const entry of job.entries) {
    // Guardar sem recomprimir: é muito mais rápido, e a maioria dos formatos já vem comprimida.
    const file = new ZipPassThrough(entry.name)
    archive.add(file)
    file.push(new Uint8Array(await entry.blob.arrayBuffer()), true)
  }
  archive.end()
  if (failure) throw failure
  return { kind: 'zip', blob: new Blob(parts, { type: 'application/zip' }) }
}

async function run(job: ImageJob): Promise<JobOutput> {
  switch (job.kind) {
    case 'convert':
      return convert(job)
    case 'preview':
      return preview(job)
    case 'probe':
      return { kind: 'probe', webpEncoding: await canEncodeWebp() }
    case 'zip':
      return zip(job)
  }
}

function respond(response: WorkerResponse) {
  self.postMessage(response)
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  run(request).then(
    (output) => respond({ id: request.id, ok: true, output }),
    (error: unknown) => {
      if (error instanceof JobError) {
        respond({ id: request.id, ok: false, code: error.code })
        return
      }
      if (import.meta.env.DEV) console.error(error) // detalhe técnico só em desenvolvimento
      respond({ id: request.id, ok: false, code: 'unexpected' })
    },
  )
})
