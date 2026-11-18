import { useCallback, useState } from 'react'
import { processingErrorMessage } from '../../../core/image/messages'
import { BatchItemError } from '../shared/batch-process'
import { useImageBatch } from '../shared/useImageBatch'
import { compressFile } from './compress-file'
import { COMPRESSION_LEVELS, COMPRESS_LABELS, DEFAULT_LEVEL, type CompressionLevel } from './settings'

/** Comprimir imagem: um nível para todo o lote; nunca entrega arquivo maior que o original. */
export function useCompressTool() {
  const batch = useImageBatch(COMPRESS_LABELS)
  const { webpSupported, invalidateResults, run } = batch
  const [level, setLevel] = useState<CompressionLevel>(DEFAULT_LEVEL)

  const changeLevel = useCallback(
    (next: CompressionLevel) => {
      setLevel(next)
      invalidateResults()
    },
    [invalidateResults],
  )

  const compress = useCallback(() => {
    const { quality } = COMPRESSION_LEVELS[level]
    const canEncodeWebp = webpSupported !== false
    void run(async (file, item, { client, signal }) => {
      // Itens prontos sempre têm o cabeçalho lido; a guarda só protege contra estado inesperado.
      if (!item.image) throw new BatchItemError(processingErrorMessage('unexpected'))
      return compressFile({ file, image: item.image, quality, canEncodeWebp, client, signal })
    })
  }, [level, webpSupported, run])

  return { batch, level, changeLevel, compress }
}
