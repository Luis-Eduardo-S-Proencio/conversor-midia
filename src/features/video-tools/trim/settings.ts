import type { VideoToolLabels } from '../shared/useVideoTool'

export const TRIM_LABELS: VideoToolLabels = { action: 'Cortar', progress: 'Cortando', done: 'cortado', noun: 'Corte' }

/** Sufixo do arquivo de saída: "praia.mp4" → "praia-trecho.mp4". */
export const TRIM_SUFFIX = '-trecho'
