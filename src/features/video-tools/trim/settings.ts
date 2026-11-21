import type { VideoToolLabels } from '../shared/useVideoTool'

export const TRIM_LABELS: VideoToolLabels = { action: 'Cortar', progress: 'Cortando', done: 'cortado', noun: 'Corte' }

/** Sufixo do arquivo de saída ao manter um trecho: "praia.mp4" → "praia-trecho.mp4". */
export const TRIM_SUFFIX = '-trecho'

/** Sufixo ao remover partes: "praia.mp4" → "praia-editado.mp4". */
export const REMOVE_SUFFIX = '-editado'
