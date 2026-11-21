import { describe, expect, it } from 'vitest'
import { formatDuration, formatTime, parseTime } from './time'

describe('formatTime', () => {
  it('minutos:segundos,centésimos, com horas só quando houver', () => {
    expect(formatTime(0)).toBe('0:00,00')
    expect(formatTime(4.6)).toBe('0:04,60')
    expect(formatTime(65.3)).toBe('1:05,30')
    expect(formatTime(750.05)).toBe('12:30,05')
    expect(formatTime(3723.45)).toBe('1:02:03,45')
  })

  it('arredonda para o centésimo mais próximo, sem "0:60"', () => {
    expect(formatTime(4.596)).toBe('0:04,60')
    expect(formatTime(4.594)).toBe('0:04,59')
    expect(formatTime(59.999)).toBe('1:00,00')
    expect(formatTime(1 / 3)).toBe('0:00,33')
  })

  it('recusa tempo negativo ou inválido', () => {
    expect(() => formatTime(-1)).toThrow(RangeError)
    expect(() => formatTime(Number.NaN)).toThrow(RangeError)
    expect(() => formatTime(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('formatDuration', () => {
  it('em segundos inteiros, como nos players', () => {
    expect(formatDuration(4.6)).toBe('0:04')
    expect(formatDuration(65.99)).toBe('1:05')
    expect(formatDuration(3723)).toBe('1:02:03')
  })
})

describe('parseTime', () => {
  it('lê relógio com minutos, com e sem horas e centésimos', () => {
    expect(parseTime('1:05,30')).toBeCloseTo(65.3)
    expect(parseTime('1:05.30')).toBeCloseTo(65.3)
    expect(parseTime('0:04,6')).toBeCloseTo(4.6)
    expect(parseTime('12:30')).toBe(750)
    expect(parseTime('1:02:03,45')).toBeCloseTo(3723.45)
    expect(parseTime('90:00')).toBe(5400)
    expect(parseTime('1:5')).toBe(65)
  })

  it('lê segundos soltos e tolera espaços em volta', () => {
    expect(parseTime('75')).toBe(75)
    expect(parseTime('4,5')).toBe(4.5)
    expect(parseTime(' 0:10,25 ')).toBeCloseTo(10.25)
    expect(parseTime('1,234')).toBeCloseTo(1.234)
  })

  it('o que formatTime escreve, parseTime lê de volta', () => {
    for (const seconds of [0, 4.6, 65.3, 750.05, 3723.45]) expect(parseTime(formatTime(seconds))).toBeCloseTo(seconds)
  })

  it('recusa o que não é tempo', () => {
    for (const text of ['', ' ', 'abc', '-1', '1:60', '1:60:00', '1:2:3:4', '1,2,3', '1:05,', ':05', '1:05,1234', '1 05', '١:٠٥']) {
      expect(parseTime(text), text).toBeNull()
    }
  })
})
