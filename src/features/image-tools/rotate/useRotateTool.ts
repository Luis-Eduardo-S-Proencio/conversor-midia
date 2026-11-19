import { useCallback, useState } from 'react'
import { processingErrorMessage } from '../../../core/image/messages'
import { UPRIGHT, applyStep, isUpright, type Orientation, type OrientationStep } from '../../../core/image/orientation'
import { BatchItemError } from '../shared/batch-process'
import { useImageBatch } from '../shared/useImageBatch'
import { rotateFile } from './rotate-file'
import { NOTHING_CHOSEN, ROTATE_LABELS } from './settings'

/** Girar e espelhar: a mesma orientação para todo o lote; a prévia mostra o resultado antes de processar. */
export function useRotateTool() {
  const batch = useImageBatch(ROTATE_LABELS)
  const { webpSupported, invalidateResults, run } = batch
  const [orientation, setOrientation] = useState<Orientation>(UPRIGHT)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState<object>()

  const changeOrientation = useCallback(
    (next: (current: Orientation) => Orientation) => {
      setOrientation(next)
      setAttempted(false) // escolheu algo (ou desfez): o aviso só volta numa nova tentativa
      setFocusRequest(undefined)
      invalidateResults()
    },
    [invalidateResults],
  )

  const step = useCallback((value: OrientationStep) => changeOrientation((current) => applyStep(current, value)), [changeOrientation])

  const resetOrientation = useCallback(() => changeOrientation(() => UPRIGHT), [changeOrientation])

  const apply = useCallback(() => {
    if (isUpright(orientation)) {
      setAttempted(true)
      setFocusRequest({})
      return
    }
    const canEncodeWebp = webpSupported !== false
    void run(async (file, item, { client, signal }) => {
      // Itens prontos sempre têm o cabeçalho lido; a guarda só protege contra estado inesperado.
      if (!item.image) throw new BatchItemError(processingErrorMessage('unexpected'))
      return rotateFile({ file, image: item.image, orientation, canEncodeWebp, client, signal })
    })
  }, [orientation, webpSupported, run])

  const error = attempted && isUpright(orientation) ? NOTHING_CHOSEN : undefined

  return { batch, orientation, step, resetOrientation, apply, error, focusRequest }
}
