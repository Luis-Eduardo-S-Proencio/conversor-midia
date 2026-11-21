/**
 * Medidas e taxa de bits de um vídeo refeito, comuns ao Comprimir e ao Mudar resolução.
 * Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import type { VideoFormat } from './formats'

const REFERENCE_PIXELS = 1920 * 1080
const REFERENCE_BITRATE = 3_000_000
/** VP9 (WEBM) precisa de cerca de 60% da taxa do H.264 para a mesma qualidade. */
const CODEC_EFFICIENCY: Record<VideoFormat, number> = { mp4: 1, mov: 1, webm: 0.6 }
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
  return REFERENCE_BITRATE * scale * factor * CODEC_EFFICIENCY[format]
}

/** Arredonda a taxa (kbit/s inteiros), respeitando o mínimo. */
export const roundBitrate = (bitrate: number) => Math.max(MIN_VIDEO_BITRATE, Math.round(bitrate / 1000) * 1000)
