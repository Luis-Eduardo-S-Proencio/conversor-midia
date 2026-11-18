import { describe, expect, it } from 'vitest'
import { joinSubBlocks, lzwDecode } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { noise } from '../../../test/pixel-source'
import { GifLzwEncoder } from './lzw'

function encodeAll(indices: Uint8Array, minCodeSize: number, pieces = 1) {
  const encoder = new GifLzwEncoder(minCodeSize)
  const chunks: Uint8Array[] = []
  const step = Math.ceil(indices.length / pieces)
  for (let start = 0; start < indices.length; start += step) {
    encoder.write(indices.subarray(start, start + step))
    chunks.push(encoder.drain())
  }
  chunks.push(encoder.finish())
  return concat(...chunks)
}

describe('GifLzwEncoder', () => {
  it('compacta e volta exatamente aos mesmos índices', () => {
    const indices = Uint8Array.from({ length: 100 }, (_, index) => index % 4)
    const encoded = encodeAll(indices, 2)
    expect(lzwDecode(joinSubBlocks(encoded), 2, indices.length)).toEqual(indices)
    expect(encoded.length).toBeLessThan(indices.length) // padrão repetido ocupa menos
  })

  it('aguenta sequências longas: códigos de até 12 bits e dicionário reiniciado', () => {
    const random = noise()
    const indices = Uint8Array.from({ length: 200_000 }, () => Math.floor(random() * 256))
    expect(lzwDecode(joinSubBlocks(encodeAll(indices, 8)), 8, indices.length)).toEqual(indices)
  })

  it('o resultado não depende de como os pixels chegam', () => {
    const random = noise(7)
    const indices = Uint8Array.from({ length: 30_000 }, () => Math.floor(random() * 16))
    expect(encodeAll(indices, 4, 7)).toEqual(encodeAll(indices, 4))
  })

  it('imagem de um pixel', () => {
    const indices = Uint8Array.of(1)
    expect(lzwDecode(joinSubBlocks(encodeAll(indices, 2)), 2, 1)).toEqual(indices)
  })
})
