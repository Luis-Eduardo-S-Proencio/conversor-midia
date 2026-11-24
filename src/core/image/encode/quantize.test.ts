import { describe, expect, it } from 'vitest'
import { rgbaOf } from '../../../test/pixel-source'
import { ColorHistogram, buildPalette } from './quantize'

const histogramOf = (...images: ArrayLike<number>[]) => {
  const histogram = new ColorHistogram()
  for (const rgba of images) histogram.add(rgba)
  return histogram
}

describe('buildPalette', () => {
  it('com poucas cores, a paleta tem exatamente as cores da imagem', () => {
    const colors: Array<[number, number, number]> = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [250, 250, 250],
    ]
    const palette = buildPalette(histogramOf(rgbaOf(4, 4, (x) => [...(colors[x] ?? [0, 0, 0]), 255])), 255)
    expect(palette.colors).toHaveLength(4)
    for (const [r, g, b] of colors) expect(palette.colors[palette.indexOf(r, g, b)]).toEqual([r, g, b])
  })

  it('reduz muitas cores ao limite pedido, com erro pequeno em degradês', () => {
    const palette = buildPalette(histogramOf(rgbaOf(64, 64, (x, y) => [x * 4, y * 4, 128, 255])), 255)
    expect(palette.colors.length).toBeLessThanOrEqual(255)
    let worst = 0
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const color = palette.colors[palette.indexOf(x * 4, y * 4, 128)] ?? [0, 0, 0]
        worst = Math.max(worst, Math.abs(color[0] - x * 4), Math.abs(color[1] - y * 4), Math.abs(color[2] - 128))
      }
    }
    expect(worst).toBeLessThanOrEqual(24)
  })

  it('junta vários quadros: as cores de todos entram na mesma paleta', () => {
    const red = rgbaOf(4, 4, () => [255, 0, 0, 255])
    const blue = rgbaOf(4, 4, () => [0, 0, 255, 255])
    const palette = buildPalette(histogramOf(red, blue), 255)
    expect(palette.colors).toHaveLength(2)
    expect(palette.colors[palette.indexOf(255, 0, 0)]).toEqual([255, 0, 0])
    expect(palette.colors[palette.indexOf(0, 0, 255)]).toEqual([0, 0, 255])
  })

  it('cor que não estava nos quadros de amostra vai para a mais próxima da paleta', () => {
    const palette = buildPalette(histogramOf(rgbaOf(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]))), 255)
    expect(palette.colors[palette.indexOf(230, 30, 20)]).toEqual([255, 0, 0])
    expect(palette.colors[palette.indexOf(20, 40, 200)]).toEqual([0, 0, 255])
  })

  it('respeita o máximo de cores pedido', () => {
    const palette = buildPalette(histogramOf(rgbaOf(64, 64, (x, y) => [x * 4, y * 4, (x + y) * 2, 255])), 16)
    expect(palette.colors).toHaveLength(16)
  })

  it('pixels transparentes ficam de fora; nada opaco ainda dá uma cor, como o GIF exige', () => {
    expect(buildPalette(histogramOf([255, 0, 0, 100, 0, 0, 255, 255]), 255).colors).toEqual([[0, 0, 255]])
    expect(buildPalette(histogramOf([0, 0, 0, 0]), 255).colors).toHaveLength(1)
  })
})
