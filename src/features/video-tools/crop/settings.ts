import type { VideoToolLabels } from '../shared/useVideoTool'

export const VIDEO_CROP_LABELS: VideoToolLabels = { action: 'Recortar', progress: 'Recortando', done: 'recortado', noun: 'Recorte' }

/** Sufixo do arquivo de saída: "praia.mp4" → "praia-recortado.mp4". */
export const VIDEO_CROP_SUFFIX = '-recortado'
