import type { ImageFormat } from './formats'
import { readImageHeader } from './header'
import type { RejectionReason } from './messages'
import { detectImageType } from './signature'

export interface ImageLimits {
  maxFileBytes: number
  maxPixels: number
  maxFiles: number
  /** Até onde ler procurando o cabeçalho; além disso o arquivo é tratado como corrompido. */
  maxHeaderBytes: number
}

/** Limites aprovados para a primeira versão; revisar após medir em celulares. */
export const IMAGE_LIMITS: ImageLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  maxPixels: 50_000_000,
  maxFiles: 20,
  maxHeaderBytes: 4 * 1024 * 1024,
}

export interface InspectedImage {
  format: ImageFormat
  width: number
  height: number
  hasAlpha: boolean
  animated: boolean
}

export type Inspection = { ok: true; image: InspectedImage } | { ok: false; reason: RejectionReason }

const INITIAL_READ_BYTES = 64 * 1024

const reject = (reason: RejectionReason): Inspection => ({ ok: false, reason })

async function readStart(file: Blob, length: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer())
}

/**
 * Valida um arquivo antes de decodificá-lo: tamanho, formato pelo conteúdo e dimensões do cabeçalho.
 * Lê só o início do arquivo, ampliando a leitura quando o cabeçalho for mais longo.
 */
export async function inspectImageFile(file: Blob, limits: ImageLimits = IMAGE_LIMITS): Promise<Inspection> {
  if (file.size === 0) return reject({ code: 'empty' })
  if (file.size > limits.maxFileBytes) return reject({ code: 'too-large', maxBytes: limits.maxFileBytes })

  let length = Math.min(file.size, INITIAL_READ_BYTES, limits.maxHeaderBytes)
  let bytes = await readStart(file, length)

  const detected = detectImageType(bytes)
  if (detected.kind === 'unsupported') return reject({ code: 'unsupported-format', formatName: detected.name })
  if (detected.kind === 'unknown') return reject({ code: 'unsupported-format' })

  for (;;) {
    const result = readImageHeader(bytes, detected.format, file.size)
    if (result.status === 'invalid') return reject({ code: 'corrupt' })

    if (result.status === 'ok') {
      const { width, height, hasAlpha, animated } = result.header
      const pixels = width * height
      if (pixels > limits.maxPixels) {
        return reject({ code: 'too-many-pixels', megapixels: pixels / 1_000_000, maxMegapixels: limits.maxPixels / 1_000_000 })
      }
      return { ok: true, image: { format: detected.format, width, height, hasAlpha, animated } }
    }

    if (result.bytes > limits.maxHeaderBytes || length >= file.size) return reject({ code: 'corrupt' })
    length = Math.min(file.size, limits.maxHeaderBytes, Math.max(result.bytes, length * 2))
    bytes = await readStart(file, length)
  }
}
