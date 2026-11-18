import { GifLzwEncoder } from './lzw'
import { bands, type EncodeOptions, type PixelSource } from './pixels'
import { ALPHA_THRESHOLD, buildPalette, type Rgb } from './quantize'

/** O GIF grava largura e altura em 16 bits. */
const MAX_SIDE = 65_535

function gifHeader(width: number, height: number, colors: readonly Rgb[], tableBits: number, transparentIndex: number) {
  const tableSize = 1 << tableBits
  const transparent = transparentIndex >= 0
  const bytes = new Uint8Array(13 + tableSize * 3 + (transparent ? 8 : 0) + 11)
  const view = new DataView(bytes.buffer)
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) // "GIF89a"
  view.setUint16(6, width, true)
  view.setUint16(8, height, true)
  bytes[10] = 0x80 | ((tableBits - 1) << 4) | (tableBits - 1) // tabela de cores global
  colors.forEach((color, index) => bytes.set(color, 13 + index * 3))
  let position = 13 + tableSize * 3
  if (transparent) {
    // Extensão de controle: só a marcação da cor transparente.
    bytes.set([0x21, 0xf9, 0x04, 0x01, 0, 0, transparentIndex, 0], position)
    position += 8
  }
  bytes[position] = 0x2c // imagem ocupando a tela inteira, sem tabela local nem entrelaçamento
  view.setUint16(position + 5, width, true)
  view.setUint16(position + 7, height, true)
  bytes[position + 10] = Math.max(2, tableBits) // tamanho mínimo dos códigos LZW
  return bytes
}

/**
 * GIF estático de até 256 cores (paleta por corte mediano, sem pontilhado). Transparência
 * total ou nenhuma. Lê a imagem duas vezes: uma para a paleta, outra para gravar.
 */
export function* encodeGif(source: PixelSource, { bandPixels }: EncodeOptions = {}): Generator<Uint8Array<ArrayBuffer>> {
  const { width, height } = source
  if (width > MAX_SIDE || height > MAX_SIDE) throw new RangeError(`O GIF aceita no máximo ${MAX_SIDE} pixels por lado`)

  const palette = buildPalette(source, 256, bandPixels)
  const transparentIndex = palette.hasTransparency ? palette.colors.length : -1
  const entries = palette.colors.length + (palette.hasTransparency ? 1 : 0)
  const tableBits = Math.max(1, Math.ceil(Math.log2(entries)))
  yield gifHeader(width, height, palette.colors, tableBits, transparentIndex)

  const encoder = new GifLzwEncoder(Math.max(2, tableBits))
  for (const { rgba } of bands(source, bandPixels)) {
    const indices = new Uint8Array(rgba.length / 4)
    for (let from = 0, pixel = 0; pixel < indices.length; from += 4, pixel += 1) {
      indices[pixel] =
        (rgba[from + 3] ?? 0) < ALPHA_THRESHOLD
          ? transparentIndex
          : palette.indexOf(rgba[from] ?? 0, rgba[from + 1] ?? 0, rgba[from + 2] ?? 0)
    }
    encoder.write(indices)
    const chunk = encoder.drain()
    if (chunk.length > 0) yield chunk
  }
  const rest = encoder.finish()
  const end = new Uint8Array(rest.length + 2)
  end.set(rest)
  end.set([0x00, 0x3b], rest.length) // fim dos dados da imagem e fim do arquivo
  yield end
}
