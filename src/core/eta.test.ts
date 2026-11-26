import { describe, expect, it } from 'vitest'
import { formatRemaining, remainingSeconds } from './eta'

describe('remainingSeconds', () => {
  it('pelo ritmo até agora: 25% em 10 s faltam 30 s', () => {
    expect(remainingSeconds(0.25, 10_000)).toBeCloseTo(30)
  })

  it('não promete nada no começo, nem depois de pronto', () => {
    expect(remainingSeconds(0.01, 10_000)).toBeNull() // quase nada feito
    expect(remainingSeconds(0.5, 800)).toBeNull() // cedo demais
    expect(remainingSeconds(1, 10_000)).toBeNull()
    expect(remainingSeconds(Number.NaN, 10_000)).toBeNull()
  })
})

describe('formatRemaining', () => {
  it('arredonda como estimativa', () => {
    expect(formatRemaining(4)).toBe('quase pronto')
    expect(formatRemaining(27)).toBe('cerca de 25 s')
    expect(formatRemaining(95)).toBe('cerca de 2 min')
    expect(formatRemaining(3600)).toBe('cerca de 1 h')
    expect(formatRemaining(5400)).toBe('cerca de 1 h 30 min')
  })
})
