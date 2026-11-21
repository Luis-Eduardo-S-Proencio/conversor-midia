/**
 * Medidas e taxa de bits de um vídeo refeito, comuns ao Comprimir e ao Mudar resolução.
 * Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import type { VideoFormat } from './formats'

const REFERENCE_PIXELS = 1920 * 1080
const REFERENCE_BITRATE = 3_000_000
/** Taxa do vídeo refeito em cada formato, em relação ao H.264: o VP9 (WEBM) precisa de cerca de 60% para a mesma qualidade. */
export const FORMAT_EFFICIENCY: Record<VideoFormat, number> = { mp4: 1, mov: 1, webm: 0.6 }
export const MIN_VIDEO_BITRATE = 100_000

const even = (value: number) => Math.max(2, 2 * Math.round(value / 2))

/**
 * Lado menor limitado a `maxShortSide` (1080 = "1080p", em pé ou deitado), sem aumentar, com a proporção
 * mantida e lados pares (H.264). `null` mantém a resolução (só acerta os lados ímpares).
 */
export function fitShortSide(size: Dimensions, maxShortSide: number | null): Dimensions {
  const shortSide = Math.min(size.width, size.height)
  const scale = maxShortSide === null ? 1 : Math.min(1, maxShortSide / shortSide)
  return { width: even(size.width * scale), height: even(size.height * scale) }
}

/**
 * Taxa de bits do vídeo, em bits por segundo: cresce com a área do quadro, um pouco menos que linear.
 * `factor` multiplica a referência (3 Mbit/s para 1080p em H.264): 1 é boa qualidade; 2, alta.
 */
export function videoBitrateFor(size: Dimensions, factor: number, format: VideoFormat): number {
  const scale = ((size.width * size.height) / REFERENCE_PIXELS) ** 0.95
  return REFERENCE_BITRATE * scale * factor * FORMAT_EFFICIENCY[format]
}

/** Arredonda a taxa (kbit/s inteiros), respeitando o mínimo. */
export const roundBitrate = (bitrate: number) => Math.max(MIN_VIDEO_BITRATE, Math.round(bitrate / 1000) * 1000)

/** Qualidade alta, como a do vídeo refeito ao recortar (o dobro da referência do Comprimir). */
export const HIGH_QUALITY_FACTOR = 2

export interface OriginalVideo {
  original: Dimensions
  originalBytes: number
  /** Em segundos. */
  duration: number
  /** Taxa do som do original; `null` sem som. */
  audioBitrate: number | null
}

/** Taxa média só do vídeo no original: o arquivo inteiro menos o som. */
export const originalVideoBitrate = ({ originalBytes, duration, audioBitrate }: OriginalVideo) =>
  Math.max(0, (originalBytes * 8) / duration - (audioBitrate ?? 0))
