/**
 * Worker de imagens: decodifica, converte, gera prévias e monta ZIP fora da thread principal.
 * Cada pedido recebe exatamente uma resposta, de sucesso ou com um código de erro estável.
 */
import { IMAGE_FORMATS } from '../core/image/formats'
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

/** Canvas grande demais para a memória do aparelho falha ao criar ou devolve contexto nulo. */
function createSurface(width: number, height: number): Surface {
  try {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
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

async function convert(job: ConvertJob): Promise<ConvertOutput> {
  const format = IMAGE_FORMATS[job.target]
  const bitmap = await decode(job.file)
  const { width, height } = bitmap
  let surface: Surface | undefined
  try {
    surface = createSurface(width, height)
    if (!format.supportsAlpha) {
      // JPG não tem transparência: o fundo escolhido aparece onde a imagem era transparente.
      surface.context.fillStyle = job.background
      surface.context.fillRect(0, 0, width, height)
    }
    surface.context.drawImage(bitmap, 0, 0)
    bitmap.close() // o canvas já tem os pixels; libera a imagem decodificada antes de codificar
    const blob = await encode(surface.canvas, format.mimeType, format.lossy ? job.quality : undefined)
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

async function zip(job: ZipJob): Promise<ZipOutput> {
  const { zipSync } = await import('fflate')
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}
  // Imagens já vêm comprimidas: guardar sem recomprimir (level 0) é muito mais rápido.
  for (const entry of job.entries) files[entry.name] = [new Uint8Array(await entry.blob.arrayBuffer()), { level: 0 }]
  // O fflate devolve Uint8Array de ArrayBuffer comum; o tipo genérico só não sabe disso.
  const data = zipSync(files) as Uint8Array<ArrayBuffer>
  return { kind: 'zip', blob: new Blob([data], { type: 'application/zip' }) }
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
