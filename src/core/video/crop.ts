/** Regras do recorte de vídeo que não existem no de imagem. Funções puras: sem React nem DOM. */
import type { CropRect } from '../image/crop'
import type { Dimensions } from '../image/resize'

/** Menor lado da área, em pixels: codificadores de vídeo recusam quadros minúsculos. */
export const MIN_VIDEO_CROP_SIDE = 16

const even = (side: number) => side - (side % 2)

/**
 * Codificadores H.264 exigem largura e altura pares: onde a área for ímpar, ela perde 1 px
 * (à direita ou embaixo). Assim o vídeo sai sempre em H.264, o formato que toca em todo lugar.
 */
export const encodableCrop = (crop: CropRect): CropRect => ({ ...crop, width: even(crop.width), height: even(crop.height) })

/** Medidas pares do quadro inteiro, pelo mesmo motivo. */
export const encodableSize = (size: Dimensions): Dimensions => ({ width: even(size.width), height: even(size.height) })

/** O vídeo é menor que a área mínima? */
export const tooSmallToCrop = (size: Dimensions) => size.width < MIN_VIDEO_CROP_SIDE || size.height < MIN_VIDEO_CROP_SIDE
