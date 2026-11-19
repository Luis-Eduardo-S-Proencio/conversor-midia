import { describe, expect, it } from 'vitest'
import { readTiff } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { noise, pixelSource, rgbaOf } from '../../../test/pixel-source'
import { encodeTiff } from './tiff'

const OPAQUE = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255]

describe('encodeTiff', () => {
  it('imagem opaca: RGB de 8 bits sem compressão, com os campos obrigatórios em ordem crescente', () => {
    const tiff = readTiff(concat(...encodeTiff(pixelSource(3, 2, OPAQUE).source)))

    expect(tiff.tagOrder).toEqual([256, 257, 258, 259, 262, 273, 277, 278, 279, 282, 283, 284, 296])
    expect([tiff.width, tiff.height, tiff.samplesPerPixel]).toEqual([3, 2, 3])
    expect(tiff.tags.get(258)).toEqual([8, 8, 8]) // bits por amostra
    expect(tiff.tags.get(259)).toEqual([1]) // sem compressão
    expect(tiff.tags.get(262)).toEqual([2]) // RGB
    expect(tiff.tags.get(282)).toEqual([72, 1]) // 72 dpi
    expect(tiff.tags.get(296)).toEqual([2]) // em polegadas
    expect(tiff.nextIfd).toBe(0)
    expect(Array.from(tiff.pixels)).toEqual(OPAQUE.filter((_, index) => index % 4 !== 3))
  })

  it('com transparência: RGBA, com o canal alfa declarado como não pré-multiplicado', () => {
    const rgba = [...OPAQUE.slice(0, 20), 0, 0, 0, 0]
    const tiff = readTiff(concat(...encodeTiff(pixelSource(3, 2, rgba).source)))
    expect(tiff.samplesPerPixel).toBe(4)
    expect(tiff.tags.get(258)).toEqual([8, 8, 8, 8])
    expect(tiff.tags.get(338)).toEqual([2])
    expect(Array.from(tiff.pixels)).toEqual(rgba)
  })

  it('divide imagens largas em várias faixas contíguas e lê os pixels em partes', () => {
    const random = noise()
    const byte = () => Math.floor(random() * 256)
    const rgba = rgbaOf(10_000, 5, () => [byte(), byte(), byte(), 255])
    const { source, reads } = pixelSource(10_000, 5, rgba)
    const tiff = readTiff(concat(...encodeTiff(source, { bandPixels: 20_000 })))

    const offsets = tiff.tags.get(273) ?? []
    const counts = tiff.tags.get(279) ?? []
    expect(offsets.length).toBeGreaterThan(1)
    offsets.slice(1).forEach((offset, index) => expect(offset).toBe((offsets[index] ?? 0) + (counts[index] ?? 0)))
    expect(Array.from(tiff.pixels)).toEqual(rgba.filter((_, index) => index % 4 !== 3))
    expect(reads.every(([, rows]) => rows <= 2)).toBe(true)
  })
})
