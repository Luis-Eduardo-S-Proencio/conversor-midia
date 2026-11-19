/** Tamanhos padrão de ícone: favicon (16, 32), atalhos do Windows (48) e telas de alta densidade (256). */
const ICO_SIZES = [16, 32, 48, 256] as const

/** Tamanhos que a imagem preenche sem ser ampliada; sempre ao menos o de 16 px. */
export function icoSizes(width: number, height: number): number[] {
  const longest = Math.max(width, height)
  const sizes = ICO_SIZES.filter((size) => size <= longest)
  return sizes.length > 0 ? sizes : [16]
}

export interface IcoImage {
  size: number
  /** Tamanho, em bytes, do PNG desse tamanho. */
  byteLength: number
}

/**
 * Cabeçalho do ICO. As imagens vêm logo depois, na mesma ordem, como PNG (aceito por navegadores
 * e pelo Windows desde o Vista).
 */
export function icoHeader(images: readonly IcoImage[]): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(6 + images.length * 16)
  const view = new DataView(header.buffer)
  view.setUint16(2, 1, true) // tipo: ícone
  view.setUint16(4, images.length, true)
  let offset = header.length
  images.forEach(({ size, byteLength }, index) => {
    const entry = 6 + index * 16
    const side = size >= 256 ? 0 : size // 0 significa 256
    header[entry] = side
    header[entry + 1] = side
    view.setUint16(entry + 4, 1, true) // planos de cor
    view.setUint16(entry + 6, 32, true) // bits por pixel
    view.setUint32(entry + 8, byteLength, true)
    view.setUint32(entry + 12, offset, true)
    offset += byteLength
  })
  return header
}
