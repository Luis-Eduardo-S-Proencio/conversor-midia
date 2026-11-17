import { describe, expect, it } from 'vitest'
import { readColorTokens } from '../../styles/contrast'
import tokensCss from '../../styles/tokens.css?raw'
import { BRAND_COLORS } from './logo-geometry'

describe('cores do logotipo', () => {
  // Os ícones PNG são gerados fora do CSS; este teste impede que divirjam dos tokens.
  it('são as mesmas dos tokens da marca', () => {
    const tokens = readColorTokens(tokensCss)
    expect(BRAND_COLORS.frame).toBe(tokens['accent'])
    expect(BRAND_COLORS.piece).toBe(tokens['accent-soft'])
    expect(BRAND_COLORS.background).toBe(tokens['bg'])
  })
})
