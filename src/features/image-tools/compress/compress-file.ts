import { IMAGE_FORMATS, compressionFormat } from '../../../core/image/formats'
import type { InspectedImage } from '../../../core/image/inspect'
import { outputFileName } from '../../../core/image/output-name'
import type { ImageWorkerClient } from '../../../workers/image-client'
import { BatchItemError, type BatchOutput } from '../shared/batch-process'

export const KEPT_ORIGINAL_NOTE = 'Já estava otimizada: mantida a original, com os metadados.'

export const TRANSPARENCY_UNSUPPORTED =
  'Este navegador não consegue reduzir imagens com transparência. Tente no Chrome, no Edge ou no Firefox.'

interface CompressInput {
  file: File
  image: InspectedImage
  /** De 10 a 100. */
  quality: number
  canEncodeWebp: boolean
  client: ImageWorkerClient
  signal: AbortSignal
}

/**
 * Comprime um arquivo pelo Worker. Nunca entrega algo maior que o original: se a versão reduzida
 * não ganhar espaço, o original volta intacto (inclusive com seus metadados) e o motivo é informado.
 */
export async function compressFile({ file, image, quality, canEncodeWebp, client, signal }: CompressInput): Promise<BatchOutput> {
  const target = compressionFormat(image.format, image.hasAlpha, canEncodeWebp)
  if (!target) throw new BatchItemError(TRANSPARENCY_UNSUPPORTED)

  // O fundo só importa se houver transparência indo para JPG, o que compressionFormat evita.
  const output = await client.run({ kind: 'convert', file, target, quality: quality / 100, background: '#ffffff' }, signal)
  if (output.blob.size >= file.size) {
    // Mesmos bytes, mas com o tipo detectado pela assinatura: o informado pelo sistema segue a
    // extensão, que pode estar errada (e o nome de saída já foi corrigido para o formato real).
    const original = new Blob([file], { type: IMAGE_FORMATS[image.format].mimeType })
    return { blob: original, name: outputFileName(file.name, image.format), note: KEPT_ORIGINAL_NOTE }
  }
  return { blob: output.blob, name: outputFileName(file.name, target) }
}
