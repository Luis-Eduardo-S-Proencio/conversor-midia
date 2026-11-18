export type ImageFormat = 'jpeg' | 'png' | 'webp'

export interface ImageFormatInfo {
  label: string
  mimeType: string
  extension: string
  /** Aceita o parâmetro de qualidade na codificação. */
  lossy: boolean
  supportsAlpha: boolean
}

export const IMAGE_FORMATS: Record<ImageFormat, ImageFormatInfo> = {
  jpeg: { label: 'JPG', mimeType: 'image/jpeg', extension: 'jpg', lossy: true, supportsAlpha: false },
  png: { label: 'PNG', mimeType: 'image/png', extension: 'png', lossy: false, supportsAlpha: true },
  webp: { label: 'WEBP', mimeType: 'image/webp', extension: 'webp', lossy: true, supportsAlpha: true },
}

export const OUTPUT_FORMATS: readonly ImageFormat[] = ['jpeg', 'png', 'webp']

/**
 * Formato de saída sugerido: JPG, o mais compatível. Se todas as imagens já forem JPG,
 * WEBP (menor), ou PNG quando o navegador não consegue gerar WEBP.
 */
export function defaultTargetFormat(inputs: readonly ImageFormat[], canEncodeWebp: boolean): ImageFormat {
  const allJpeg = inputs.length > 0 && inputs.every((format) => format === 'jpeg')
  if (!allJpeg) return 'jpeg'
  return canEncodeWebp ? 'webp' : 'png'
}
