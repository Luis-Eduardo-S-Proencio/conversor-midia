/**
 * Comprimir vídeo: níveis, resolução final, taxa de bits do vídeo e tamanho estimado.
 * Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import type { VideoFormat } from './formats'
import { fitShortSide, roundBitrate, videoBitrateFor } from './sizing'

export type CompressionLevel = 'light' | 'balanced' | 'strong'

export const COMPRESSION_LEVELS: readonly CompressionLevel[] = ['light', 'balanced', 'strong']

export const DEFAULT_COMPRESSION: CompressionLevel = 'balanced'

interface LevelSettings {
  label: string
  hint: string
  /** Maior medida permitida para o lado menor do quadro (1080 = "1080p", em pé ou deitado); `null` mantém. */
  maxShortSide: number | null
  /** Multiplicador da taxa de referência (3 Mbit/s para 1080p em H.264). */
  factor: number
}

/** Níveis em vez de números: mais fácil de escolher sem conhecer taxa de bits. */
export const LEVEL_SETTINGS: Record<CompressionLevel, LevelSettings> = {
  light: { label: 'Leve', hint: 'Mantém a resolução e reduz um pouco: a diferença quase não aparece.', maxShortSide: null, factor: 1.1 },
  balanced: { label: 'Média', hint: 'Até 1080p e mais redução: bom equilíbrio para enviar.', maxShortSide: 1080, factor: 0.6 },
  strong: { label: 'Forte', hint: 'Até 720p: o menor arquivo, com perda de detalhes visível.', maxShortSide: 720, factor: 0.4 },
}

/** Cabeçalhos e índice do arquivo, sobre a soma de vídeo e som. */
const CONTAINER_OVERHEAD = 1.02
/** Abaixo disso (fração do tamanho original) a compressão vale a pena. */
const WORTH_RATIO = 0.9

/** Medidas do resultado: o lado menor limitado pelo nível, sem aumentar, proporção mantida e lados pares (H.264). */
export const compressedSize = (size: Dimensions, level: CompressionLevel): Dimensions => fitShortSide(size, LEVEL_SETTINGS[level].maxShortSide)

/** Taxa de bits do vídeo comprimido, em bits por segundo: cresce com a área do quadro, um pouco menos que linear. */
export const compressedVideoBitrate = (size: Dimensions, level: CompressionLevel, format: VideoFormat): number =>
  roundBitrate(videoBitrateFor(size, LEVEL_SETTINGS[level].factor, format))

export interface SizeEstimate {
  /** Em bytes. */
  bytes: number
  /** O resultado deve ficar bem menor que o original? Senão, a tela sugere um nível mais forte. */
  worthIt: boolean
}

/** Tamanho estimado do resultado: o vídeo na taxa nova e o som copiado como está. */
export function estimateCompressedBytes(
  { duration, originalBytes, audioBitrate }: { duration: number; originalBytes: number; audioBitrate: number | null },
  videoBitrate: number,
): SizeEstimate {
  const bytes = Math.round(((videoBitrate + (audioBitrate ?? 0)) * duration * CONTAINER_OVERHEAD) / 8)
  return { bytes, worthIt: bytes < originalBytes * WORTH_RATIO }
}

/** O resultado não ficou menor: entrega-se o original, intacto. */
export const keepsOriginal = (resultBytes: number, originalBytes: number) => resultBytes >= originalBytes

export const KEPT_ORIGINAL_VIDEO_NOTE = 'Já estava bem comprimido: mantido o original, com os metadados.'
