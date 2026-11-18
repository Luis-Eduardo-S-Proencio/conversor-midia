import { describe, expect, it } from 'vitest'
import { concat } from '../../../test/image-bytes'
import { noise, pixelSource, rgbaOf } from '../../../test/pixel-source'
import { encodeBmp } from './bmp'

describe('encodeBmp', () => {
  it('escreve o cabeçalho e as linhas de baixo para cima, em BGR, completando cada linha até 4 bytes', () => {
    // Linha de cima: vermelho, verde, azul. Linha de baixo: branco, preto, cinza.
    const { source } = pixelSource(3, 2, [
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255,
    ])
    const bytes = concat(...encodeBmp(source))
    const view = new DataView(bytes.buffer)

    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe('BM')
    expect(bytes.length).toBe(54 + 2 * 12)
    expect(view.getUint32(2, true)).toBe(bytes.length) // tamanho do arquivo
    expect(view.getUint32(10, true)).toBe(54) // início dos pixels
    expect(view.getUint32(14, true)).toBe(40) // BITMAPINFOHEADER
    expect([view.getInt32(18, true), view.getInt32(22, true)]).toEqual([3, 2])
    expect(view.getUint16(26, true)).toBe(1) // planos
    expect(view.getUint16(28, true)).toBe(24) // bits por pixel
    expect(view.getUint32(30, true)).toBe(0) // sem compressão
    expect(view.getUint32(34, true)).toBe(24)
    expect(Array.from(bytes.subarray(54))).toEqual([
      255, 255, 255, 0, 0, 0, 128, 128, 128, 0, 0, 0,
      0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0, 0,
    ])
  })

  it('o resultado não depende do tamanho das faixas lidas', () => {
    const random = noise()
    const rgba = rgbaOf(5, 7, () => [random() * 256, random() * 256, random() * 256, 255])
    const whole = concat(...encodeBmp(pixelSource(5, 7, rgba).source))
    const { source, reads } = pixelSource(5, 7, rgba)
    expect(concat(...encodeBmp(source, { bandPixels: 10 }))).toEqual(whole)
    expect(reads).toEqual([
      [5, 2],
      [3, 2],
      [1, 2],
      [0, 1],
    ])
  })
})
