import { describe, expect, it } from 'vitest'
import { blend, contrastRatio, readColorTokens } from './contrast'
import tokensCss from './tokens.css?raw'

const tokens = readColorTokens(tokensCss)

function color(name: string): string {
  const value = tokens[name]
  if (!value) throw new Error(`Token de cor inexistente: ${name}`)
  return value
}

/** --accent-soft: o acento a 10% sobre a superfície onde ele aparece. */
function accentSoft(over: string): string {
  return blend(color('accent'), color(over), 0.1)
}

// Texto exige 4,5:1 (WCAG 1.4.3); bordas, indicadores e foco exigem 3:1 (WCAG 1.4.11).
const TEXT = 4.5
const NON_TEXT = 3

const SURFACES = ['bg', 'surface-1', 'surface-2', 'surface-3'] as const

const pairs: Array<[foreground: string, background: string, minimum: number, use: string]> = [
  ...SURFACES.flatMap((surface): Array<[string, string, number, string]> => [
    ['fg', surface, TEXT, 'texto principal'],
    ['fg-muted', surface, TEXT, 'texto secundário'],
    ['fg-subtle', surface, TEXT, 'legenda'],
    ['accent', surface, TEXT, 'texto, ícone e link no acento'],
    ['danger', surface, TEXT, 'erro'],
    ['success', surface, TEXT, 'sucesso'],
    ['warning', surface, TEXT, 'aviso'],
    ['stroke', surface, NON_TEXT, 'contorno de campo'],
  ]),
  ['fg', 'surface-hover', TEXT, 'texto principal em hover'],
  ['fg-muted', 'surface-hover', TEXT, 'texto secundário em hover'],
  ['on-accent', 'accent-solid', TEXT, 'texto do botão principal'],
  ['on-accent', 'accent-solid-hover', TEXT, 'texto do botão principal em hover'],
  ['on-accent', 'accent-solid-active', TEXT, 'texto do botão principal pressionado'],
  ['accent', 'surface-hover', NON_TEXT, 'anel de foco no fundo mais claro'],
  ['accent', 'surface-hover', NON_TEXT, 'parte preenchida do slider e do progresso sobre a trilha'],
  ['fg-muted', 'success-subtle', TEXT, 'corpo de mensagem de sucesso'],
  ['fg-muted', 'warning-subtle', TEXT, 'corpo de aviso'],
  ['fg-muted', 'danger-subtle', TEXT, 'corpo de mensagem de erro'],
  ['success', 'success-subtle', TEXT, 'título de mensagem de sucesso'],
  ['warning', 'warning-subtle', TEXT, 'título de aviso'],
  ['danger', 'danger-subtle', TEXT, 'título de erro e botão de perigo'],
  ['fg', 'surface-hover', NON_TEXT, 'ícone de ferramenta no ladrilho dentro de painel'],
]

describe('contraste dos tokens de cor', () => {
  it.each(pairs)('%s sobre %s atinge %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrastRatio(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum)
  })

  it.each(SURFACES)('texto no acento sobre o fundo suave do acento (seleção) em %s', (surface) => {
    expect(contrastRatio(color('accent'), accentSoft(surface))).toBeGreaterThanOrEqual(TEXT)
    expect(contrastRatio(color('fg'), accentSoft(surface))).toBeGreaterThanOrEqual(TEXT)
  })

  it('mantém as cores definidas no redesenho', () => {
    expect(color('bg')).toBe('#000000')
    expect(color('accent')).toBe('#ff6699')
    expect(color('accent-solid')).toBe('#d62466')
    expect(color('brand-start')).toBe('#8b5cf6')
    expect(color('brand-end')).toBe('#ec4899')
  })

  it('não há cores de categoria nem variante de acento: um acento só', () => {
    expect(Object.keys(tokens).filter((name) => name.startsWith('cat-'))).toEqual([])
    expect(tokensCss).not.toContain('data-accent')
  })
})
