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

/**
 * Formatos que a ferramenta gera: os de imagem que o navegador lê e codifica, mais os que o
 * próprio app escreve a partir dos pixels (`core/image/encode`).
 */
export type OutputFormat = ImageFormat | 'bmp' | 'tiff' | 'ico' | 'pdf'

export const OUTPUT_FORMAT_INFO: Record<OutputFormat, ImageFormatInfo> = {
  ...IMAGE_FORMATS,
  bmp: { label: 'BMP', mimeType: 'image/bmp', extension: 'bmp', lossy: false, supportsAlpha: false },
  tiff: { label: 'TIFF', mimeType: 'image/tiff', extension: 'tiff', lossy: false, supportsAlpha: true },
  ico: { label: 'ICO', mimeType: 'image/x-icon', extension: 'ico', lossy: false, supportsAlpha: true },
  // A imagem vai dentro do PDF em JPG: tem qualidade e não tem transparência.
  pdf: { label: 'PDF', mimeType: 'application/pdf', extension: 'pdf', lossy: true, supportsAlpha: false },
}

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['jpeg', 'png', 'webp', 'bmp', 'tiff', 'ico', 'pdf']

/** Formato de saída pedido no endereço (ex.: "?formato=pdf", vindo do atalho "Imagem para PDF"; "jpg" vale JPEG). */
export function parseOutputFormat(text: string | null): OutputFormat | undefined {
  const name = text === 'jpg' ? 'jpeg' : text
  return OUTPUT_FORMATS.find((format) => format === name)
}

/**
 * Formato para comprimir: o canvas só tem compressão com perdas em JPG e WEBP. PNG (e WEBP, onde o
 * navegador não gera WEBP) vira WEBP ou, se opaco, JPG. Com transparência e sem WEBP não há como
 * reduzir sem perdê-la: `null`.
 */
export function compressionFormat(input: ImageFormat, hasAlpha: boolean, canEncodeWebp: boolean): ImageFormat | null {
  if (input === 'jpeg') return 'jpeg'
  if (canEncodeWebp) return 'webp'
  return hasAlpha ? null : 'jpeg'
}

/**
 * Formato das ferramentas que não trocam o formato (redimensionar, girar e espelhar): o mesmo da original.
 * Onde o navegador não gera WEBP (Safari), WEBP vira PNG se tiver transparência (para não perdê-la) ou JPG.
 */
export function preservedFormat(input: ImageFormat, hasAlpha: boolean, canEncodeWebp: boolean): ImageFormat {
  if (input !== 'webp' || canEncodeWebp) return input
  return hasAlpha ? 'png' : 'jpeg'
}

/**
 * Formato de saída sugerido: JPG, o mais compatível. Se todas as imagens já forem JPG,
 * WEBP (menor), ou PNG quando o navegador não consegue gerar WEBP.
 */
export function defaultTargetFormat(inputs: readonly ImageFormat[], canEncodeWebp: boolean): ImageFormat {
  const allJpeg = inputs.length > 0 && inputs.every((format) => format === 'jpeg')
  if (!allJpeg) return 'jpeg'
  return canEncodeWebp ? 'webp' : 'png'
}
