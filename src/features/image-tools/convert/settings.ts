import type { OutputFormat } from '../../../core/image/formats'
import type { BatchLabels } from '../shared/constants'

export const CONVERT_LABELS: BatchLabels = { action: 'Converter', progress: 'Convertendo', done: 'convertida', noun: 'Conversão' }

export const CONVERT_ZIP_NAME = 'imagens-convertidas.zip'

export type BackgroundChoice = 'white' | 'black'

/** Cor real gravada no arquivo onde a imagem era transparente (dado do arquivo, não token de tema). */
export const BACKGROUND_COLORS: Record<BackgroundChoice, string> = {
  white: '#ffffff',
  black: '#000000',
}

export interface ConvertSettings {
  target: OutputFormat
  /** De 10 a 100. */
  quality: number
  background: BackgroundChoice
}

/** O que a pessoa escolheu. Sem formato escolhido, a ferramenta sugere um pelos arquivos. */
export interface ConvertPreferences {
  target?: OutputFormat
  quality: number
  background: BackgroundChoice
}

export const DEFAULT_PREFERENCES: ConvertPreferences = { quality: 85, background: 'white' }
