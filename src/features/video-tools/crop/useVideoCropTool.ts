import { useCallback, useMemo, useState } from 'react'
import {
  aspectRatio,
  editField,
  fieldsOf,
  nothingCroppedMessage,
  validateCropFields,
  type AspectChoice,
  type CropError,
  type CropField,
  type CropFields,
  type CropValidation,
  type FocusRequest,
} from '../../../core/crop-fields'
import { centeredAspectCrop, fullCrop, isFullCrop, type CropRect } from '../../../core/image/crop'
import type { Dimensions } from '../../../core/image/resize'
import { MIN_VIDEO_CROP_SIDE, encodableCrop } from '../../../core/video/crop'
import { videoOutputName } from '../../../core/video/output-name'
import { useVideoTool } from '../shared/useVideoTool'
import { VIDEO_CROP_LABELS, VIDEO_CROP_SUFFIX } from './settings'

/** Edição em andamento de um vídeo: a área válida e, enquanto a pessoa digita, o texto dos campos. */
interface Edit {
  fileId: number
  crop: CropRect
  fields?: CropFields
}

export interface VideoCropEditor {
  size: Dimensions
  crop: CropRect
  fields: CropFields
  validation: CropValidation
}

/** Tentativa de recortar com problema: o aviso aparece e o foco vai ao campo. Vale só para o vídeo atual. */
interface Attempt {
  fileId: number
  focus: FocusRequest
}

const startingCrop = (size: Dimensions, ratio: number | undefined) => (ratio ? centeredAspectCrop(size, ratio) : fullCrop(size))

/** Valor errado aparece já ao digitar; campo vazio e "nada recortado", só depois de tentar. */
function visibleError({ validation, size }: VideoCropEditor, attempted: boolean): CropError | undefined {
  if (!validation.ok) return attempted || !validation.error.missing ? validation.error : undefined
  if (attempted && isFullCrop(validation.crop, size)) return { message: nothingCroppedMessage('video'), fields: ['width'], missing: true }
  return undefined
}

/** Recortar vídeo: um vídeo por vez, com a área em pixels do quadro como ele aparece. */
export function useVideoCropTool() {
  const tool = useVideoTool(VIDEO_CROP_LABELS)
  const { info, fileId, file } = tool.state
  const { invalidateResult, run } = tool
  const [aspect, setAspect] = useState<AspectChoice>('free')
  const [edit, setEdit] = useState<Edit>()
  const [attempt, setAttempt] = useState<Attempt>()

  const width = info?.width
  const height = info?.height
  const size = useMemo(() => (width && height ? { width, height } : undefined), [width, height])
  const ratio = size ? aspectRatio(aspect, size) : undefined

  const editor = useMemo<VideoCropEditor | undefined>(() => {
    if (!size) return undefined
    // Vídeo novo (ou trocado): a área recomeça, na proporção escolhida.
    const current = edit?.fileId === fileId ? edit : { crop: startingCrop(size, ratio), fields: undefined }
    const fields = current.fields ?? fieldsOf(current.crop)
    return { size, crop: current.crop, fields, validation: validateCropFields(fields, size, 'video', MIN_VIDEO_CROP_SIDE) }
  }, [size, fileId, edit, ratio])

  const update = useCallback(
    (crop: CropRect, fields?: CropFields) => {
      setEdit({ fileId, crop, fields })
      setAttempt(undefined)
      invalidateResult()
    },
    [fileId, invalidateResult],
  )

  /** Arrastar ou usar as setas sobre o vídeo: a área já vem dentro dele, e os campos a acompanham. */
  const changeCrop = useCallback((crop: CropRect) => update(crop), [update])

  const changeField = useCallback(
    (field: CropField, text: string) => {
      if (!editor) return
      const fields = editField(editor.fields, field, text, ratio)
      const result = validateCropFields(fields, editor.size, 'video', MIN_VIDEO_CROP_SIDE)
      update(result.ok ? result.crop : editor.crop, fields)
    },
    [editor, ratio, update],
  )

  const changeAspect = useCallback(
    (choice: AspectChoice) => {
      setAspect(choice)
      if (!editor) return
      const next = aspectRatio(choice, editor.size)
      update(next ? centeredAspectCrop(editor.size, next) : editor.crop)
    },
    [editor, update],
  )

  const resetCrop = useCallback(() => {
    setAspect('free')
    if (editor) update(fullCrop(editor.size))
  }, [editor, update])

  const apply = useCallback(() => {
    if (!editor || !info || !file) return
    const { validation } = editor
    if (!validation.ok || isFullCrop(validation.crop, editor.size)) {
      setAttempt({ fileId, focus: { field: validation.ok ? 'width' : (validation.error.fields[0] ?? 'width') } })
      return
    }
    const area = encodableCrop(validation.crop)
    void run((chosen) => ({ kind: 'crop', file: chosen, crop: area }), videoOutputName(file.name, info.format, VIDEO_CROP_SUFFIX))
  }, [editor, info, file, fileId, run])

  const current = attempt?.fileId === fileId ? attempt : undefined
  const error = editor ? visibleError(editor, current !== undefined) : undefined
  return { tool, aspect, ratio, editor, error, focusRequest: current?.focus, changeCrop, changeField, changeAspect, resetCrop, apply }
}
