import { describe, expect, it } from 'vitest'
import {
  TEXT_FONTS,
  TEXT_LIMITS,
  TEXT_STYLES,
  contrastOn,
  displayText,
  laneRows,
  layoutText,
  newText,
  sanitizeTexts,
  setTextEdge,
  textEdgeLimits,
  textsAt,
  textsInRanges,
  wrapText,
  type MeasureText,
  type VideoText,
} from './text'

/** Medidor de mentira: toda letra tem meia altura de largura (o espaçamento entre letras soma por letra). */
const measure: MeasureText = (text, font, tracking) => {
  const size = Number(/([\d.]+)px/.exec(font)?.[1] ?? 10)
  return text.length * (size * 0.5 + tracking)
}

const sample = (overrides: Partial<VideoText> = {}): VideoText => ({ ...newText(1, 0, 10, 'Olá'), ...overrides })

describe('quebra de linha', () => {
  const byChars = (line: string) => line.length

  it('respeita as quebras da pessoa e quebra entre palavras quando não cabe', () => {
    expect(wrapText('um dois tres', 7, byChars)).toEqual(['um dois', 'tres'])
    expect(wrapText('linha 1\nlinha 2', 100, byChars)).toEqual(['linha 1', 'linha 2'])
    expect(wrapText('a\n\nb', 100, byChars)).toEqual(['a', '', 'b'])
  })

  it('palavra maior que a linha é quebrada por letras', () => {
    expect(wrapText('abcdefghij', 4, byChars)).toEqual(['abcd', 'efgh', 'ij'])
  })
})

describe('medidas do texto no quadro', () => {
  it('centraliza o bloco no ponto escolhido, com a letra proporcional ao lado menor do quadro', () => {
    const layout = layoutText(sample({ text: 'Oi', x: 0.5, y: 0.25, size: 0.1 }), { width: 1920, height: 1080 }, measure)
    expect(layout.fontSize).toBeCloseTo(108)
    const [line] = layout.lines
    expect(line?.width).toBeCloseTo(108) // 2 letras de meia altura
    expect(line?.x).toBeCloseTo(960 - 54)
    expect(line?.y).toBeCloseTo(270)
    // O mesmo texto num quadro com a metade do tamanho fica com a metade das medidas.
    const half = layoutText(sample({ text: 'Oi', x: 0.5, y: 0.25, size: 0.1 }), { width: 960, height: 540 }, measure)
    expect(half.fontSize).toBeCloseTo(54)
    expect(half.bounds.x * 2).toBeCloseTo(layout.bounds.x)
  })

  it('alinha as linhas à esquerda ou à direita dentro do bloco', () => {
    const frame = { width: 1000, height: 1000 }
    const left = layoutText(sample({ text: 'aaaa\naa', align: 'left', size: 0.1 }), frame, measure)
    expect(left.lines[0]?.x).toBe(left.lines[1]?.x)
    const right = layoutText(sample({ text: 'aaaa\naa', align: 'right', size: 0.1 }), frame, measure)
    const end = (line: { x: number; width: number } | undefined) => (line ? line.x + line.width : 0)
    expect(end(right.lines[0])).toBeCloseTo(end(right.lines[1]))
  })

  it('texto longo quebra para caber em 90% da largura do quadro', () => {
    const layout = layoutText(sample({ text: 'palavra '.repeat(30).trim(), size: 0.1 }), { width: 1000, height: 1000 }, measure)
    expect(layout.lines.length).toBeGreaterThan(1)
    for (const line of layout.lines) expect(line.width).toBeLessThanOrEqual(900)
  })

  it('o fundo (tarja, bolha) entra no retângulo de toque', () => {
    const frame = { width: 1000, height: 1000 }
    const plain = layoutText(sample({ style: 'classico', size: 0.1 }), frame, measure)
    const bubble = layoutText(sample({ style: 'bolha', size: 0.1 }), frame, measure)
    expect(bubble.bounds.width).toBeGreaterThan(plain.bounds.width)
    expect(bubble.bounds.height).toBeGreaterThan(plain.bounds.height)
  })

  it('o tamanho fica entre o menor e o maior permitidos; estilos em caixa-alta mudam o texto mostrado', () => {
    expect(layoutText(sample({ size: 9 }), { width: 100, height: 100 }, measure).fontSize).toBeCloseTo(TEXT_LIMITS.maxSize * 100)
    expect(displayText(sample({ text: 'férias', style: 'titulo' }))).toBe('FÉRIAS')
    expect(displayText(sample({ text: 'férias', style: 'classico' }))).toBe('férias')
  })
})

describe('estilos e cores', () => {
  it('há 12 estilos com nomes distintos', () => {
    expect(TEXT_STYLES).toHaveLength(12)
    expect(new Set(TEXT_STYLES.map((style) => style.name)).size).toBe(12)
  })

  it('sobre cor clara, letra quase preta; sobre cor escura, branca', () => {
    expect(contrastOn('#ffffff')).toBe('#111111')
    expect(contrastOn('#ffd60a')).toBe('#111111')
    expect(contrastOn('#111111')).toBe('#ffffff')
    expect(contrastOn('#0a84ff')).toBe('#ffffff')
    expect(contrastOn('inválida')).toBe('#ffffff')
  })
})

describe('tempo dos textos', () => {
  it('um texto novo fica 3 s a partir do ponto, sem passar do fim do vídeo', () => {
    expect(newText(1, 2, 10)).toMatchObject({ start: 2, end: 5, x: 0.5, y: 0.5, style: 'classico', color: '#ffffff' })
    expect(newText(1, 9, 10)).toMatchObject({ start: 9, end: 10 })
    expect(newText(1, 10, 10).start).toBeCloseTo(9.7)
  })

  it('aparece do começo (incluso) ao fim (excluso), os mais novos por cima', () => {
    const texts = [sample({ id: 1, start: 0, end: 2 }), sample({ id: 2, start: 1, end: 3 })]
    expect(textsAt(texts, 0).map((text) => text.id)).toEqual([1])
    expect(textsAt(texts, 1.5).map((text) => text.id)).toEqual([1, 2])
    expect(textsAt(texts, 2).map((text) => text.id)).toEqual([2])
    expect(textsAt(texts, 3)).toEqual([])
  })

  it('as pontas nunca deixam o texto com menos de 0,3 s nem fora do vídeo', () => {
    const text = sample({ start: 2, end: 5 })
    expect(setTextEdge(text, 'start', 4.9, 10).start).toBeCloseTo(4.7)
    expect(setTextEdge(text, 'start', -1, 10).start).toBe(0)
    expect(setTextEdge(text, 'end', 2.1, 10).end).toBeCloseTo(2.3)
    expect(setTextEdge(text, 'end', 99, 10).end).toBe(10)
    expect(textEdgeLimits(text, 'start', 10)).toEqual({ min: 0, max: 4.7 })
  })

  it('só vão para o arquivo os textos com letras que aparecem numa parte que fica', () => {
    const texts = [sample({ id: 1, start: 0, end: 1 }), sample({ id: 2, start: 4, end: 6 }), sample({ id: 3, start: 5, end: 6, text: '  ' })]
    expect(textsInRanges(texts, [{ start: 3, end: 8 }]).map((text) => text.id)).toEqual([2])
    expect(textsInRanges(texts, [{ start: 0.5, end: 2 }]).map((text) => text.id)).toEqual([1])
  })

  it('na faixa de textos, um texto que se sobrepõe ao anterior desce uma linha', () => {
    expect(laneRows([{ start: 0, end: 3 }, { start: 1, end: 2 }, { start: 3, end: 4 }, { start: 2.5, end: 5 }])).toEqual([0, 1, 0, 1])
  })
})

describe('o que o Worker aceita', () => {
  it('descarta estilo, cor ou números inválidos e traz o resto para os limites', () => {
    const valid = sample({ id: 7, x: 2, y: -1, size: 1, start: -2, end: 20, text: 'x'.repeat(500) })
    const result = sanitizeTexts(
      [
        valid,
        sample({ style: 'nenhum' as VideoText['style'] }),
        sample({ color: 'red' }),
        sample({ x: Number.NaN }),
        sample({ text: '   ' }),
        sample({ start: 5, end: 5 }),
      ],
      10,
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 7, x: 1, y: 0, size: TEXT_LIMITS.maxSize, start: 0, end: 10 })
    expect(result[0]?.text).toHaveLength(TEXT_LIMITS.maxLength)
  })

  it('no máximo 20 textos', () => {
    const many = Array.from({ length: 30 }, (_, id) => sample({ id }))
    expect(sanitizeTexts(many, 10)).toHaveLength(TEXT_LIMITS.maxTexts)
  })
})

describe('fontes', () => {
  it('cada fonte entra no canvas com o próprio peso; a do app, com o peso do estilo', () => {
    const frame = { width: 1000, height: 1000 }
    expect(layoutText(sample({ style: 'titulo' }), frame, measure).font).toMatch(/^900 .*"Inter Variable"/)
    expect(layoutText(sample({ style: 'titulo', font: 'condensada' }), frame, measure).font).toMatch(/^400 .*"Bebas Neue"/)
    expect(layoutText(sample({ font: 'cursiva' }), frame, measure).font).toMatch(/^700 .*"Dancing Script", cursive$/)
  })

  it('há 7 fontes com nomes distintos, e fonte desconhecida não chega ao Worker', () => {
    expect(TEXT_FONTS).toHaveLength(7)
    expect(new Set(TEXT_FONTS.map((font) => font.name)).size).toBe(7)
    expect(sanitizeTexts([sample({ font: 'comic' as VideoText['font'] })], 10)).toEqual([])
    expect(sanitizeTexts([sample({ font: 'caneta' })], 10)[0]?.font).toBe('caneta')
  })
})
