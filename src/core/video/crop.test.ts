import { describe, expect, it } from 'vitest'
import { encodableCrop, encodableSize, tooSmallToCrop } from './crop'

describe('recorte de vídeo', () => {
  it('largura e altura ímpares perdem 1 px; a posição não muda', () => {
    expect(encodableCrop({ x: 3, y: 5, width: 101, height: 57 })).toEqual({ x: 3, y: 5, width: 100, height: 56 })
    expect(encodableCrop({ x: 0, y: 0, width: 640, height: 360 })).toEqual({ x: 0, y: 0, width: 640, height: 360 })
  })

  it('o quadro inteiro também fica com medidas pares', () => {
    expect(encodableSize({ width: 1081, height: 1919 })).toEqual({ width: 1080, height: 1918 })
    expect(encodableSize({ width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 })
  })

  it('vídeo menor que a área mínima não pode ser recortado', () => {
    expect(tooSmallToCrop({ width: 15, height: 100 })).toBe(true)
    expect(tooSmallToCrop({ width: 100, height: 15 })).toBe(true)
    expect(tooSmallToCrop({ width: 16, height: 16 })).toBe(false)
  })
})
