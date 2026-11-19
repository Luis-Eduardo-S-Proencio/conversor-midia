import { describe, expect, it } from 'vitest'
import { pixelSource, rgbaOf } from '../../../test/pixel-source'
import { bands } from './pixels'

const image = (width: number, height: number) => pixelSource(width, height, rgbaOf(width, height, () => [0, 0, 0, 255]))

describe('bands', () => {
  it('percorre todas as linhas uma vez, em faixas do tamanho pedido', () => {
    const { source, reads } = image(4, 7)
    const seen = Array.from(bands(source, 8), (band) => [band.y, band.rows, band.rgba.length])
    expect(seen).toEqual([
      [0, 2, 32],
      [2, 2, 32],
      [4, 2, 32],
      [6, 1, 16],
    ])
    expect(reads).toEqual([
      [0, 2],
      [2, 2],
      [4, 2],
      [6, 1],
    ])
  })

  it('de baixo para cima, para formatos que guardam a última linha primeiro', () => {
    const { source } = image(4, 7)
    expect(Array.from(bands(source, 8, 'bottom-up'), (band) => [band.y, band.rows])).toEqual([
      [5, 2],
      [3, 2],
      [1, 2],
      [0, 1],
    ])
  })

  it('lê ao menos uma linha por vez, mesmo com linhas mais largas que a faixa', () => {
    const { source } = image(10, 3)
    expect(Array.from(bands(source, 4), (band) => band.rows)).toEqual([1, 1, 1])
  })
})
