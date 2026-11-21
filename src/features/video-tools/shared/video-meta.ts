import { formatBytes, formatDimensions } from '../../../core/format'
import { VIDEO_FORMATS } from '../../../core/video/formats'
import { formatDuration } from '../../../core/video/time'
import type { VideoInfo } from '../../../workers/video-protocol'

/** Linha técnica do vídeo: "MP4 · 1920 × 1080 · 1:05 · 48,2 MB" (só o tamanho, enquanto ele abre). */
export function describeVideo(sizeBytes: number, info?: VideoInfo): string {
  if (!info) return formatBytes(sizeBytes)
  return [VIDEO_FORMATS[info.format].label, formatDimensions(info.width, info.height), formatDuration(info.duration), formatBytes(sizeBytes)].join(' · ')
}
