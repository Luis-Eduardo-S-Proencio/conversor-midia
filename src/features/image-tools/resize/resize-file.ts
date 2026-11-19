import { formatDimensions } from '../../../core/format'
import { IMAGE_FORMATS, resizeFormat } from '../../../core/image/formats'
import type { InspectedImage } from '../../../core/image/inspect'
import { outputFileName } from '../../../core/image/output-name'
import { resizedDimensions, type ResizeRequest } from '../../../core/image/resize'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { BatchOutput } from '../shared/batch-process'
import { RESIZE_QUALITY } from './settings'

export const KEPT_ORIGINAL_NOTE = 'Já cabe no tamanho pedido: mantida a original, com os metadados.'

interface ResizeFileInput {
  file: File
  /** Com as medidas da prévia: a imagem como aparece, com a orientação aplicada. */
  image: InspectedImage
  request: ResizeRequest
  canEncodeWebp: boolean
  client: ImageWorkerClient
  signal: AbortSignal
}

/**
 * Redimensiona um arquivo pelo Worker, no mesmo formato. Se as medidas não mudam (a imagem já cabe
 * no tamanho pedido), o original volta intacto, com os metadados, e o motivo é informado.
 */
export async function resizeFile({ file, image, request, canEncodeWebp, client, signal }: ResizeFileInput): Promise<BatchOutput> {
  const size = resizedDimensions(image, request)
  if (size.width === image.width && size.height === image.height) {
    // Mesmos bytes, com o tipo do formato real: o informado pelo sistema segue a extensão, que pode estar errada.
    const original = new Blob([file], { type: IMAGE_FORMATS[image.format].mimeType })
    return { blob: original, name: outputFileName(file.name, image.format), note: KEPT_ORIGINAL_NOTE }
  }

  const target = resizeFormat(image.format, image.hasAlpha, canEncodeWebp)
  // O fundo só apareceria com transparência indo para JPG, o que resizeFormat evita.
  const output = await client.run({ kind: 'convert', file, target, quality: RESIZE_QUALITY, background: '#ffffff', resize: size }, signal)
  // As medidas novas aparecem na lista, ao lado das originais.
  const sizeNote = `Novo tamanho: ${formatDimensions(size.width, size.height)}`
  return {
    blob: output.blob,
    name: outputFileName(file.name, target, `-${size.width}x${size.height}`),
    note:
      target === image.format
        ? sizeNote
        : `${sizeNote}. Este navegador não gera WEBP: a imagem saiu em ${IMAGE_FORMATS[target].label}.`,
  }
}
