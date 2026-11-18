import { bands, type EncodeOptions, type PixelSource } from './pixels'

const FILE_HEADER_SIZE = 14
const INFO_HEADER_SIZE = 40
const HEADER_SIZE = FILE_HEADER_SIZE + INFO_HEADER_SIZE
// 72 dpi em pixels por metro, o padrão dos programas de imagem.
const PIXELS_PER_METER = 2835

function bmpHeader(width: number, height: number, pixelBytes: number): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(HEADER_SIZE)
  const view = new DataView(header.buffer)
  header.set([0x42, 0x4d]) // "BM"
  view.setUint32(2, HEADER_SIZE + pixelBytes, true)
  view.setUint32(10, HEADER_SIZE, true)
  view.setUint32(14, INFO_HEADER_SIZE, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positivo: linhas de baixo para cima, o mais compatível
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(30, 0, true) // sem compressão
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, PIXELS_PER_METER, true)
  view.setInt32(42, PIXELS_PER_METER, true)
  return header
}

/**
 * BMP de 24 bits sem compressão. Não guarda transparência: a imagem deve chegar opaca, com o
 * fundo já aplicado.
 */
export function* encodeBmp(source: PixelSource, { bandPixels }: EncodeOptions = {}): Generator<Uint8Array<ArrayBuffer>> {
  const { width, height } = source
  const rowSize = Math.ceil((width * 3) / 4) * 4 // cada linha ocupa múltiplo de 4 bytes
  yield bmpHeader(width, height, rowSize * height)

  for (const band of bands(source, bandPixels, 'bottom-up')) {
    const chunk = new Uint8Array(rowSize * band.rows)
    for (let row = 0; row < band.rows; row += 1) {
      // Dentro da faixa também de baixo para cima; o preenchimento da linha fica com zeros.
      let from = (band.rows - 1 - row) * width * 4
      let to = row * rowSize
      for (let x = 0; x < width; x += 1, from += 4, to += 3) {
        chunk[to] = band.rgba[from + 2] ?? 0
        chunk[to + 1] = band.rgba[from + 1] ?? 0
        chunk[to + 2] = band.rgba[from] ?? 0
      }
    }
    yield chunk
  }
}
