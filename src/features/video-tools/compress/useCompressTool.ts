import { useCallback, useMemo, useState } from 'react'
import type { Dimensions } from '../../../core/image/resize'
import {
  DEFAULT_COMPRESSION,
  KEPT_ORIGINAL_VIDEO_NOTE,
  compressedSize,
  compressedVideoBitrate,
  estimateCompressedBytes,
  keepsOriginal,
  type CompressionLevel,
  type SizeEstimate,
} from '../../../core/video/compress'
import { VIDEO_FORMATS } from '../../../core/video/formats'
import { videoOutputName } from '../../../core/video/output-name'
import { useVideoTool, type Delivery } from '../shared/useVideoTool'
import { COMPRESS_LABELS, COMPRESS_SUFFIX } from './settings'

export interface CompressionPlan {
  size: Dimensions
  /** Taxa do vídeo, em bits por segundo. */
  bitrate: number
  estimate: SizeEstimate
}

/** Comprimir vídeo: um vídeo por vez, em três níveis, com o tamanho estimado antes de começar. */
export function useCompressTool() {
  const tool = useVideoTool(COMPRESS_LABELS, { checkSizeControl: true })
  const { info, file } = tool.state
  const { invalidateResult, run } = tool
  const [level, setLevel] = useState<CompressionLevel>(DEFAULT_COMPRESSION)

  const plan = useMemo<CompressionPlan | undefined>(() => {
    if (!info || !file) return undefined
    const size = compressedSize(info, level)
    const bitrate = compressedVideoBitrate(size, level, info.format)
    const estimate = estimateCompressedBytes({ duration: info.duration, originalBytes: file.size, audioBitrate: info.audioBitrate }, bitrate)
    return { size, bitrate, estimate }
  }, [info, file, level])

  const changeLevel = useCallback(
    (next: CompressionLevel) => {
      setLevel(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!plan || !info?.canTranscodeVideo || !info.controlsSize) return
    const { size, bitrate } = plan
    const { format } = info
    /** Nunca entrega algo maior: se a versão comprimida não ganhar espaço, o original volta intacto, com o motivo. */
    const deliver = (output: { blob: Blob }, original: File): Delivery =>
      keepsOriginal(output.blob.size, original.size)
        ? {
            blob: new Blob([original], { type: VIDEO_FORMATS[format].mimeType }),
            name: videoOutputName(original.name, format, ''),
            note: KEPT_ORIGINAL_VIDEO_NOTE,
          }
        : { blob: output.blob, name: videoOutputName(original.name, format, COMPRESS_SUFFIX) }
    void run((chosen) => ({ kind: 'compress', file: chosen, width: size.width, height: size.height, bitrate }), deliver)
  }, [plan, info, run])

  return { tool, level, plan, changeLevel, apply }
}
