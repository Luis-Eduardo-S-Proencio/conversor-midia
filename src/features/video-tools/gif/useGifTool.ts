import { useCallback, useMemo, useState } from 'react'
import type { Dimensions } from '../../../core/image/resize'
import {
  defaultGifFields,
  defaultGifSize,
  gifDimensions,
  gifFrameCount,
  gifOutputName,
  gifSizeChoices,
  validateGifRange,
  type GifFrameRate,
  type GifSize,
  type GifSizeChoice,
} from '../../../core/video/gif'
import { formatTime } from '../../../core/video/time'
import type { TrimError, TrimField, TrimFields, TrimFocusRequest, TrimRange } from '../../../core/video/trim'
import { useVideoTool } from '../shared/useVideoTool'
import { GIF_LABELS } from './settings'

export interface GifPlan {
  fields: TrimFields
  /** O trecho, quando os campos estão certos. */
  range?: TrimRange
  /** Erro dos campos, quando já deve aparecer. */
  error?: TrimError
  sizeChoices: GifSizeChoice[]
  /** `undefined` quando o vídeo é menor que todos os tamanhos: o GIF fica do tamanho dele. */
  size?: GifSize
  dimensions: Dimensions
  fps: GifFrameRate
  /** Quantos quadros o GIF terá; `null` enquanto o trecho estiver errado. */
  frames: number | null
}

/**
 * Criar GIF: um vídeo por vez. O trecho (no máximo 15 s) é digitado ou marcado no player, como no Cortar
 * trecho; tamanho e fluidez continuam valendo nos próximos vídeos (o tamanho, enquanto couber neles).
 */
export function useGifTool() {
  const tool = useVideoTool(GIF_LABELS)
  const { info, fileId } = tool.state
  const { invalidateResult, run } = tool
  const [edit, setEdit] = useState<{ fileId: number; fields: TrimFields }>()
  const [pickedSize, setPickedSize] = useState<GifSize>()
  const [fps, setFps] = useState<GifFrameRate>(10)
  // Tentativa de criar com problema e pedido de foco valem só para o vídeo atual.
  const [attemptedFile, setAttemptedFile] = useState<number>()
  const [focus, setFocus] = useState<{ fileId: number; request: TrimFocusRequest }>()

  const plan = useMemo<GifPlan | undefined>(() => {
    if (!info) return undefined
    const fields = edit?.fileId === fileId ? edit.fields : defaultGifFields(info.duration)
    const validation = validateGifRange(fields, info.duration)
    const sizeChoices = gifSizeChoices(info)
    const size = sizeChoices.some((choice) => choice.size === pickedSize && choice.available) ? pickedSize : defaultGifSize(sizeChoices)
    // Valor errado aparece já ao digitar; campo vazio, só depois de tentar.
    const showError = !validation.ok && (attemptedFile === fileId || !validation.error.missing)
    return {
      fields,
      range: validation.ok ? validation.range : undefined,
      error: showError && !validation.ok ? validation.error : undefined,
      sizeChoices,
      size,
      dimensions: gifDimensions(info, size),
      fps,
      frames: validation.ok ? gifFrameCount(validation.range.end - validation.range.start, fps) : null,
    }
  }, [info, fileId, edit, pickedSize, fps, attemptedFile])

  const changeField = useCallback(
    (field: TrimField, text: string) => {
      if (!plan) return
      setEdit({ fileId, fields: { ...plan.fields, [field]: text } })
      invalidateResult()
    },
    [plan, fileId, invalidateResult],
  )

  const mark = useCallback((field: TrimField, time: number) => changeField(field, formatTime(time)), [changeField])

  const changeSize = useCallback(
    (next: GifSize) => {
      setPickedSize(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const changeFps = useCallback(
    (next: GifFrameRate) => {
      setFps(next)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!plan || !info) return
    const validation = validateGifRange(plan.fields, info.duration)
    if (!validation.ok) {
      setAttemptedFile(fileId)
      setFocus({ fileId, request: { field: validation.error.fields[0] ?? 'start' } })
      return
    }
    const { start, end } = validation.range
    const { width, height } = plan.dimensions
    void run(
      (file) => ({ kind: 'gif', file, start, end, width, height, fps: plan.fps }),
      (output, original) => ({ blob: output.blob, name: gifOutputName(original.name) }),
    )
  }, [plan, info, fileId, run])

  const focusRequest = focus?.fileId === fileId ? focus.request : undefined
  return { tool, plan, focusRequest, changeField, mark, changeSize, changeFps, apply }
}
