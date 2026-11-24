import { preservedFormat } from '../../../core/image/formats'
import type { InspectedImage } from '../../../core/image/inspect'
import { reencodeQuality } from '../../../core/image/jpeg-quality'
import { webpFallbackNote } from '../../../core/image/messages'
import { describeOrientation, type Orientation } from '../../../core/image/orientation'
import { outputFileName } from '../../../core/image/output-name'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { BatchOutput } from '../shared/batch-process'
import { ROTATE_QUALITY } from './settings'

interface RotateFileInput {
  file: File
  image: InspectedImage
  orientation: Orientation
  canEncodeWebp: boolean
  client: ImageWorkerClient
  signal: AbortSignal
}

/**
 * Gira e espelha um arquivo pelo Worker, no mesmo formato e com o mesmo nome: é uma correção da foto.
 * A lista mostra o que foi feito ("Girada 90° para a direita").
 */
export async function rotateFile({ file, image, orientation, canEncodeWebp, client, signal }: RotateFileInput): Promise<BatchOutput> {
  const target = preservedFormat(image.format, image.hasAlpha, canEncodeWebp)
  // O fundo só apareceria com transparência indo para JPG, o que preservedFormat evita.
  const quality = reencodeQuality(ROTATE_QUALITY, image, target)
  const output = await client.run({ kind: 'convert', file, target, quality, background: '#ffffff', orientation }, signal)
  const done = describeOrientation(orientation)
  return {
    blob: output.blob,
    name: outputFileName(file.name, target),
    note: target === image.format ? done : `${done}. ${webpFallbackNote(target)}`,
  }
}
