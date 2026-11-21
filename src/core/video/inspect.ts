import type { VideoFormat } from './formats'
import type { VideoRejectionReason } from './messages'
import { detectVideoType } from './signature'

export interface VideoLimits {
  maxFileBytes: number
}

/**
 * O vídeo e o resultado ficam na memória durante o processamento: 1 GB cabe num computador comum.
 * Revisar depois de medir em celulares.
 */
export const VIDEO_LIMITS: VideoLimits = {
  maxFileBytes: 1024 * 1024 * 1024,
}

/** O início basta para o cabeçalho EBML e para os pacotes de TS. */
const SIGNATURE_BYTES = 4096

export type VideoCheck = { ok: true; format: VideoFormat } | { ok: false; reason: VideoRejectionReason }

const reject = (reason: VideoRejectionReason): VideoCheck => ({ ok: false, reason })

/**
 * Primeira barreira, antes de abrir o vídeo no Worker: tamanho e formato pelo conteúdo.
 * Lê só o início do arquivo; a leitura completa (faixas, duração, codecs) fica com o Worker.
 */
export async function checkVideoFile(file: Blob, limits: VideoLimits = VIDEO_LIMITS): Promise<VideoCheck> {
  if (file.size === 0) return reject({ code: 'empty' })
  if (file.size > limits.maxFileBytes) return reject({ code: 'too-large', maxBytes: limits.maxFileBytes })

  const bytes = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer())
  const detected = detectVideoType(bytes)
  if (detected.kind === 'supported') return { ok: true, format: detected.format }
  if (detected.kind === 'unsupported') {
    return reject({ code: 'unsupported-format', formatName: detected.name, ...(detected.category && { category: detected.category }) })
  }
  return reject({ code: 'unsupported-format' })
}
