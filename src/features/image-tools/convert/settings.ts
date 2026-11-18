import type { ImageFormat } from '../../../core/image/formats'

export type BackgroundChoice = 'white' | 'black'

/** Cor real gravada no JPG onde a imagem era transparente (dado do arquivo, não token de tema). */
export const BACKGROUND_COLORS: Record<BackgroundChoice, string> = {
  white: '#ffffff',
  black: '#000000',
}

export interface ConvertSettings {
  target: ImageFormat
  /** De 10 a 100. */
  quality: number
  background: BackgroundChoice
}

/** O que a pessoa escolheu. Sem formato escolhido, a ferramenta sugere um pelos arquivos. */
export interface ConvertPreferences {
  target?: ImageFormat
  quality: number
  background: BackgroundChoice
}

export const DEFAULT_PREFERENCES: ConvertPreferences = { quality: 85, background: 'white' }

/** Maior lado da prévia (arquivo único) e da miniatura (lista), em pixels. */
export const PREVIEW_SIZE = 1024
export const THUMBNAIL_SIZE = 96

export const ZIP_NAME = 'imagens-convertidas.zip'

/** JPEG primeiro: o iPhone converte fotos HEIC da galeria para o primeiro tipo desta lista. */
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'
