import { describe, expect, it } from 'vitest'
import { describeSizeChange, formatBytes, formatDimensions, formatFileMeta } from './format'

const MINUS = '−'

describe('formatBytes', () => {
  it('mostra bytes abaixo de 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('usa KB sem casas decimais', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(860_160)).toBe('840 KB')
  })

  it('usa MB e GB com uma casa decimal e vírgula', () => {
    expect(formatBytes(9_017_753)).toBe('8,6 MB')
    expect(formatBytes(1_610_612_736)).toBe('1,5 GB')
  })

  it('omite a casa decimal quando ela é zero', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB')
  })

  it('sobe de unidade quando o arredondamento chegaria a 1024', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1 MB')
  })

  it('rejeita valores que não são tamanhos', () => {
    expect(() => formatBytes(-1)).toThrow(RangeError)
    expect(() => formatBytes(Number.NaN)).toThrow(RangeError)
    expect(() => formatBytes(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('formatDimensions', () => {
  it('mostra largura × altura sem separador de milhar', () => {
    expect(formatDimensions(3024, 4032)).toBe('3024 × 4032')
  })

  it('rejeita dimensões não inteiras ou não positivas', () => {
    expect(() => formatDimensions(0, 10)).toThrow(RangeError)
    expect(() => formatDimensions(10, 1.5)).toThrow(RangeError)
  })
})

describe('formatFileMeta', () => {
  it('junta formato, dimensões e tamanho', () => {
    expect(formatFileMeta({ format: 'png', sizeBytes: 9_017_753, width: 3024, height: 4032 })).toBe(
      'PNG · 3024 × 4032 · 8,6 MB',
    )
  })

  it('omite as dimensões quando não são conhecidas', () => {
    expect(formatFileMeta({ format: 'webp', sizeBytes: 860_160 })).toBe('WEBP · 840 KB')
  })
})

describe('describeSizeChange', () => {
  it('descreve redução com sinal de menos tipográfico', () => {
    expect(describeSizeChange(9_017_753, 1_992_294)).toEqual({ kind: 'smaller', label: 'Redução', value: `${MINUS}78%` })
  })

  it('descreve aumento', () => {
    expect(describeSizeChange(1000, 1120)).toEqual({ kind: 'larger', label: 'Aumento', value: '+12%' })
  })

  it('trata variação menor que 0,5% como sem alteração', () => {
    expect(describeSizeChange(1000, 999)).toEqual({ kind: 'same', label: 'Sem alteração', value: '0%' })
  })

  it('rejeita tamanho original vazio ou inválido', () => {
    expect(() => describeSizeChange(0, 10)).toThrow(RangeError)
    expect(() => describeSizeChange(10, -1)).toThrow(RangeError)
  })
})
