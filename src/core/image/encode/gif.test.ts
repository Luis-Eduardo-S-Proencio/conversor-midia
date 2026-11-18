import { describe, expect, it } from 'vitest'
import { decodeGif } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { noise, pixelSource, rgbaOf } from '../../../test/pixel-source'
import { encodeGif } from './gif'

/** Vermelho, verde e azul; o quadrante inferior direito transparente. */
const quadrants = rgbaOf(8, 8, (x, y) => {
  if (x < 4 && y < 4) return [255, 0, 0, 255]
  if (y < 4) return [0, 255, 0, 255]
  if (x < 4) return [0, 0, 255, 255]
  return [0, 0, 0, 0]
})

describe('encodeGif', () => {
  it('poucas cores e transparência: o GIF decodificado é igual à imagem', () => {
    const gif = decodeGif(concat(...encodeGif(pixelSource(8, 8, quadrants).source)))

    expect([gif.width, gif.height]).toEqual([8, 8])
    expect(gif.transparentIndex).toBeDefined()
    expect(gif.palette.length).toBe(4) // 3 cores + a transparente, em potência de 2
    expect(Array.from(gif.rgba)).toEqual(quadrants)
  })

  it('sem transparência, não declara cor transparente', () => {
    const rgba = rgbaOf(4, 4, (x) => (x < 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]))
    const gif = decodeGif(concat(...encodeGif(pixelSource(4, 4, rgba).source)))
    expect(gif.transparentIndex).toBeUndefined()
    expect(gif.minCodeSize).toBe(2) // o mínimo que o formato aceita
    expect(Array.from(gif.rgba)).toEqual(rgba)
  })

  it('foto com muitas cores: 256 cores, e cada pixel perto do original', () => {
    const random = noise()
    const jitter = (limit: number) => Math.floor(random() * limit)
    const rgba = rgbaOf(48, 32, (x, y) => [x * 5 + jitter(16), y * 7 + jitter(16), 90 + jitter(60), 255])
    const gif = decodeGif(concat(...encodeGif(pixelSource(48, 32, rgba).source)))

    expect(gif.palette).toHaveLength(256)
    expect(gif.minCodeSize).toBe(8)
    let total = 0
    gif.rgba.forEach((value, index) => {
      if (index % 4 !== 3) total += Math.abs(value - (rgba[index] ?? 0))
    })
    expect(total / (48 * 32 * 3)).toBeLessThan(6) // erro médio por canal
  })

  it('o resultado não depende do tamanho das faixas lidas', () => {
    const whole = concat(...encodeGif(pixelSource(8, 8, quadrants).source))
    expect(concat(...encodeGif(pixelSource(8, 8, quadrants).source, { bandPixels: 8 }))).toEqual(whole)
  })

  it('recusa lados acima de 65535 pixels, o limite do formato', () => {
    const { source } = pixelSource(70_000, 1, new Uint8Array(70_000 * 4))
    expect(() => [...encodeGif(source)]).toThrow(RangeError)
  })
})
