import { describe, expect, it } from 'vitest'
import {
  FILTERS,
  IDENTITY,
  NO_ADJUSTMENTS,
  NO_COLOR,
  SPEEDS,
  applyColorMatrix,
  colorMatrix,
  compose,
  contrast,
  filterMatrix,
  sanitizeColor,
  sanitizeSpeed,
  saturate,
  speedLabel,
  svgMatrixValues,
  type ColorEffect,
  type ColorMatrix,
} from './effects'

/** Um pixel pela matriz, em 0–255. */
function paint(matrix: ColorMatrix, rgb: readonly [number, number, number]): number[] {
  const pixels = new Uint8ClampedArray([...rgb, 200])
  applyColorMatrix(pixels, matrix)
  return Array.from(pixels)
}

const color = (patch: Partial<ColorEffect>): ColorEffect => ({ ...NO_COLOR, ...patch })

describe('matriz de cor', () => {
  it('compor aplica a primeira e depois a segunda', () => {
    const doubled = compose(contrast(2), IDENTITY)
    expect(doubled).toEqual(contrast(2))
    // Contraste 2 leva 0,75 a 1 (cinza médio + o dobro da distância); depois a metade da saturação não mexe num cinza.
    const matrix = compose(contrast(2), saturate(0.5))
    expect(paint(matrix, [192, 192, 192]).slice(0, 3)).toEqual([255, 255, 255])
    expect(paint(matrix, [32, 32, 32]).slice(0, 3)).toEqual([0, 0, 0])
  })

  it('sem filtro nem ajustes, nada muda: o Worker não precisa mexer nos quadros', () => {
    expect(colorMatrix(NO_COLOR)).toBeNull()
    expect(colorMatrix(color({ filter: 'pb', intensity: 0 }))).toBeNull()
  })

  it('P&B deixa os três canais iguais, pela luminância', () => {
    const matrix = colorMatrix(color({ filter: 'pb' }))
    expect(matrix).not.toBeNull()
    const [r, g, b, alpha] = paint(matrix!, [255, 0, 0])
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(r).toBe(54) // 0,2126 × 255
    expect(alpha).toBe(200) // o alfa fica como estava
  })

  it('a força do filtro vai do vídeo como está (0) ao filtro inteiro (100)', () => {
    const half = filterMatrix('pb', 50)
    const [r, g] = paint(half, [255, 0, 0])
    expect(r).toBe(Math.round((255 + 54.2) / 2))
    expect(g).toBe(Math.round((0 + 54.2) / 2))
    const full = FILTERS.find((filter) => filter.id === 'pb')?.matrix ?? IDENTITY
    filterMatrix('pb', 100).forEach((value, index) => expect(value).toBeCloseTo(full[index]!, 10))
  })

  it('ajustes: brilho clareia, temperatura esquenta, saturação zero tira a cor', () => {
    const mid = [128, 128, 128] as const
    const brighter = colorMatrix(color({ adjust: { ...NO_ADJUSTMENTS, brightness: 50 } }))!
    expect(paint(brighter, mid)[0]).toBeGreaterThan(128)
    const warmer = colorMatrix(color({ adjust: { ...NO_ADJUSTMENTS, warmth: 100 } }))!
    const [r, , b] = paint(warmer, mid)
    expect(r).toBeGreaterThan(128)
    expect(b).toBeLessThan(128)
    const gray = colorMatrix(color({ adjust: { ...NO_ADJUSTMENTS, saturation: -100 } }))!
    const [red, green, blue] = paint(gray, [200, 40, 90])
    expect(new Set([red, green, blue]).size).toBe(1)
  })

  it('os ajustes vêm depois do filtro', () => {
    // Sépia e depois saturação zero: cinza. Ao contrário, sobraria a cor da sépia.
    const matrix = colorMatrix(color({ filter: 'sepia', adjust: { ...NO_ADJUSTMENTS, saturation: -100 } }))!
    const [r, g, b] = paint(matrix, [120, 180, 60])
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('todo filtro pronto muda a cor, e cada um tem um nome', () => {
    for (const filter of FILTERS.filter((item) => item.id !== 'original')) {
      expect(colorMatrix(color({ filter: filter.id })), filter.id).not.toBeNull()
      expect(filter.name.length).toBeGreaterThan(0)
    }
    expect(new Set(FILTERS.map((filter) => filter.id)).size).toBe(FILTERS.length)
  })

  it('o feColorMatrix recebe 20 valores, com o alfa intacto', () => {
    const values = svgMatrixValues(contrast(2)).split(' ').map(Number)
    expect(values).toHaveLength(20)
    expect(values.slice(0, 5)).toEqual([2, 0, 0, 0, -0.5])
    expect(values.slice(15)).toEqual([0, 0, 0, 1, 0])
  })
})

describe('validação no Worker', () => {
  it('filtro desconhecido não vale; força e ajustes fora do lugar voltam ao limite', () => {
    expect(sanitizeColor({ ...NO_COLOR, filter: 'arco-iris' as never })).toBeUndefined()
    expect(sanitizeColor(color({ filter: 'pb', intensity: 500 }))?.intensity).toBe(100)
    const clean = sanitizeColor(color({ adjust: { brightness: 900, contrast: Number.NaN, saturation: -400, warmth: 10 } }))
    expect(clean?.adjust).toEqual({ brightness: 100, contrast: 0, saturation: -100, warmth: 10 })
  })

  it('cor que não muda nada é descartada', () => {
    expect(sanitizeColor(NO_COLOR)).toBeUndefined()
    expect(sanitizeColor(undefined)).toBeUndefined()
  })

  it('só as velocidades oferecidas', () => {
    for (const speed of SPEEDS) expect(sanitizeSpeed(speed)).toBe(speed)
    expect(sanitizeSpeed(7)).toBe(1)
    expect(sanitizeSpeed('2')).toBe(1)
    expect(sanitizeSpeed(undefined)).toBe(1)
  })

  it('velocidade escrita como na interface', () => {
    expect(speedLabel(0.25)).toBe('0,25×')
    expect(speedLabel(2)).toBe('2×')
  })
})
