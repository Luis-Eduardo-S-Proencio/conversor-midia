import type { Dimensions } from './resize'

/** Área de recorte em pixels da imagem como ela aparece (orientação EXIF já aplicada). */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** A mesma área em porcentagem da imagem: é como a tela desenha a seleção sobre a prévia. */
export type PercentRect = CropRect

/** A imagem inteira: o recorte começa sem cortar nada. */
export const fullCrop = ({ width, height }: Dimensions): CropRect => ({ x: 0, y: 0, width, height })

/** A área cobre a imagem inteira: não há o que recortar. */
export const isFullCrop = (crop: CropRect, image: Dimensions) =>
  crop.x === 0 && crop.y === 0 && crop.width === image.width && crop.height === image.height

/** A área está dentro da imagem, com medidas inteiras de pelo menos 1 px. */
export function isCropWithin(crop: CropRect, image: Dimensions): boolean {
  const values = [crop.x, crop.y, crop.width, crop.height]
  if (!values.every(Number.isInteger)) return false
  return crop.x >= 0 && crop.y >= 0 && crop.width >= 1 && crop.height >= 1 && crop.x + crop.width <= image.width && crop.y + crop.height <= image.height
}

/** Maior área com a proporção pedida (largura ÷ altura), centralizada na imagem. */
export function centeredAspectCrop(image: Dimensions, aspect: number): CropRect {
  const limitedByHeight = image.width / image.height > aspect
  const width = limitedByHeight ? Math.min(image.width, Math.max(1, Math.round(image.height * aspect))) : image.width
  const height = limitedByHeight ? image.height : Math.min(image.height, Math.max(1, Math.round(image.width / aspect)))
  return { x: Math.round((image.width - width) / 2), y: Math.round((image.height - height) / 2), width, height }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Uma dimensão: arredonda cada borda (e não a medida), para não acumular erro; mínimo de 1 px. */
function edges(start: number, length: number, total: number): [start: number, length: number] {
  const first = clamp(Math.round((start / 100) * total), 0, total - 1)
  const last = clamp(Math.round(((start + length) / 100) * total), first + 1, total)
  return [first, last - first]
}

/** Converte a área desenhada sobre a prévia (em %) para pixels inteiros da imagem, sempre dentro dela. */
export function cropFromPercent(percent: PercentRect, image: Dimensions): CropRect {
  const [x, width] = edges(percent.x, percent.width, image.width)
  const [y, height] = edges(percent.y, percent.height, image.height)
  return { x, y, width, height }
}

/** O inverso: pixels da imagem → porcentagem, para desenhar a área sobre a prévia, de qualquer tamanho. */
export function cropToPercent(crop: CropRect, image: Dimensions): PercentRect {
  return {
    x: (crop.x / image.width) * 100,
    y: (crop.y / image.height) * 100,
    width: (crop.width / image.width) * 100,
    height: (crop.height / image.height) * 100,
  }
}
