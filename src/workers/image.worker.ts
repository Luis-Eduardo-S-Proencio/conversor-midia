/**
 * Worker de imagens: decodifica, converte, gera prévias e monta ZIP fora da thread principal.
 * Cada pedido recebe exatamente uma resposta, de sucesso ou com um código de erro estável.
 */
import { isCropWithin, type CropRect } from '../core/image/crop'
import { encodeBmp } from '../core/image/encode/bmp'
import { icoHeader, icoSizes } from '../core/image/encode/ico'
import { pdfParts } from '../core/image/encode/pdf'
import type { PixelSource } from '../core/image/encode/pixels'
import { PNG_END, planPng, pngChunk, pngHeader, pngScanlines, type PngOptions } from '../core/image/encode/png'
import { encodeTiff } from '../core/image/encode/tiff'
import { OUTPUT_FORMAT_INFO, type OutputFormat } from '../core/image/formats'
import type { ProcessingErrorCode } from '../core/image/messages'
import { orientationMatrix, orientedDimensions, type Orientation } from '../core/image/orientation'
import type {
  CollageJob,
  CollageJobPiece,
  CollageOutput,
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

/**
 * PNG próprio (`core/image/encode/png`), bem mais leve que o do navegador e sem perdas: tipo de cor pelo
 * conteúdo e filtro por linha, comprimido pelo `CompressionStream` do navegador. Sem ele (navegador antigo),
 * fica o PNG do próprio navegador.
 */
async function encodePng(surface: Surface, options: PngOptions = {}): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') return encode(surface.canvas, 'image/png')
  try {
    const source = pixelSource(surface)
    const plan = planPng(source, options)
    const deflate = new CompressionStream('deflate') // formato zlib, o que o PNG pede
    const writer = deflate.writable.getWriter()
    const blocks: Blob[] = []
    const collecting = (async () => {
      const reader = deflate.readable.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        // Cada pedaço comprimido vira um bloco IDAT: a imagem nunca fica inteira na memória.
        blocks.push(new Blob([pngChunk('IDAT', value)]))
      }
    })()
    const writing = (async () => {
      try {
        for (const scanlines of pngScanlines(source, plan)) await writer.write(scanlines)
        await writer.close()
      } catch (error) {
        await writer.abort(error) // encerra a compressão: a leitura acima também termina com erro
        throw error
      }
    })()
    await Promise.all([writing, collecting])
    return new Blob([pngHeader(source.width, source.height, plan), ...blocks, PNG_END], { type: 'image/png' })
  } catch (error) {
    if (import.meta.env.DEV) console.error(error) // detalhe técnico só em desenvolvimento
    throw new JobError('encode-failed')
  }
}

/** ICO com os tamanhos padrão; imagens não quadradas ficam centralizadas, com margens transparentes. */
async function encodeIco(source: OffscreenCanvas): Promise<Blob> {
  const images: Array<{ size: number; png: Blob }> = []
  for (const size of icoSizes(source.width, source.height)) {
    const surface = createSurface(size, size, true)
    try {
      const scale = Math.min(size / source.width, size / source.height)
      const width = Math.max(1, Math.round(source.width * scale))
      const height = Math.max(1, Math.round(source.height * scale))
      drawResized(source, surface.context, { x: Math.floor((size - width) / 2), y: Math.floor((size - height) / 2), width, height })
      // O Windows só garante o PNG de 32 bits (RGBA) dentro do ICO.
      images.push({ size, png: await encodePng(surface, { forceRgba: true }) })
    } finally {
      release(surface.canvas)
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
  if (target === 'png') return encodePng(surface)
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

/** Copia só a área pedida, pixel a pixel (sem reamostrar). */
function drawCropped(context: OffscreenCanvasRenderingContext2D, bitmap: ImageBitmap, crop: CropRect) {
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
}

/** Medidas do resultado: as pedidas, as da imagem girada, as da área recortada ou as da original. */
function outputDimensions(job: ConvertJob, bitmap: ImageBitmap) {
  if (job.resize) return job.resize
  if (job.orientation) return orientedDimensions(bitmap, job.orientation)
  if (job.crop) {
    // A ferramenta valida a área sobre as medidas da prévia, que vêm desta mesma decodificação.
    // Fora da imagem, só por erro de programação: falha em vez de gerar um arquivo errado.
    if (!isCropWithin(job.crop, bitmap)) throw new JobError('unexpected')
    return { width: job.crop.width, height: job.crop.height }
  }
  return { width: bitmap.width, height: bitmap.height }
}

async function convert(job: ConvertJob): Promise<ConvertOutput> {
  const format = OUTPUT_FORMAT_INFO[job.target]
  const bitmap = await decode(job.file)
  let surface: Surface | undefined
  try {
    const { width, height } = outputDimensions(job, bitmap)
    // Os formatos que o app escreve leem os pixels de volta (PNG duas vezes): o navegador guarda o canvas na CPU.
    surface = createSurface(width, height, isPixelFormat(job.target) || job.target === 'png')
    if (!format.supportsAlpha) {
      // Formato sem transparência: o fundo escolhido aparece onde a imagem era transparente.
      surface.context.fillStyle = job.background
      surface.context.fillRect(0, 0, width, height)
    }
    if (job.resize) drawResized(bitmap, surface.context, { x: 0, y: 0, width, height })
    else if (job.orientation) drawOriented(surface.context, bitmap, job.orientation)
    else if (job.crop) drawCropped(surface.context, bitmap, job.crop)
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

/** Contorno de retângulo com cantos arredondados (centrado na origem), para recortar ou preencher. */
function roundedRect(context: OffscreenCanvasRenderingContext2D, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(-width / 2, -height / 2, width, height, Math.max(0, Math.min(radius, width / 2, height / 2)))
}

/**
 * Uma foto da colagem: decodifica, separa a parte que aparece e a reduz para o tamanho do espaço antes de
 * desenhar. Uma foto por vez: nove fotos de 12 MP decodificadas juntas passariam de 400 MB.
 */
async function drawCollagePiece(context: OffscreenCanvasRenderingContext2D, piece: CollageJobPiece, shadow: CollageJob['shadow']) {
  const bitmap = await decode(piece.file)
  let region: ImageBitmap | undefined
  let tile: Surface | undefined
  try {
    // A parte pedida, em pixels inteiros e sempre dentro da foto (o plano veio das medidas desta mesma decodificação).
    const x = Math.min(bitmap.width - 1, Math.max(0, Math.floor(piece.source.x)))
    const y = Math.min(bitmap.height - 1, Math.max(0, Math.floor(piece.source.y)))
    const width = Math.max(1, Math.min(bitmap.width - x, Math.round(piece.source.width)))
    const height = Math.max(1, Math.min(bitmap.height - y, Math.round(piece.source.height)))
    try {
      region = await createImageBitmap(bitmap, x, y, width, height)
    } catch {
      throw new JobError('canvas-unavailable')
    }
    bitmap.close()
    const tileWidth = Math.max(1, Math.round(piece.box.width))
    const tileHeight = Math.max(1, Math.round(piece.box.height))
    tile = createSurface(tileWidth, tileHeight)
    drawResized(region, tile.context, { x: 0, y: 0, width: tileWidth, height: tileHeight })
    region.close()

    context.save()
    context.translate(piece.box.cx, piece.box.cy)
    context.rotate((piece.box.rotation * Math.PI) / 180)
    if (piece.border > 0 || shadow) {
      // Moldura (ou só a forma da foto, quando não há moldura) com a sombra; a foto vem por cima, sem sombra.
      const outer = piece.border > 0 && piece.radius > 0 ? piece.radius + piece.border : piece.radius
      if (shadow) {
        context.shadowColor = shadow.color
        context.shadowBlur = shadow.blur
        context.shadowOffsetY = shadow.offsetY
      }
      context.fillStyle = piece.borderColor
      roundedRect(context, tileWidth + 2 * piece.border, tileHeight + 2 * piece.border, outer)
      context.fill()
      context.shadowColor = 'transparent'
      context.shadowBlur = 0
      context.shadowOffsetY = 0
    }
    roundedRect(context, tileWidth, tileHeight, piece.radius)
    context.clip()
    context.drawImage(tile.canvas, -tileWidth / 2, -tileHeight / 2)
    context.restore()
  } finally {
    bitmap.close()
    region?.close()
    if (tile) release(tile.canvas)
  }
}

async function collage(job: CollageJob): Promise<CollageOutput> {
  const surface = createSurface(job.width, job.height)
  try {
    surface.context.fillStyle = job.background
    surface.context.fillRect(0, 0, job.width, job.height)
    surface.context.imageSmoothingQuality = 'high'
    for (const piece of job.pieces) await drawCollagePiece(surface.context, piece, job.shadow)
    const blob = await encode(surface.canvas, 'image/jpeg', job.quality)
    return { kind: 'collage', blob, width: job.width, height: job.height }
  } finally {
    release(surface.canvas)
  }
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
    case 'collage':
      return collage(job)
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
