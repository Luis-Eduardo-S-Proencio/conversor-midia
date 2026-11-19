import { describe, expect, it } from 'vitest'
import { digitsOnly } from './number-input'

describe('digitsOnly', () => {
  it('deixa só os algarismos do que foi digitado ou colado', () => {
    expect(digitsOnly('1920')).toBe('1920')
    expect(digitsOnly('1.920 px')).toBe('1920')
    expect(digitsOnly('abc')).toBe('')
  })
})
