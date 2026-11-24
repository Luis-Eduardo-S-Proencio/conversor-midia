/**
 * GIF animado (GIF89a): uma paleta para a animação inteira, repetição sem fim e quadros enxutos. De um
 * quadro para o outro só entra o retângulo que mudou, e dentro dele os pixels que continuam iguais (ou
 * quase: a compressão do vídeo deixa um "ruído" leve) ficam transparentes, deixando aparecer o quadro
 * anterior. Num vídeo com fundo parado, isso reduz muito o arquivo.
 */
import { GifLzwEncoder } from './lzw'
import type { Palette, Rgb } from './quantize'

/** O GIF grava medidas em 16 bits. */
export const GIF_MAX_SIDE = 65_535

/** Cores da paleta: 255, porque a posição seguinte fica para "transparente" (o que não mudou). */
export const GIF_MAX_COLORS = 255

/**
 * Distância de cor (RGB, ao quadrado) abaixo da qual o pixel conta como igual ao que já aparece: cerca de
 * 7 níveis por canal, o ruído de compressão de um vídeo parado. Mudança de verdade passa bem disso.
 */
const STILL_DISTANCE = 12 ** 2

/** Bits da tabela de cores: cabe a paleta mais a posição transparente (mínimo de 2 cores). */
const tableBitsFor = (colorCount: number) => Math.max(1, Math.ceil(Math.log2(colorCount + 1)))

const u16 = (value: number) => [value & 0xff, (value >> 8) & 0xff]

/** Repetição sem fim (extensão NETSCAPE2.0, que todos os navegadores e programas seguem). */
const LOOP_FOREVER = [0x21, 0xff, 0x0b, ...Array.from('NETSCAPE2.0', (char) => char.charCodeAt(0)), 0x03, 0x01, 0x00, 0x00, 0x00]

/** Cabeçalho: "GIF89a", tamanho da tela, paleta (completada até uma potência de 2) e a repetição. */
export function gifHeader(width: number, height: number, colors: readonly Rgb[]): Uint8Array<ArrayBuffer> {
  if (width < 1 || height < 1 || width > GIF_MAX_SIDE || height > GIF_MAX_SIDE) throw new RangeError(`Medidas fora do GIF: ${width} × ${height}`)
  if (colors.length < 1 || colors.length > GIF_MAX_COLORS) throw new RangeError(`Paleta com ${colors.length} cores`)
  const tableBits = tableBitsFor(colors.length)
  const table = new Uint8Array((1 << tableBits) * 3)
  colors.forEach((color, index) => table.set(color, index * 3))
  const screen = [...u16(width), ...u16(height), 0x80 | ((tableBits - 1) << 4) | (tableBits - 1), 0, 0]
  const bytes = new Uint8Array(6 + screen.length + table.length + LOOP_FOREVER.length)
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) // "GIF89a"
  bytes.set(screen, 6)
  bytes.set(table, 6 + screen.length)
  bytes.set(LOOP_FOREVER, 6 + screen.length + table.length)
  return bytes
}

/** Fim do arquivo. */
export const GIF_END = Uint8Array.of(0x3b)

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Grava os quadros um a um, lembrando o que já aparece na tela. Cada chamada de `frame` devolve os bytes
 * do quadro (controle, posição e pixels compactados), prontos para ir depois do cabeçalho.
 */
export class GifFrameEncoder {
  private readonly width: number
  private readonly height: number
  private readonly palette: Palette
  private readonly shown: Uint8Array
  private started = false
  private readonly transparent: number
  private readonly minCodeSize: number

  constructor(width: number, height: number, palette: Palette) {
    this.width = width
    this.height = height
    this.palette = palette
    this.shown = new Uint8Array(width * height)
    this.transparent = palette.colors.length
    this.minCodeSize = Math.max(2, tableBitsFor(palette.colors.length))
  }

  /** `rgba`: o quadro inteiro, nas medidas da tela; `delay`: quanto ele fica, em centésimos de segundo. */
  frame(rgba: ArrayLike<number>, delay: number): Uint8Array<ArrayBuffer> {
    const { width, height, shown, palette } = this
    const next = new Int16Array(width * height).fill(-1) // -1: continua como está
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let pixel = 0; pixel < next.length; pixel += 1) {
      const r = rgba[pixel * 4] ?? 0
      const g = rgba[pixel * 4 + 1] ?? 0
      const b = rgba[pixel * 4 + 2] ?? 0
      if (this.started) {
        const [sr, sg, sb] = palette.colors[shown[pixel] ?? 0] ?? [0, 0, 0]
        if ((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2 <= STILL_DISTANCE) continue
      }
      const index = palette.indexOf(r, g, b)
      if (this.started && index === shown[pixel]) continue
      next[pixel] = index
      const x = pixel % width
      const y = (pixel - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    this.started = true

    // Nada mudou: um pixel transparente só para marcar o tempo do quadro.
    const rect: Rect = maxX < 0 ? { x: 0, y: 0, width: 1, height: 1 } : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    const indices = new Uint8Array(rect.width * rect.height).fill(this.transparent)
    for (let row = 0; row < rect.height; row += 1) {
      for (let column = 0; column < rect.width; column += 1) {
        const pixel = (rect.y + row) * width + rect.x + column
        const index = next[pixel] ?? -1
        if (index < 0) continue
        indices[row * rect.width + column] = index
        shown[pixel] = index
      }
    }
    return this.encode(rect, indices, delay)
  }

  private encode(rect: Rect, indices: Uint8Array, delay: number): Uint8Array<ArrayBuffer> {
    // Controle: "não descartar" (o quadro seguinte desenha por cima deste), tempo e a cor transparente.
    const control = [0x21, 0xf9, 0x04, (1 << 2) | 1, ...u16(delay), this.transparent, 0x00]
    const descriptor = [0x2c, ...u16(rect.x), ...u16(rect.y), ...u16(rect.width), ...u16(rect.height), 0x00, this.minCodeSize]
    const lzw = new GifLzwEncoder(this.minCodeSize)
    lzw.write(indices)
    const first = lzw.drain()
    const rest = lzw.finish()
    const bytes = new Uint8Array(control.length + descriptor.length + first.length + rest.length + 1)
    bytes.set(control)
    bytes.set(descriptor, control.length)
    bytes.set(first, control.length + descriptor.length)
    bytes.set(rest, control.length + descriptor.length + first.length) // o último byte (0) fecha os dados
    return bytes
  }
}
