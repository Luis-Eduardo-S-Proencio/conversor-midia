import { describe, expect, it } from 'vitest'
import { pixelSource, rgbaOf } from '../../../test/pixel-source'
import { buildPalette } from './quantize'

describe('buildPalette', () => {
  it('com poucas cores, a paleta tem exatamente as cores da imagem', () => {
    const colors: Array<[number, number, number]> = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [250, 250, 250],
    ]
    const { source } = pixelSource(4, 4, rgbaOf(4, 4, (x) => [...(colors[x] ?? [0, 0, 0]), 255]))
    const palette = buildPalette(source, 256)

    expect(palette.colors).toHaveLength(4)
    expect(palette.hasTransparency).toBe(false)
    for (const [r, g, b] of colors) expect(palette.colors[palette.indexOf(r, g, b)]).toEqual([r, g, b])
  })

  it('reduz muitas cores ao limite pedido, com erro pequeno em degradês', () => {
    const { source } = pixelSource(64, 64, rgbaOf(64, 64, (x, y) => [x * 4, y * 4, 128, 255]))
    const palette = buildPalette(source, 256)
    expect(palette.colors.length).toBeLessThanOrEqual(256)

    let worst = 0
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const color = palette.colors[palette.indexOf(x * 4, y * 4, 128)] ?? [0, 0, 0]
        worst = Math.max(worst, Math.abs(color[0] - x * 4), Math.abs(color[1] - y * 4), Math.abs(color[2] - 128))
      }
    }
    expect(worst).toBeLessThanOrEqual(24)
  })

  it('pixels quase invisíveis contam como transparência e não entram na paleta', () => {
    // Metade com alfa 100 (abaixo do limite) e metade opaca.
    const { source } = pixelSource(2, 1, [255, 0, 0, 100, 0, 0, 255, 255])
    const palette = buildPalette(source, 255)
    expect(palette.hasTransparency).toBe(true)
    expect(palette.colors).toEqual([[0, 0, 255]])
  })

  it('respeita o máximo de cores pedido', () => {
    const { source } = pixelSource(64, 64, rgbaOf(64, 64, (x, y) => [x * 4, y * 4, (x + y) * 2, 255]))
    expect(buildPalette(source, 16).colors).toHaveLength(16)
  })

  it('imagem toda transparente ainda tem uma cor, como o GIF exige', () => {
    const { source } = pixelSource(1, 1, [0, 0, 0, 0])
    const palette = buildPalette(source, 255)
    expect(palette.hasTransparency).toBe(true)
    expect(palette.colors).toHaveLength(1)
  })
})
