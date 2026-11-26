import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  aspectRatio,
  editField,
  parseAspect,
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
import { processingErrorMessage } from '../../../core/image/messages'
import type { Dimensions } from '../../../core/image/resize'
import { BatchItemError } from '../shared/batch-process'
import { useImageBatch } from '../shared/useImageBatch'
import { cropFile } from './crop-file'
import { CROP_LABELS } from './settings'

/** Edição em andamento de uma imagem: a área válida e, enquanto a pessoa digita, o texto dos campos. */
interface Edit {
  itemId: string
  crop: CropRect
  fields?: CropFields
}

export interface CropEditor {
  image: Dimensions
  crop: CropRect
  fields: CropFields
  validation: CropValidation
}

const startingCrop = (image: Dimensions, ratio: number | undefined) => (ratio ? centeredAspectCrop(image, ratio) : fullCrop(image))

/** Valor errado aparece já ao digitar; campo vazio e "nada recortado", só depois de tentar. */
function visibleError({ validation, image }: CropEditor, attempted: boolean): CropError | undefined {
  if (!validation.ok) return attempted || !validation.error.missing ? validation.error : undefined
  if (attempted && isFullCrop(validation.crop, image)) return { message: nothingCroppedMessage('image'), fields: ['width'], missing: true }
  return undefined
}

/** Recortar imagem: uma imagem por vez, com a área em pixels da imagem como ela aparece. */
export function useCropTool() {
  const batch = useImageBatch(CROP_LABELS, { singleImage: true })
  const { items, webpSupported, invalidateResults, run } = batch
  // Um atalho pode pedir a proporção (ex.: "Story 9:16" abre com ?proporcao=9:16).
  const [searchParams] = useSearchParams()
  const [aspect, setAspect] = useState<AspectChoice>(() => parseAspect(searchParams.get('proporcao')) ?? 'free')
  const [edit, setEdit] = useState<Edit>()
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState<FocusRequest>()

  const [item] = items
  // A área só começa com as medidas da prévia: as da imagem decodificada e orientada, como o Worker a verá.
  const image = item && item.status !== 'inspecting' && item.status !== 'rejected' ? item.image : undefined
  const ratio = image ? aspectRatio(aspect) : undefined

  const editor = useMemo<CropEditor | undefined>(() => {
    if (!item || !image) return undefined
    // Imagem nova (ou trocada): a área recomeça, na proporção escolhida.
    const current = edit?.itemId === item.id ? edit : { crop: startingCrop(image, ratio), fields: undefined }
    const fields = current.fields ?? fieldsOf(current.crop)
    return { image, crop: current.crop, fields, validation: validateCropFields(fields, image) }
  }, [item, image, edit, ratio])

  const itemId = item?.id
  const update = useCallback(
    (crop: CropRect, fields?: CropFields) => {
      if (!itemId) return
      setEdit({ itemId, crop, fields })
      setAttempted(false)
      setFocusRequest(undefined)
      invalidateResults()
    },
    [itemId, invalidateResults],
  )

  /** Arrastar ou usar as setas sobre a imagem: a área já vem dentro dela, e os campos a acompanham. */
  const changeCrop = useCallback((crop: CropRect) => update(crop), [update])

  const changeField = useCallback(
    (field: CropField, text: string) => {
      if (!editor) return
      const fields = editField(editor.fields, field, text, ratio)
      const result = validateCropFields(fields, editor.image)
      update(result.ok ? result.crop : editor.crop, fields)
    },
    [editor, ratio, update],
  )

  const changeAspect = useCallback(
    (choice: AspectChoice) => {
      setAspect(choice)
      if (!editor) return
      const next = aspectRatio(choice)
      update(next ? centeredAspectCrop(editor.image, next) : editor.crop)
    },
    [editor, update],
  )

  const resetCrop = useCallback(() => {
    setAspect('free')
    if (editor) update(fullCrop(editor.image))
  }, [editor, update])

  const apply = useCallback(() => {
    if (!editor) return
    const { validation, image: measured } = editor
    if (!validation.ok || isFullCrop(validation.crop, measured)) {
      setAttempted(true)
      setFocusRequest({ field: validation.ok ? 'width' : (validation.error.fields[0] ?? 'width') })
      return
    }
    const { crop } = validation
    const canEncodeWebp = webpSupported !== false
    void run(async (file, batchItem, { client, signal }) => {
      // Itens prontos sempre têm as medidas da prévia; a guarda só protege contra estado inesperado.
      if (!batchItem.image) throw new BatchItemError(processingErrorMessage('unexpected'))
      return cropFile({ file, image: batchItem.image, crop, canEncodeWebp, client, signal })
    })
  }, [editor, webpSupported, run])

  const error = editor ? visibleError(editor, attempted) : undefined

  return { batch, aspect, ratio, editor, error, focusRequest, changeCrop, changeField, changeAspect, resetCrop, apply }
}
