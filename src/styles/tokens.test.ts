import { describe, expect, it } from 'vitest'
import { contrastRatio, readColorTokens } from './contrast'
import tokensCss from './tokens.css?raw'

const tokens = readColorTokens(tokensCss)

function color(name: string): string {
  const value = tokens[name]
  if (!value) throw new Error(`Token de cor inexistente: ${name}`)
  return value
}

// Texto exige 4,5:1 (WCAG 1.4.3); bordas, indicadores e foco exigem 3:1 (WCAG 1.4.11).
const TEXT = 4.5
const NON_TEXT = 3

const pairs: Array<[foreground: string, background: string, minimum: number, use: string]> = [
  ['fg', 'bg', TEXT, 'texto principal'],
  ['fg', 'surface', TEXT, 'texto principal em painel'],
  ['fg', 'surface-raised', TEXT, 'texto principal em hover e menus'],
  ['fg', 'accent-subtle', TEXT, 'texto de item selecionado'],
  ['fg-muted', 'bg', TEXT, 'texto secundário'],
  ['fg-muted', 'surface', TEXT, 'texto secundário em painel'],
  ['fg-muted', 'surface-raised', TEXT, 'texto secundário em hover'],
  ['fg-muted', 'success-subtle', TEXT, 'corpo de mensagem de sucesso'],
  ['fg-muted', 'warning-subtle', TEXT, 'corpo de aviso'],
  ['fg-muted', 'danger-subtle', TEXT, 'corpo de mensagem de erro'],
  ['fg-subtle', 'bg', TEXT, 'legenda'],
  ['fg-subtle', 'surface', TEXT, 'legenda em painel'],
  ['fg-subtle', 'surface-raised', TEXT, 'legenda em hover'],
  ['accent-soft', 'bg', TEXT, 'link'],
  ['accent-soft', 'surface', TEXT, 'link em painel'],
  ['accent-soft', 'accent-subtle', TEXT, 'texto de selo e ícone selecionado'],
  ['on-accent', 'accent-emphasis', TEXT, 'texto do botão principal'],
  ['on-accent', 'accent-hover', TEXT, 'texto do botão principal em hover'],
  ['on-accent', 'accent-active', TEXT, 'texto do botão principal pressionado'],
  ['success', 'surface', TEXT, 'texto de sucesso'],
  ['success', 'success-subtle', TEXT, 'texto de sucesso em mensagem'],
  ['warning', 'surface', TEXT, 'texto de aviso'],
  ['warning', 'warning-subtle', TEXT, 'texto de aviso em mensagem'],
  ['danger', 'bg', TEXT, 'erro de campo'],
  ['danger', 'surface', TEXT, 'erro em painel'],
  ['danger', 'danger-subtle', TEXT, 'texto de erro em mensagem e botão de perigo'],
  ['border-strong', 'bg', NON_TEXT, 'borda de campo'],
  ['border-strong', 'surface', NON_TEXT, 'borda de campo em painel'],
  ['border-strong', 'surface-raised', NON_TEXT, 'borda de campo em hover'],
  ['accent-emphasis', 'surface', NON_TEXT, 'limite do botão principal'],
  ['accent', 'bg', NON_TEXT, 'indicador de navegação ativa'],
  ['accent', 'surface', NON_TEXT, 'indicador de seleção em painel'],
  ['accent', 'accent-subtle', NON_TEXT, 'borda do item selecionado'],
  ['accent-soft', 'border', NON_TEXT, 'barra de progresso sobre a trilha'],
  ['accent-soft', 'surface-raised', NON_TEXT, 'anel de foco no fundo mais claro'],
]

describe('contraste dos tokens de cor', () => {
  it.each(pairs)('%s sobre %s atinge %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrastRatio(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum)
  })

  it('mantém o azul da marca exatamente como definido na identidade', () => {
    expect(color('accent')).toBe('#3478c9')
    expect(color('accent-soft')).toBe('#82b7f5')
    expect(color('bg')).toBe('#11151c')
  })
})
