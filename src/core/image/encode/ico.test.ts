import { describe, expect, it } from 'vitest'
import { readIco } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { icoHeader, icoSizes } from './ico'

describe('icoSizes', () => {
  it('tamanhos padrão de ícone até o lado maior da imagem, sem ampliar', () => {
    expect(icoSizes(64, 64)).toEqual([16, 32, 48])
    expect(icoSizes(1920, 1080)).toEqual([16, 32, 48, 256])
    expect(icoSizes(300, 40)).toEqual([16, 32, 48, 256])
  })

  it('imagem menor que 16 px ainda gera o ícone de 16', () => {
    expect(icoSizes(10, 10)).toEqual([16])
  })
})

describe('icoHeader', () => {
  it('lista cada tamanho com 32 bits de cor e a posição da imagem PNG no arquivo', () => {
    const small = Uint8Array.from({ length: 100 }, (_, index) => index)
    const large = Uint8Array.from({ length: 300 }, (_, index) => 255 - (index % 256))
    const header = icoHeader([
      { size: 16, byteLength: small.length },
      { size: 256, byteLength: large.length },
    ])
    expect(header).toHaveLength(6 + 2 * 16)

    const entries = readIco(concat(header, small, large))
    expect(entries.map(({ width, height, planes, bitCount }) => [width, height, planes, bitCount])).toEqual([
      [16, 16, 1, 32],
      [256, 256, 1, 32], // 256 é gravado como 0
    ])
    expect(entries[0]?.data).toEqual(small)
    expect(entries[1]?.data).toEqual(large)
  })
})
