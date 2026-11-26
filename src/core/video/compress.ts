/**
 * Comprimir vídeo: níveis, resolução final, taxa de bits do vídeo e tamanho estimado.
 * Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import type { VideoFormat } from './formats'
import { FORMAT_EFFICIENCY, cappedVideoBitrate, fitShortSide, roundBitrate, videoBitrateFor } from './sizing'

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

/** Destino com limite de tamanho (WhatsApp, e-mail, Discord): o arquivo precisa caber em `maxBytes`. */
export interface SizeTarget {
  maxBytes: number
  /** Maior lado menor aceito pelo destino (720 = "720p"); `null` sem limite de resolução. */
  maxShortSide: number | null
}

/** Folga sobre o limite (5%): a taxa real do codificador varia um pouco em torno da pedida. */
export const TARGET_MARGIN = 0.95

/**
 * Resoluções tentadas, pelo lado menor, e a menor taxa de vídeo (H.264) que ainda dá imagem boa em
 * cada uma. Abaixo dela, sai uma resolução menor com mais taxa por ponto: fica mais nítido que uma
 * resolução grande com poucos bits.
 */
const TARGET_STEPS: ReadonlyArray<readonly [shortSide: number, minBitrate: number]> = [
  [1080, 2_000_000],
  [720, 1_000_000],
  [480, 500_000],
  [360, 250_000],
]

/** Abaixo disso (vídeo, bit/s em H.264), nem em 360p o resultado fica assistível: o limite não é alcançável. */
const MIN_TARGET_BITRATE = 120_000

export interface TargetPlan {
  size: Dimensions
  /** Taxa do vídeo, em bits por segundo. */
  bitrate: number
  /** Cabe no limite com imagem assistível? Falso quando o vídeo é longo demais para o limite. */
  fits: boolean
}

export interface TargetSource {
  size: Dimensions
  /** Em segundos. */
  duration: number
  originalBytes: number
  /** Taxa do som, copiado como está; `null` sem som. */
  audioBitrate: number | null
  codec?: string
}

/**
 * "Comprimir até X MB": taxa do vídeo = (tamanho-alvo × 8 ÷ duração) − taxa do som, com 5% de folga e a
 * folga do arquivo. A resolução é a maior (até o limite do destino e sem aumentar) cuja taxa mínima cabe
 * nessa conta. A taxa nunca passa da do original (senão o arquivo cresceria sem ganhar qualidade).
 */
export function planForTarget(source: TargetSource, target: SizeTarget, format: VideoFormat): TargetPlan {
  const efficiency = FORMAT_EFFICIENCY[format]
  const total = (target.maxBytes * 8 * TARGET_MARGIN) / (source.duration * CONTAINER_OVERHEAD)
  const budget = total - (source.audioBitrate ?? 0)

  const shortSide = Math.min(source.size.width, source.size.height)
  const cap = target.maxShortSide === null ? shortSide : Math.min(shortSide, target.maxShortSide)
  const steps = TARGET_STEPS.filter(([side]) => side <= cap)
  const chosen = steps.find(([, minimum]) => budget >= minimum * efficiency) ?? steps.at(-1)
  const size = fitShortSide(source.size, chosen ? chosen[0] : cap)

  const ceiling = cappedVideoBitrate(
    { original: source.size, originalBytes: source.originalBytes, duration: source.duration, audioBitrate: source.audioBitrate, codec: source.codec },
    size,
    format,
  )
  const bitrate = roundBitrate(Math.min(Math.max(budget, 0), ceiling))
  return { size, bitrate, fits: budget >= MIN_TARGET_BITRATE * efficiency }
}

