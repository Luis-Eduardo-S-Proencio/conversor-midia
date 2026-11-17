import { describe, expect, it } from 'vitest'
import { contrastRatio, readColorTokens } from './contrast'

describe('contrastRatio', () => {
  it('dá 21:1 entre preto e branco e 1:1 entre cores iguais', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#3478c9', '#3478c9')).toBeCloseTo(1, 5)
  })

  it('não depende da ordem das cores', () => {
    expect(contrastRatio('#11151c', '#f4f6fa')).toBeCloseTo(contrastRatio('#f4f6fa', '#11151c'), 10)
  })

  it('reproduz o valor que motivou o ajuste do botão (4,49:1)', () => {
    expect(contrastRatio('#ffffff', '#3478c9')).toBeCloseTo(4.49, 2)
  })

  it('rejeita cores que não são hexadecimais de 6 dígitos', () => {
    expect(() => contrastRatio('#fff', '#000000')).toThrow(TypeError)
    expect(() => contrastRatio('azul', '#000000')).toThrow(TypeError)
  })
})

describe('readColorTokens', () => {
  it('lê os tokens --color-* e ignora o restante', () => {
    const css = '@theme { --color-*: initial; --color-bg: #11151C; --radius-sm: 6px; --color-fg:#f4f6fa; }'
    expect(readColorTokens(css)).toEqual({ bg: '#11151c', fg: '#f4f6fa' })
  })
})
