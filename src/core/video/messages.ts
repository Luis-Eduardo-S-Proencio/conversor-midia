import { formatBytes } from '../format'
import { ACCEPTED_VIDEO_LABELS } from './formats'
import type { NonVideoCategory } from './signature'

/** Por que um vídeo foi recusado antes de abri-lo. */
export type VideoRejectionReason =
  | { code: 'empty' }
  | { code: 'too-large'; maxBytes: number }
  | { code: 'unsupported-format'; formatName?: string; category?: NonVideoCategory }

/** Falhas ao abrir ou processar o vídeo, devolvidas pelo Worker. */
export const VIDEO_ERROR_CODES = [
  'read-failed',
  'no-video',
  'no-audio',
  'codec-unsupported',
  'decode-unsupported',
  'encode-unsupported',
  'memory',
  'worker-failed',
  'unexpected',
] as const

export type VideoErrorCode = (typeof VIDEO_ERROR_CODES)[number]

const CHOOSE_VIDEO = `Escolha um vídeo ${ACCEPTED_VIDEO_LABELS}.`

export function videoRejectionMessage(reason: VideoRejectionReason): string {
  switch (reason.code) {
    case 'empty':
      return 'O arquivo está vazio.'
    case 'too-large':
      return `O vídeo tem mais de ${formatBytes(reason.maxBytes)}, o limite por arquivo.`
    case 'unsupported-format':
      if (reason.category === 'image') return `Este arquivo é uma imagem (${reason.formatName}). ${CHOOSE_VIDEO}`
      if (reason.category === 'audio') return `Este arquivo é só áudio (${reason.formatName}). ${CHOOSE_VIDEO}`
      return reason.formatName ? `${reason.formatName} não é aceito. Use ${ACCEPTED_VIDEO_LABELS}.` : `Formato não suportado. Use ${ACCEPTED_VIDEO_LABELS}.`
  }
}

const ERROR_MESSAGES: Record<VideoErrorCode, string> = {
  'read-failed': 'Não foi possível ler o vídeo. O arquivo pode estar corrompido ou incompleto.',
  'no-video': `Não há vídeo neste arquivo. ${CHOOSE_VIDEO}`,
  'no-audio': 'Este vídeo não tem som para extrair. Escolha um vídeo com som.',
  'codec-unsupported': 'Este vídeo usa um formato de compressão que a ferramenta não lê.',
  'decode-unsupported': 'Este navegador não consegue decodificar este vídeo. Tente em outro navegador, como o Chrome, o Edge ou o Safari.',
  'encode-unsupported': 'Este navegador não consegue gerar o vídeo. Tente em outro navegador, como o Chrome, o Edge ou o Firefox.',
  memory: 'Este aparelho não tem memória suficiente para este vídeo. Tente em um computador ou com um vídeo menor.',
  'worker-failed': 'O processamento foi interrompido inesperadamente. Tente de novo.',
  unexpected: 'Algo deu errado ao processar o vídeo. Tente de novo.',
}

export function videoErrorMessage(code: VideoErrorCode): string {
  return ERROR_MESSAGES[code]
}
