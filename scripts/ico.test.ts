import { describe, expect, it } from 'vitest'
import { pngToIco } from './ico.ts'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const fakePng = new Uint8Array([...PNG_SIGNATURE, 1, 2, 3, 4])

describe('pngToIco', () => {
  it('escreve cabeçalho ICO de uma imagem apontando para o PNG', () => {
    const ico = pngToIco(fakePng, 32)
    const view = new DataView(ico.buffer)

    expect(view.getUint16(0, true)).toBe(0) // reservado
    expect(view.getUint16(2, true)).toBe(1) // tipo ícone
    expect(view.getUint16(4, true)).toBe(1) // uma imagem
    expect(ico[6]).toBe(32) // largura
    expect(ico[7]).toBe(32) // altura
    expect(view.getUint16(12, true)).toBe(32) // bits por pixel
    expect(view.getUint32(14, true)).toBe(fakePng.byteLength)
    expect(view.getUint32(18, true)).toBe(22) // deslocamento dos dados
    expect([...ico.subarray(22)]).toEqual([...fakePng])
  })

  it('representa 256 px como zero, conforme o formato', () => {
    const ico = pngToIco(fakePng, 256)
    expect(ico[6]).toBe(0)
    expect(ico[7]).toBe(0)
  })

  it('rejeita conteúdo que não é PNG e tamanhos fora do formato', () => {
    expect(() => pngToIco(new Uint8Array([1, 2, 3]), 32)).toThrow(TypeError)
    expect(() => pngToIco(fakePng, 0)).toThrow(RangeError)
    expect(() => pngToIco(fakePng, 257)).toThrow(RangeError)
  })
})
