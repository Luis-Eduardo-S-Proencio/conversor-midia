import { describe, expect, it } from 'vitest'
import { readColorTokens } from '../../styles/contrast'
import tokensCss from '../../styles/tokens.css?raw'
import { BRAND_COLORS, LOGO_BLADE_PATHS } from './logo-geometry'

describe('logotipo', () => {
  // Os ícones PNG são gerados fora do CSS; este teste impede que divirjam dos tokens.
  it('usa as mesmas cores dos tokens da marca', () => {
    const tokens = readColorTokens(tokensCss)
    expect(BRAND_COLORS.start).toBe(tokens['brand-start'])
    expect(BRAND_COLORS.end).toBe(tokens['brand-end'])
    expect(BRAND_COLORS.background).toBe(tokens['bg'])
  })

  it('tem três lâminas fechadas dentro da grade de 48', () => {
    expect(LOGO_BLADE_PATHS).toHaveLength(3)
    for (const path of LOGO_BLADE_PATHS) {
      expect(path).toMatch(/^M.*Z$/)
      const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      expect(numbers.every((value) => value >= 0 && value <= 48)).toBe(true)
    }
  })
})
