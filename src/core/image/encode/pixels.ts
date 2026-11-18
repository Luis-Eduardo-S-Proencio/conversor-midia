/**
 * Pixels de uma imagem já desenhada, lidos por faixas de linhas. Os codificadores próprios
 * (BMP, TIFF, GIF) nunca pedem a imagem inteira de uma vez: numa foto de 48 MP, uma cópia
 * completa custaria mais 190 MB além do canvas.
 */
export interface PixelSource {
  width: number
  height: number
  /** RGBA de 8 bits, sem pré-multiplicar, das linhas de `y` até `y + rows - 1`. */
  readRows(y: number, rows: number): Uint8ClampedArray<ArrayBuffer>
}

export interface EncodeOptions {
  /** Pixels lidos por vez. Os testes usam faixas pequenas para exercitar a divisão. */
  bandPixels?: number
}

/** 4 milhões de pixels: cerca de 16 MB de RGBA por faixa. */
export const BAND_PIXELS = 4 * 1024 * 1024

export interface Band {
  y: number
  rows: number
  rgba: Uint8ClampedArray<ArrayBuffer>
}

/** Percorre a imagem em faixas de linhas inteiras, de cima para baixo ou de baixo para cima. */
export function* bands(
  source: PixelSource,
  bandPixels = BAND_PIXELS,
  order: 'top-down' | 'bottom-up' = 'top-down',
): Generator<Band> {
  const rowsPerBand = Math.max(1, Math.floor(bandPixels / source.width))
  if (order === 'bottom-up') {
    for (let end = source.height; end > 0; end -= rowsPerBand) {
      const y = Math.max(0, end - rowsPerBand)
      yield { y, rows: end - y, rgba: source.readRows(y, end - y) }
    }
    return
  }
  for (let y = 0; y < source.height; y += rowsPerBand) {
    const rows = Math.min(rowsPerBand, source.height - y)
    yield { y, rows, rgba: source.readRows(y, rows) }
  }
}
