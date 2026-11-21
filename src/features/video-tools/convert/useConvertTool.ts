import { useCallback, useMemo, useState } from 'react'
import {
  VIDEO_MODES,
  convertOutputName,
  convertPlan,
  convertedAudioBitrate,
  convertedVideoBitrate,
  defaultTarget,
  defaultVideoMode,
  hasVideoModes,
  targetChoices,
  type ConvertPlan,
  type TargetChoice,
  type VideoMode,
} from '../../../core/video/convert'
import type { VideoFormat } from '../../../core/video/formats'
import { useVideoTool } from '../shared/useVideoTool'
import { CONVERT_LABELS } from './settings'

export interface ModeChoice {
  mode: VideoMode
  /** Este navegador consegue converter assim. */
  available: boolean
}

/**
 * Converter vídeo: um vídeo por vez. Os formatos oferecidos são os dois diferentes do original; o que o
 * formato novo comporta é copiado, o resto é refeito. Vídeo HEVC indo para MP4 ou MOV tem a escolha entre
 * "compatível" (refaz em H.264) e "rápido" (copia o HEVC). Formato e modo escolhidos continuam valendo nos
 * próximos vídeos enquanto existirem para eles.
 */
export function useConvertTool() {
  const tool = useVideoTool(CONVERT_LABELS)
  const { info, file } = tool.state
  const { invalidateResult, run } = tool
  const [pickedTarget, setPickedTarget] = useState<VideoFormat>()
  const [pickedMode, setPickedMode] = useState<VideoMode>()

  const choices = useMemo<TargetChoice[]>(() => (info ? targetChoices(info) : []), [info])
  const target = choices.some((choice) => choice.target === pickedTarget && choice.available) ? pickedTarget : defaultTarget(choices)

  const modeChoices = useMemo<ModeChoice[]>(() => {
    if (!info || !target || !hasVideoModes(info, target)) return []
    return VIDEO_MODES.map((mode) => ({ mode, available: convertPlan(info, target, mode).blocked === null }))
  }, [info, target])
  const keepPicked = pickedMode !== undefined && modeChoices.some((choice) => choice.mode === pickedMode && choice.available)
  const mode: VideoMode = keepPicked ? pickedMode : info && target ? defaultVideoMode(info, target) : 'compatible'

  const plan = useMemo<ConvertPlan | undefined>(() => (info && target ? convertPlan(info, target, mode) : undefined), [info, target, mode])

  /** Planos dos formatos desligados, para explicar o motivo de cada um. */
  const unavailablePlans = useMemo<ConvertPlan[]>(
    () =>
      info
        ? choices.filter((choice) => !choice.available).map((choice) => convertPlan(info, choice.target, defaultVideoMode(info, choice.target)))
        : [],
    [info, choices],
  )

  const bitrate = useMemo(() => {
    if (!info || !file || !target) return undefined
    const source = { original: info, originalBytes: file.size, duration: info.duration, audioBitrate: info.audioBitrate, codec: info.codec }
    return convertedVideoBitrate(source, target)
  }, [info, file, target])
  const audioBitrate = convertedAudioBitrate(info?.audioBitrate ?? null)

  const changeTarget = useCallback(
    (next: VideoFormat) => {
      setPickedTarget(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const changeMode = useCallback(
    (next: VideoMode) => {
      setPickedMode(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!plan || plan.blocked !== null || bitrate === undefined) return
    const format = plan.target
    void run(
      (chosen) => ({ kind: 'convert', file: chosen, format, mode, bitrate, audioBitrate }),
      (output, original) => ({ blob: output.blob, name: convertOutputName(original.name, format) }),
    )
  }, [plan, mode, bitrate, audioBitrate, run])

  return { tool, choices, plan, unavailablePlans, modeChoices, mode, audioBitrate, changeTarget, changeMode, apply }
}
