import type { BatchLabels } from '../shared/constants'

export const COMPRESS_LABELS: BatchLabels = { action: 'Comprimir', progress: 'Comprimindo', done: 'comprimida', noun: 'Compressão' }

export const COMPRESS_ZIP_NAME = 'imagens-comprimidas.zip'

export type CompressionLevel = 'light' | 'balanced' | 'strong'

/** Níveis em vez de um número: mais fácil de escolher sem conhecer qualidade de JPG. */
export const COMPRESSION_LEVELS: Record<CompressionLevel, { label: string; quality: number; hint: string }> = {
  light: { label: 'Leve', quality: 85, hint: 'Reduz menos, com diferença quase imperceptível.' },
  balanced: { label: 'Média', quality: 70, hint: 'Bom equilíbrio entre tamanho e qualidade.' },
  strong: { label: 'Forte', quality: 50, hint: 'Arquivo bem menor; a perda de detalhes aparece ao ampliar.' },
}

export const DEFAULT_LEVEL: CompressionLevel = 'balanced'
