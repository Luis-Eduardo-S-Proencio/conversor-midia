import { describe, expect, it } from 'vitest'
import { decodeGif } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { rgbaOf } from '../../../test/pixel-source'
import { GIF_END, GifFrameEncoder, gifHeader } from './gif'
import { ColorHistogram, buildPalette } from './quantize'

type Rgba = [number, number, number, number]

const RED: Rgba = [255, 0, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]
const WHITE: Rgba = [255, 255, 255, 255]

/** Monta a animação inteira como o Worker: paleta dos quadros, cabeçalho, quadros e fim. */
function animate(width: number, height: number, frames: number[][], delays = frames.map(() => 10)) {
  const histogram = new ColorHistogram()
  for (const rgba of frames) histogram.add(rgba)
  const palette = buildPalette(histogram, 255)
  const encoder = new GifFrameEncoder(width, height, palette)
  const parts = [gifHeader(width, height, palette.colors), ...frames.map((rgba, index) => encoder.frame(rgba, delays[index] ?? 10)), GIF_END]
  return decodeGif(concat(...parts))
}

/** Fundo branco com um quadrado vermelho de 2 × 2 na posição pedida. */
const squareAt = (left: number, top: number) => rgbaOf(8, 6, (x, y) => (x >= left && x < left + 2 && y >= top && y < top + 2 ? RED : WHITE))

describe('GIF animado', () => {
  it('repete sem fim, com a paleta da animação inteira e o tempo de cada quadro', () => {
    const gif = animate(8, 6, [squareAt(0, 0), squareAt(4, 2)], [7, 6])
    expect(gif).toMatchObject({ width: 8, height: 6, loops: 0 })
    expect(gif.palette).toHaveLength(4) // branco, vermelho e o transparente, completados até 4
    expect(gif.frames.map((frame) => frame.delay)).toEqual([7, 6])
    expect(gif.frames.every((frame) => frame.disposal === 1)).toBe(true) // cada quadro fica por baixo do seguinte
  })

  it('o primeiro quadro é a tela inteira; os seguintes, só o retângulo que mudou', () => {
    const first = squareAt(0, 0)
    const second = squareAt(4, 2)
    const gif = animate(8, 6, [first, second])
    expect(gif.frames[0]).toMatchObject({ x: 0, y: 0, width: 8, height: 6 })
    // O quadrado sai de (0, 0)–(1, 1) e entra em (4, 2)–(5, 3): muda o retângulo que cobre os dois.
    expect(gif.frames[1]).toMatchObject({ x: 0, y: 0, width: 6, height: 4 })
    expect(Array.from(gif.frames[0]?.rgba ?? [])).toEqual(first)
    expect(Array.from(gif.frames[1]?.rgba ?? [])).toEqual(second)
  })

  it('dentro do retângulo, o que não mudou fica transparente e o quadro anterior aparece', () => {
    const before = rgbaOf(8, 6, (x) => (x < 4 ? BLUE : WHITE))
    const after = rgbaOf(8, 6, (x, y) => (x < 4 ? BLUE : y === 0 || y === 5 ? RED : WHITE))
    const gif = animate(8, 6, [before, after])
    expect(gif.frames[1]).toMatchObject({ x: 4, y: 0, width: 4, height: 6 })
    expect(Array.from(gif.frames[1]?.rgba ?? [])).toEqual(after)
  })

  it('quadro igual ao anterior: um pixel transparente, só para marcar o tempo', () => {
    const still = squareAt(2, 2)
    const gif = animate(8, 6, [still, still, still], [10, 20, 30])
    expect(gif.frames[1]).toMatchObject({ x: 0, y: 0, width: 1, height: 1, delay: 20 })
    expect(Array.from(gif.frames[2]?.rgba ?? [])).toEqual(still)
  })

  it('ruído leve de compressão não conta como mudança; mudança de verdade conta', () => {
    const base = rgbaOf(8, 6, () => [120, 120, 120, 255])
    const noisy = rgbaOf(8, 6, (x, y) => ((x + y) % 2 ? [124, 117, 122, 255] : [120, 120, 120, 255]))
    const changed = rgbaOf(8, 6, (x) => (x === 7 ? [200, 30, 30, 255] : [120, 120, 120, 255]))
    const gif = animate(8, 6, [base, noisy, changed])
    expect(gif.frames[1]).toMatchObject({ width: 1, height: 1 }) // nada a gravar
    expect(gif.frames[2]).toMatchObject({ x: 7, y: 0, width: 1, height: 6 })
  })

  it('medidas ou paleta fora do que o GIF aceita são recusadas', () => {
    expect(() => gifHeader(0, 10, [[0, 0, 0]])).toThrow(RangeError)
    expect(() => gifHeader(70_000, 10, [[0, 0, 0]])).toThrow(RangeError)
    expect(() => gifHeader(10, 10, [])).toThrow(RangeError)
  })
})
