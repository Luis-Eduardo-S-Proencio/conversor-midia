const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const HEADER_BYTES = 22 // 6 do cabeçalho + 16 da entrada de diretório

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
}

/**
 * Empacota um PNG quadrado num arquivo .ico de imagem única.
 * PNG dentro de ICO é aceito por todos os navegadores atuais e evita outra dependência.
 */
export function pngToIco(png: Uint8Array, size: number): Uint8Array {
  if (!isPng(png)) throw new TypeError('O conteúdo não é um PNG.')
  if (!Number.isInteger(size) || size < 1 || size > 256) {
    throw new RangeError(`Tamanho de ícone fora do formato ICO (1 a 256): ${size}`)
  }

  const ico = new Uint8Array(HEADER_BYTES + png.byteLength)
  const view = new DataView(ico.buffer)
  const sideByte = size === 256 ? 0 : size // 0 significa 256 no formato

  view.setUint16(0, 0, true) // reservado
  view.setUint16(2, 1, true) // tipo: ícone
  view.setUint16(4, 1, true) // quantidade de imagens
  view.setUint8(6, sideByte)
  view.setUint8(7, sideByte)
  view.setUint8(8, 0) // paleta: nenhuma
  view.setUint8(9, 0) // reservado
  view.setUint16(10, 1, true) // planos de cor
  view.setUint16(12, 32, true) // bits por pixel
  view.setUint32(14, png.byteLength, true)
  view.setUint32(18, HEADER_BYTES, true)
  ico.set(png, HEADER_BYTES)
  return ico
}
