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
import { orientationMatrix, orientedDimensions, type Orientation } from '../core/image/orientation'
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

interface Area {
  x: number
  y: number
  width: number
  height: number
}

let oneStepDownscale: boolean | undefined

/**
 * O motor reduz bem num passo só? Com `imageSmoothingQuality = 'high'`, o Chromium tira a média dos
 * pixels; o Firefox, que não tem essa opção, cria listras falsas (moiré). Reduzir uma vez listras de
 * 1 px revela o comportamento, como a sonda do WEBP, sem depender do nome do navegador.
 */
function downscalesInOneStep(): boolean {
  oneStepDownscale ??= (() => {
    try {
      const source = new OffscreenCanvas(100, 8)
      const sourceContext = source.getContext('2d')
      const target = new OffscreenCanvas(13, 1)
      const context = target.getContext('2d', { willReadFrequently: true })
      if (!sourceContext || !context) return false
      sourceContext.fillStyle = '#000000'
      sourceContext.fillRect(0, 0, 100, 8)
      sourceContext.fillStyle = '#ffffff'
      for (let x = 1; x < 100; x += 2) sourceContext.fillRect(x, 0, 1, 8)
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, 13, 1)
      const { data } = context.getImageData(0, 0, 13, 1)
      for (let index = 0; index < data.length; index += 4) if (Math.abs((data[index] ?? 0) - 128) > 24) return false
      return true
    } catch {
      return false // na dúvida, reduz em etapas: mais lento, mas sem listras
    }
  })()
  return oneStepDownscale
}

/**
 * Desenha `source` no retângulo `area`, reduzindo ou ampliando. Onde um passo só cria listras falsas
 * (Firefox), reduções fortes passam por etapas de metade: a cada metade, qualquer motor tira a média
 * dos pixels. Cada etapa ocupa um quarto da memória da anterior e é liberada em seguida.
 */
function drawResized(source: ImageBitmap | OffscreenCanvas, context: OffscreenCanvasRenderingContext2D, area: Area) {
  const { x, y, width, height } = area
  if (downscalesInOneStep()) {
    context.imageSmoothingQuality = 'high'
    context.drawImage(source, x, y, width, height)
    return
  }
  let step: OffscreenCanvas | undefined
  try {
    for (;;) {
      const current = step ?? source
      const stepWidth = current.width >= width * 2 ? Math.round(current.width / 2) : current.width
      const stepHeight = current.height >= height * 2 ? Math.round(current.height / 2) : current.height
      if (stepWidth === current.width && stepHeight === current.height) break
      const next = createSurface(stepWidth, stepHeight)
      next.context.imageSmoothingQuality = 'high'
      next.context.drawImage(current, 0, 0, stepWidth, stepHeight)
      if (step) release(step)
      step = next.canvas
    }
    context.imageSmoothingQuality = 'high'
    context.drawImage(step ?? source, x, y, width, height)
  } finally {
    if (step) release(step)
  }
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
      drawResized(source, context, { x: Math.floor((size - width) / 2), y: Math.floor((size - height) / 2), width, height })
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

/** Gira e espelha sem reamostrar: a matriz leva cada pixel exatamente para outro. */
function drawOriented(context: OffscreenCanvasRenderingContext2D, bitmap: ImageBitmap, orientation: Orientation) {
  context.setTransform(...orientationMatrix(orientation, bitmap))
  context.drawImage(bitmap, 0, 0)
  context.setTransform(1, 0, 0, 1, 0, 0)
}

/** Medidas do resultado: as pedidas, as da imagem girada ou as da original. */
function outputDimensions(job: ConvertJob, bitmap: ImageBitmap) {
  if (job.resize) return job.resize
  if (job.orientation) return orientedDimensions(bitmap, job.orientation)
  return { width: bitmap.width, height: bitmap.height }
}

async function convert(job: ConvertJob): Promise<ConvertOutput> {
  const format = OUTPUT_FORMAT_INFO[job.target]
  const bitmap = await decode(job.file)
  const { width, height } = outputDimensions(job, bitmap)
  let surface: Surface | undefined
  try {
    surface = createSurface(width, height, isPixelFormat(job.target))
    if (!format.supportsAlpha) {
      // Formato sem transparência: o fundo escolhido aparece onde a imagem era transparente.
      surface.context.fillStyle = job.background
      surface.context.fillRect(0, 0, width, height)
    }
    if (job.resize) drawResized(bitmap, surface.context, { x: 0, y: 0, width, height })
    else if (job.orientation) drawOriented(surface.context, bitmap, job.orientation)
    else surface.context.drawImage(bitmap, 0, 0)
    bitmap.close() // o canvas já tem os pixels; libera a imagem decodificada antes de codificar
    const blob = await encodeAs(job, surface)
    return { kind: 'convert', blob, width, height }
  } finally {
    bitmap.close()
    if (surface) release(surface.canvas)
  }
}

/** Cópia que cabe em `maxSide` (o maior lado), sem ampliar. Quem recebe libera o canvas. */
function shrunk(source: ImageBitmap | OffscreenCanvas, maxSide: number): Surface {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const surface = createSurface(width, height)
  try {
    drawResized(source, surface.context, { x: 0, y: 0, width, height })
  } catch (error) {
    release(surface.canvas)
    throw error
  }
  return surface
}

async function encodeShrunk(source: ImageBitmap | OffscreenCanvas, maxSide: number, mimeType: string): Promise<Blob> {
  const { canvas } = shrunk(source, maxSide)
  try {
    return await encode(canvas, mimeType, 0.85)
  } finally {
    release(canvas)
  }
}

/**
 * Prévia e miniatura reduzidas: a imagem original inteira nunca vai para a tela. A miniatura sai da
 * prévia, e não da original: reduzir a imagem inteira de novo custaria quase o dobro do tempo.
 */
async function preview(job: PreviewJob): Promise<PreviewOutput> {
  const bitmap = await decode(job.file)
  const { width, height } = bitmap
  let large: Surface | undefined
  try {
    const mimeType = (await canEncodeWebp()) ? 'image/webp' : 'image/png'
    large = shrunk(bitmap, job.previewSize)
    bitmap.close() // a prévia já tem o que é preciso; libera a imagem decodificada
    const previewBlob = await encode(large.canvas, mimeType, 0.85)
    const thumbnail = await encodeShrunk(large.canvas, job.thumbnailSize, mimeType)
    return { kind: 'preview', preview: previewBlob, thumbnail, width, height }
  } finally {
    bitmap.close()
    if (large) release(large.canvas)
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
