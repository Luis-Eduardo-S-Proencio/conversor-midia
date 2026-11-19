import { bands, type EncodeOptions, type PixelSource } from './pixels'

const SHORT = 3
const LONG = 4
const RATIONAL = 5

/** Faixas (strips) de até 64 KB: o tamanho que leitores antigos de TIFF esperam. */
const STRIP_BYTES = 64 * 1024

function hasTransparency(source: PixelSource, bandPixels: number | undefined): boolean {
  for (const band of bands(source, bandPixels)) {
    for (let index = 3; index < band.rgba.length; index += 4) if ((band.rgba[index] ?? 255) < 255) return true
  }
  return false
}

/**
 * TIFF básico (baseline) sem compressão, o mais compatível: RGB, ou RGBA quando algum pixel tem
 * transparência. Por isso lê a imagem duas vezes: uma para decidir os canais, outra para gravar.
 */
export function* encodeTiff(source: PixelSource, { bandPixels }: EncodeOptions = {}): Generator<Uint8Array<ArrayBuffer>> {
  const { width, height } = source
  const alpha = hasTransparency(source, bandPixels)
  const samples = alpha ? 4 : 3
  const rowBytes = width * samples
  const rowsPerStrip = Math.max(1, Math.floor(STRIP_BYTES / rowBytes))
  const strips = Math.ceil(height / rowsPerStrip)

  // Estrutura: cabeçalho, diretório (IFD), valores longos e, por fim, os pixels.
  const entries = alpha ? 14 : 13
  const ifdOffset = 8
  let cursor = ifdOffset + 2 + entries * 12 + 4
  const bitsOffset = cursor
  cursor += samples * 2
  const xResolutionOffset = cursor
  const yResolutionOffset = cursor + 8
  cursor += 16
  const stripOffsetsOffset = cursor
  const stripCountsOffset = cursor + strips * 4
  if (strips > 1) cursor += strips * 8
  const dataOffset = cursor

  const header = new Uint8Array(dataOffset)
  const view = new DataView(header.buffer)
  header.set([0x49, 0x49, 42, 0]) // "II": little-endian
  view.setUint32(4, ifdOffset, true)
  view.setUint16(ifdOffset, entries, true)

  let entry = ifdOffset + 2
  // Os campos precisam estar em ordem crescente de número.
  const field = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(entry, tag, true)
    view.setUint16(entry + 2, type, true)
    view.setUint32(entry + 4, count, true)
    if (type === SHORT && count === 1) view.setUint16(entry + 8, value, true)
    else view.setUint32(entry + 8, value, true)
    entry += 12
  }
  field(256, LONG, 1, width)
  field(257, LONG, 1, height)
  field(258, SHORT, samples, bitsOffset) // 8 bits por canal
  field(259, SHORT, 1, 1) // sem compressão
  field(262, SHORT, 1, 2) // RGB
  field(273, LONG, strips, strips > 1 ? stripOffsetsOffset : dataOffset)
  field(277, SHORT, 1, samples)
  field(278, LONG, 1, rowsPerStrip)
  field(279, LONG, strips, strips > 1 ? stripCountsOffset : height * rowBytes)
  field(282, RATIONAL, 1, xResolutionOffset)
  field(283, RATIONAL, 1, yResolutionOffset)
  field(284, SHORT, 1, 1) // canais intercalados (RGBRGB...)
  field(296, SHORT, 1, 2) // resolução em polegadas
  if (alpha) field(338, SHORT, 1, 2) // alfa não pré-multiplicado, como o canvas entrega
  view.setUint32(entry, 0, true) // não há outra imagem

  for (let sample = 0; sample < samples; sample += 1) view.setUint16(bitsOffset + sample * 2, 8, true)
  for (const offset of [xResolutionOffset, yResolutionOffset]) {
    view.setUint32(offset, 72, true)
    view.setUint32(offset + 4, 1, true)
  }
  if (strips > 1) {
    for (let strip = 0; strip < strips; strip += 1) {
      const rows = Math.min(rowsPerStrip, height - strip * rowsPerStrip)
      view.setUint32(stripOffsetsOffset + strip * 4, dataOffset + strip * rowsPerStrip * rowBytes, true)
      view.setUint32(stripCountsOffset + strip * 4, rows * rowBytes, true)
    }
  }
  yield header

  for (const band of bands(source, bandPixels)) {
    if (alpha) {
      yield new Uint8Array(band.rgba.buffer, band.rgba.byteOffset, band.rgba.byteLength)
      continue
    }
    const rgb = new Uint8Array(band.rows * rowBytes)
    for (let from = 0, to = 0; from < band.rgba.length; from += 4, to += 3) {
      rgb[to] = band.rgba[from] ?? 0
      rgb[to + 1] = band.rgba[from + 1] ?? 0
      rgb[to + 2] = band.rgba[from + 2] ?? 0
    }
    yield rgb
  }
}
