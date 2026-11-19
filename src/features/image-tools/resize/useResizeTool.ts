import { useCallback, useMemo, useState } from 'react'
import { processingErrorMessage } from '../../../core/image/messages'
import { resizedDimensions } from '../../../core/image/resize'
import { BatchItemError } from '../shared/batch-process'
import { useImageBatch } from '../shared/useImageBatch'
import { resizeFile } from './resize-file'
import { DEFAULT_SETTINGS, RESIZE_LABELS, validateResize, type FocusRequest, type ResizeSettings } from './settings'

/** Redimensionar imagem: as mesmas opções para todo o lote; com a proporção mantida, nada é ampliado. */
export function useResizeTool() {
  const batch = useImageBatch(RESIZE_LABELS)
  const { items, webpSupported, invalidateResults, run } = batch
  const [settings, setSettings] = useState<ResizeSettings>(DEFAULT_SETTINGS)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState<FocusRequest>()

  const validation = useMemo(() => validateResize(settings), [settings])

  const updateSettings = useCallback(
    (changes: Partial<ResizeSettings>) => {
      setSettings((current) => ({ ...current, ...changes }))
      setFocusRequest(undefined) // o pedido já foi atendido; não volta a puxar o foco ao trocar de modo
      invalidateResults()
    },
    [invalidateResults],
  )

  const resize = useCallback(() => {
    if (!validation.ok) {
      // A partir daqui, campo vazio também aparece como erro; o foco vai até o primeiro a corrigir.
      setAttempted(true)
      const [field] = validation.error.fields
      if (field) setFocusRequest({ field })
      return
    }
    const { request } = validation
    const canEncodeWebp = webpSupported !== false
    void run(async (file, item, { client, signal }) => {
      // Itens prontos sempre têm as medidas da prévia; a guarda só protege contra estado inesperado.
      if (!item.image) throw new BatchItemError(processingErrorMessage('unexpected'))
      return resizeFile({ file, image: item.image, request, canEncodeWebp, client, signal })
    })
  }, [validation, webpSupported, run])

  // Valor fora da faixa aparece já ao digitar; campo vazio, só depois de tentar.
  const error = !validation.ok && (attempted || !validation.error.missing) ? validation.error : undefined

  // Uma imagem só, já com as medidas da prévia: o tamanho final aparece antes de processar.
  const [only] = items
  const image = items.length === 1 && only && only.status !== 'inspecting' && only.status !== 'rejected' ? only.image : undefined
  const outcome = image && validation.ok ? { from: image, to: resizedDimensions(image, validation.request) } : undefined

  return { batch, settings, updateSettings, resize, error, focusRequest, outcome }
}
