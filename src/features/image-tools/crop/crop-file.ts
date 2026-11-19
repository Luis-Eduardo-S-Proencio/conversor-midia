import { formatDimensions } from '../../../core/format'
import type { CropRect } from '../../../core/image/crop'
import { preservedFormat } from '../../../core/image/formats'
import type { InspectedImage } from '../../../core/image/inspect'
import { webpFallbackNote } from '../../../core/image/messages'
import { outputFileName } from '../../../core/image/output-name'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { BatchOutput } from '../shared/batch-process'
import { CROP_QUALITY } from './settings'

interface CropFileInput {
  file: File
  image: InspectedImage
  /** Em pixels da imagem como ela aparece (as medidas da prévia). */
  crop: CropRect
  canEncodeWebp: boolean
  client: ImageWorkerClient
  signal: AbortSignal
}

/** Recorta a imagem pelo Worker, no mesmo formato e com o mesmo nome. A lista mostra as medidas novas. */
export async function cropFile({ file, image, crop, canEncodeWebp, client, signal }: CropFileInput): Promise<BatchOutput> {
  const target = preservedFormat(image.format, image.hasAlpha, canEncodeWebp)
  // O fundo só apareceria com transparência indo para JPG, o que preservedFormat evita.
  const output = await client.run({ kind: 'convert', file, target, quality: CROP_QUALITY, background: '#ffffff', crop }, signal)
  const done = `Recortada para ${formatDimensions(crop.width, crop.height)}`
  return {
    blob: output.blob,
    name: outputFileName(file.name, target),
    note: target === image.format ? done : `${done}. ${webpFallbackNote(target)}`,
  }
}
