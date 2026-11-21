import { safeBaseName } from '../file-name'
import { VIDEO_FORMATS, type VideoFormat } from './formats'

/**
 * Nome do vídeo de saída: "praia.MOV" → "praia-trecho.mov". Sempre exibido como texto, nunca como HTML.
 * `suffix` é gerado pelo app e entra depois do limite de tamanho do nome.
 */
export function videoOutputName(inputName: string, format: VideoFormat, suffix: string): string {
  return `${safeBaseName(inputName, 'video')}${suffix}.${VIDEO_FORMATS[format].extension}`
}
