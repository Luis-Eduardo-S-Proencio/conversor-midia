import type { VideoToolLabels } from '../shared/useVideoTool'

export const COMPRESS_LABELS: VideoToolLabels = {
  action: 'Comprimir',
  progress: 'Comprimindo',
  done: 'comprimido',
  cancelled: 'Compressão cancelada.',
}

/** Sufixo do arquivo de saída: "praia.mp4" → "praia-comprimido.mp4". */
export const COMPRESS_SUFFIX = '-comprimido'
