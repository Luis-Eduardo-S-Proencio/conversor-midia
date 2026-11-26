import { formatBytes, formatDimensions } from '../../../core/format'
import { VIDEO_FORMATS } from '../../../core/video/formats'
import { formatDuration } from '../../../core/video/time'
import type { MetaItem } from '../../../components/ui/MetaChips'
import type { VideoInfo } from '../../../workers/video-protocol'

/** Dados do vídeo em itens separados, para as pílulas sob o vídeo (só o tamanho, enquanto ele abre). */
export function videoMetaItems(sizeBytes: number, info?: VideoInfo): MetaItem[] {
  const size = { label: 'Tamanho', value: formatBytes(sizeBytes) }
  if (!info) return [size]
  return [
    { label: 'Formato', value: VIDEO_FORMATS[info.format].label },
    { label: 'Medidas', value: formatDimensions(info.width, info.height) },
    { label: 'Duração', value: formatDuration(info.duration) },
    size,
  ]
}

