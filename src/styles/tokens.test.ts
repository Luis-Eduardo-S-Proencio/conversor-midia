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
  ['on-accent', 'accent-emphasis-end', TEXT, 'texto do botão principal (ponta rosa do degradê)'],
  ['on-accent', 'accent-hover-end', TEXT, 'texto do botão principal em hover (ponta rosa)'],
  ['on-accent', 'accent-active-end', TEXT, 'texto do botão principal pressionado (ponta rosa)'],
  ['fg', 'surface-overlay', TEXT, 'texto em opção marcada e menus'],
  ['fg-muted', 'surface-overlay', TEXT, 'texto secundário em menus'],
  ['brand-start', 'bg', TEXT, 'título em degradê (início do degradê)'],
  ['brand-end', 'bg', TEXT, 'título em degradê (fim do degradê)'],
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
  ['brand-start', 'border', NON_TEXT, 'barra de progresso e slider sobre a trilha (início)'],
  ['brand-end', 'border', NON_TEXT, 'barra de progresso e slider sobre a trilha (fim)'],
  ['accent-emphasis-end', 'surface', NON_TEXT, 'limite do botão principal (ponta rosa)'],
  ['accent-soft', 'surface-raised', NON_TEXT, 'anel de foco no fundo mais claro'],
  ['tool-size', 'surface-raised', NON_TEXT, 'ícone da ferramenta (size)'],
  ['tool-compress', 'surface-raised', NON_TEXT, 'ícone da ferramenta (compress)'],
  ['tool-audio', 'surface-raised', NON_TEXT, 'ícone da ferramenta (audio)'],
  ['tool-convert', 'surface-raised', NON_TEXT, 'ícone da ferramenta (convert)'],
  ['tool-gif', 'surface-raised', NON_TEXT, 'ícone da ferramenta (gif)'],
  ['tool-rotate', 'surface-raised', NON_TEXT, 'ícone da ferramenta (rotate)'],
  ['tool-crop', 'surface-raised', NON_TEXT, 'ícone da ferramenta (crop)'],
  ['tool-edit', 'surface-raised', NON_TEXT, 'ícone da ferramenta (edit)'],
]

describe('contraste dos tokens de cor', () => {
  it.each(pairs)('%s sobre %s atinge %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrastRatio(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum)
  })

  it('mantém as cores da marca exatamente como definidas na identidade', () => {
    expect(color('brand-start')).toBe('#8b5cf6')
    expect(color('brand-end')).toBe('#ec4899')
    expect(color('accent')).toBe('#a78bfa')
    expect(color('bg')).toBe('#0b0b0f')
  })
})
