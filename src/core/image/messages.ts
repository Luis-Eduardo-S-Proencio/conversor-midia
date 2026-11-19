import { formatBytes } from '../format'
import { IMAGE_FORMATS, type ImageFormat } from './formats'

/** Por que um arquivo foi recusado antes de qualquer processamento. */
export type RejectionReason =
  | { code: 'empty' }
  | { code: 'too-large'; maxBytes: number }
  | { code: 'unsupported-format'; formatName?: string }
  | { code: 'corrupt' }
  | { code: 'too-many-pixels'; megapixels: number; maxMegapixels: number }

/** Falhas durante a decodificação ou a codificação, devolvidas pelo Worker. */
export const PROCESSING_ERROR_CODES = [
  'decode-failed',
  'canvas-unavailable',
  'encode-unsupported',
  'encode-failed',
  'worker-failed',
  'unexpected',
] as const

export type ProcessingErrorCode = (typeof PROCESSING_ERROR_CODES)[number]

const ACCEPTED_FORMATS = 'Use JPG, PNG ou WEBP.'
const megapixelFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function rejectionMessage(reason: RejectionReason): string {
  switch (reason.code) {
    case 'empty':
      return 'O arquivo está vazio.'
    case 'too-large':
      return `O arquivo tem mais de ${formatBytes(reason.maxBytes)}, o limite por arquivo.`
    case 'unsupported-format':
      // No iPhone, a galeria entrega HEIC já convertido em JPG quando o seletor pede JPG.
      if (reason.formatName === 'HEIC') {
        return 'Fotos HEIC não são aceitas. No iPhone, escolha a foto pela galeria: ela chega como JPG.'
      }
      return reason.formatName
        ? `${reason.formatName} não é aceito. ${ACCEPTED_FORMATS}`
        : `Formato não suportado. ${ACCEPTED_FORMATS}`
    case 'corrupt':
      return 'Não foi possível ler a imagem. O arquivo pode estar corrompido.'
    case 'too-many-pixels':
      return `A imagem tem ${megapixelFormat.format(reason.megapixels)} megapixels; o limite é ${megapixelFormat.format(reason.maxMegapixels)}.`
  }
}

/** Aviso para arquivos que excederam o limite do lote. */
export function batchLimitMessage(skipped: number, maxFiles: number): string {
  const subject = skipped === 1 ? '1 arquivo ficou' : `${skipped} arquivos ficaram`
  const reason = maxFiles === 1 ? 'esta ferramenta trabalha com uma imagem por vez' : `o limite é de ${maxFiles} arquivos por vez`
  return `${subject} de fora: ${reason}.`
}

const PROCESSING_MESSAGES: Record<ProcessingErrorCode, string> = {
  'decode-failed': 'Não foi possível ler a imagem. O arquivo pode estar corrompido.',
  'canvas-unavailable':
    'Este aparelho não tem memória suficiente para esta imagem. Tente em um computador ou com uma imagem menor.',
  'encode-unsupported': 'Este navegador não consegue gerar esse formato. Escolha outro formato.',
  'encode-failed': 'Não foi possível converter este arquivo. Tente de novo.',
  'worker-failed': 'A conversão foi interrompida inesperadamente. Tente de novo.',
  unexpected: 'Algo deu errado ao converter este arquivo. Tente de novo.',
}

export function processingErrorMessage(code: ProcessingErrorCode): string {
  return PROCESSING_MESSAGES[code]
}

/** Observação quando um WEBP sai em outro formato porque o navegador (Safari) não gera WEBP. */
export function webpFallbackNote(format: ImageFormat): string {
  return `Este navegador não gera WEBP: a imagem saiu em ${IMAGE_FORMATS[format].label}.`
}
