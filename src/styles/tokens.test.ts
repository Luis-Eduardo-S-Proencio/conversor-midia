import { describe, expect, it } from 'vitest'
import { blend, contrastRatio, readColorTokens } from './contrast'
import tokensCss from './tokens.css?raw'

const tokens = readColorTokens(tokensCss)
// A variante violeta redefine só o acento, num bloco próprio depois do tema.
const violet = readColorTokens(tokensCss.slice(tokensCss.lastIndexOf('[data-accent="violet"]')))

function color(name: string, source: Record<string, string> = tokens): string {
  const value = source[name]
  if (!value) throw new Error(`Token de cor inexistente: ${name}`)
  return value
}

/** --accent-soft: o acento a 12% sobre a superfície onde ele aparece. */
function accentSoft(over: string, source: Record<string, string> = tokens): string {
  return blend(color('accent', source), color(over), 0.12)
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
  ['cat-edit', 'surface-1', NON_TEXT, 'ícone da categoria editar'],
  ['cat-convert', 'surface-1', NON_TEXT, 'ícone da categoria converter'],
  ['cat-compress', 'surface-1', NON_TEXT, 'ícone da categoria comprimir'],
  ['cat-audio', 'surface-1', NON_TEXT, 'ícone da categoria áudio'],
]

describe('contraste dos tokens de cor', () => {
  it.each(pairs)('%s sobre %s atinge %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrastRatio(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum)
  })

  it.each(SURFACES)('texto no acento sobre o fundo suave do acento (seleção) em %s', (surface) => {
    expect(contrastRatio(color('accent'), accentSoft(surface))).toBeGreaterThanOrEqual(TEXT)
    expect(contrastRatio(color('fg'), accentSoft(surface))).toBeGreaterThanOrEqual(TEXT)
  })

  it('o ícone de categoria continua legível sobre o próprio ladrilho (12%)', () => {
    for (const category of ['cat-edit', 'cat-convert', 'cat-compress', 'cat-audio']) {
      const tile = blend(color(category), color('surface-1'), 0.12)
      expect(contrastRatio(color(category), tile)).toBeGreaterThanOrEqual(NON_TEXT)
    }
  })

  it('mantém as cores definidas no guia de redesenho', () => {
    expect(color('bg')).toBe('#0a0a0d')
    expect(color('accent')).toBe('#ff4f8b')
    expect(color('accent-solid')).toBe('#d62466')
    expect(color('brand-start')).toBe('#8b5cf6')
    expect(color('brand-end')).toBe('#ec4899')
  })
})

describe('variante violeta do acento', () => {
  it('tem os valores do guia', () => {
    expect(color('accent', violet)).toBe('#9d8cff')
    expect(color('accent-solid', violet)).toBe('#6d4aff')
  })

  it.each(SURFACES)('o acento violeta é legível sobre %s', (surface) => {
    expect(contrastRatio(color('accent', violet), color(surface))).toBeGreaterThanOrEqual(TEXT)
    expect(contrastRatio(color('accent', violet), accentSoft(surface, violet))).toBeGreaterThanOrEqual(TEXT)
  })

  it.each(['accent-solid', 'accent-solid-hover', 'accent-solid-active'])('texto branco sobre %s violeta', (name) => {
    expect(contrastRatio(color('on-accent'), color(name, violet))).toBeGreaterThanOrEqual(TEXT)
  })
})
