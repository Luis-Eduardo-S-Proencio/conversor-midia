/** Formatos de vídeo aceitos. O resultado sai no mesmo formato do original. */
export type VideoFormat = 'mp4' | 'mov' | 'webm'

export interface VideoFormatInfo {
  label: string
  mimeType: string
  extension: string
}

export const VIDEO_FORMATS: Record<VideoFormat, VideoFormatInfo> = {
  mp4: { label: 'MP4', mimeType: 'video/mp4', extension: 'mp4' },
  mov: { label: 'MOV', mimeType: 'video/quicktime', extension: 'mov' },
  webm: { label: 'WEBM', mimeType: 'video/webm', extension: 'webm' },
}

/** Filtro do seletor do sistema. Não substitui a validação pelo conteúdo. */
export const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm'

/** Lista para as mensagens: "MP4, MOV ou WEBM". */
export const ACCEPTED_VIDEO_LABELS = 'MP4, MOV ou WEBM'

const CODEC_LABELS: Partial<Record<string, string>> = {
  avc: 'H.264',
  hevc: 'HEVC',
  vp8: 'VP8',
  vp9: 'VP9',
  av1: 'AV1',
  prores: 'ProRes',
}

/** Nome conhecido do codec de vídeo ("hevc" → "HEVC"), para as mensagens. */
export const codecLabel = (codec: string) => CODEC_LABELS[codec] ?? codec.toUpperCase()
