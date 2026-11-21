/**
 * Mudar resolução: resoluções oferecidas, medidas finais e taxa de bits. Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import type { VideoFormat } from './formats'
import { HIGH_QUALITY_FACTOR, fitShortSide, originalVideoBitrate, roundBitrate, videoBitrateFor, type OriginalVideo } from './sizing'

/** Resolução pelo lado menor do quadro ("720p" = 720 px no lado menor, em pé ou deitado). */
export type Resolution = 1080 | 720 | 480 | 360

export const RESOLUTIONS: readonly Resolution[] = [1080, 720, 480, 360]

export const resolutionLabel = (resolution: Resolution) => `${resolution}p`

export interface ResolutionChoice {
  resolution: Resolution
  /** Menor que a do vídeo. Aumentar não traz detalhes que o vídeo não tem: só deixaria o arquivo maior. */
  available: boolean
}

export function resolutionChoices(size: Dimensions): ResolutionChoice[] {
  const shortSide = Math.min(size.width, size.height)
  return RESOLUTIONS.map((resolution) => ({ resolution, available: resolution < shortSide }))
}

/** Resolução já escolhida ao abrir: a maior disponível. */
export const defaultResolution = (choices: readonly ResolutionChoice[]): Resolution | undefined =>
  choices.find((choice) => choice.available)?.resolution

/** Medidas finais: o lado menor vira a resolução, com a proporção mantida e lados pares (H.264). */
export const resizedSize = (size: Dimensions, resolution: Resolution): Dimensions => fitShortSide(size, resolution)

/**
 * Taxa do vídeo na resolução nova: qualidade alta, mas nunca acima da taxa do original proporcional à
 * área. Sem esse limite, um vídeo já bem comprimido (ex.: do WhatsApp) sairia maior que o original.
 */
export function resizedVideoBitrate(source: OriginalVideo, target: Dimensions, format: VideoFormat): number {
  const high = videoBitrateFor(target, HIGH_QUALITY_FACTOR, format)
  const { original } = source
  const areaRatio = (target.width * target.height) / (original.width * original.height)
  return roundBitrate(Math.min(high, originalVideoBitrate(source) * areaRatio))
}

/** Sufixo do arquivo de saída: "praia.mp4" → "praia-720p.mp4". */
export const resolutionSuffix = (resolution: Resolution) => `-${resolution}p`
