import { useCallback, useMemo, useState } from 'react'
import type { Dimensions } from '../../../core/image/resize'
import { videoOutputName } from '../../../core/video/output-name'
import {
  defaultResolution,
  resizedSize,
  resizedVideoBitrate,
  resolutionChoices,
  resolutionSuffix,
  type Resolution,
  type ResolutionChoice,
} from '../../../core/video/resize'
import { useVideoTool } from '../shared/useVideoTool'
import { RESIZE_LABELS } from './settings'

export interface ResizePlan {
  resolution: Resolution
  size: Dimensions
  /** Taxa do vídeo, em bits por segundo. */
  bitrate: number
}

/**
 * Mudar resolução: um vídeo por vez. Só as resoluções menores que a do vídeo ficam disponíveis; a
 * escolhida continua valendo nos próximos vídeos enquanto for menor que a deles. O vídeo é refeito
 * pela mesma tarefa do Comprimir (medidas e taxa novas, som copiado), sem a promessa de tamanho.
 */
export function useResizeTool() {
  const tool = useVideoTool(RESIZE_LABELS)
  const { info, file } = tool.state
  const { invalidateResult, run } = tool
  const [picked, setPicked] = useState<Resolution>()

  const choices = useMemo<ResolutionChoice[]>(() => (info ? resolutionChoices(info) : []), [info])
  const resolution = choices.some((choice) => choice.resolution === picked && choice.available) ? picked : defaultResolution(choices)

  const plan = useMemo<ResizePlan | undefined>(() => {
    if (!info || !file || !resolution) return undefined
    const size = resizedSize(info, resolution)
    const bitrate = resizedVideoBitrate(
      { original: info, originalBytes: file.size, duration: info.duration, audioBitrate: info.audioBitrate, codec: info.codec },
      size,
      info.format,
    )
    return { resolution, size, bitrate }
  }, [info, file, resolution])

  const changeResolution = useCallback(
    (next: Resolution) => {
      setPicked(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!plan || !info?.canTranscodeVideo) return
    const { size, bitrate } = plan
    const { format } = info
    void run(
      (chosen) => ({ kind: 'compress', file: chosen, width: size.width, height: size.height, bitrate }),
      (output, original) => ({ blob: output.blob, name: videoOutputName(original.name, format, resolutionSuffix(plan.resolution)) }),
    )
  }, [plan, info, run])

  return { tool, choices, plan, changeResolution, apply }
}
