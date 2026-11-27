/**
 * Texto sobre o vídeo (Editar vídeo): os estilos, as cores, a quebra de linha e o desenho de cada texto.
 * A prévia (canvas sobre o player) e o Worker (cada quadro do arquivo) chamam as mesmas funções, com medidas
 * relativas ao quadro: o que a pessoa vê é o que sai. Sem DOM: o desenho recebe só o que precisa do canvas.
 */

export type TextAlign = 'left' | 'center' | 'right'

export type TextStyleId =
  | 'classico'
  | 'contorno'
  | 'tarja'
  | 'legenda'
  | 'neon'
  | 'marca-texto'
  | 'titulo'
  | 'elegante'
  | 'retro'
  | 'bolha'
  | 'inclinado'
  | 'vazado'

export interface VideoText {
  id: number
  text: string
  style: TextStyleId
  /** A fonte; sem ela, a do app. */
  font?: TextFontId
  /** A cor principal do estilo (das letras, da tarja ou do brilho), em #rrggbb. */
  color: string
  /** Tamanho da letra, em fração do lado menor do quadro. */
  size: number
  align: TextAlign
  /** Centro do bloco de texto, em frações do quadro. */
  x: number
  y: number
  /** Quando aparece e some, em segundos do vídeo original. */
  start: number
  end: number
}

export const TEXT_LIMITS = {
  maxLength: 120,
  maxTexts: 20,
  minSize: 0.035,
  maxSize: 0.16,
  defaultSize: 0.07,
  /** Menor tempo na tela, em segundos. */
  minDuration: 0.3,
  /** Tempo na tela de um texto novo, em segundos. */
  defaultDuration: 3,
} as const

/** A fonte do app; no Worker, a mesma, carregada do próprio site. Sem ela, a do sistema. */
export const TEXT_FONT_FAMILY = '"Inter Variable", "Inter", system-ui, sans-serif'

export type TextFontId = 'inter' | 'cursiva' | 'classica' | 'maquina' | 'redonda' | 'condensada' | 'caneta'

export interface TextFont {
  id: TextFontId
  name: string
  /** Nome da família registrada (FontFace) e a lista com a reserva, para o canvas. */
  face: string
  family: string
  /** Peso do único arquivo da fonte; a do app é variável e usa o peso de cada estilo. */
  weight?: number
}

/** Fontes para os textos, todas de licença livre (OFL), hospedadas no próprio site e carregadas só quando escolhidas. */
export const TEXT_FONTS: readonly TextFont[] = [
  { id: 'inter', name: 'Padrão', face: 'Inter Variable', family: TEXT_FONT_FAMILY },
  { id: 'cursiva', name: 'Cursiva', face: 'Dancing Script', family: '"Dancing Script", cursive', weight: 700 },
  { id: 'classica', name: 'Clássica', face: 'Playfair Display', family: '"Playfair Display", Georgia, serif', weight: 700 },
  { id: 'maquina', name: 'Máquina', face: 'Courier Prime', family: '"Courier Prime", "Courier New", monospace', weight: 700 },
  { id: 'redonda', name: 'Redonda', face: 'Fredoka', family: '"Fredoka", system-ui, sans-serif', weight: 600 },
  { id: 'condensada', name: 'Estreita', face: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif', weight: 400 },
  { id: 'caneta', name: 'Caneta', face: 'Caveat', family: '"Caveat", cursive', weight: 700 },
]

export function fontOf(id: TextFontId | undefined): TextFont {
  return TEXT_FONTS.find((font) => font.id === id) ?? (TEXT_FONTS[0] as TextFont)
}

export const TEXT_COLORS: readonly { value: string; name: string }[] = [
  { value: '#ffffff', name: 'Branco' },
  { value: '#111111', name: 'Preto' },
  { value: '#ffd60a', name: 'Amarelo' },
  { value: '#ff9f0a', name: 'Laranja' },
  { value: '#ff453a', name: 'Vermelho' },
  { value: '#ff6699', name: 'Rosa' },
  { value: '#bf5af2', name: 'Lilás' },
  { value: '#0a84ff', name: 'Azul' },
  { value: '#32d74b', name: 'Verde' },
]

/** Onde a cor de um estilo vai: a escolhida, a que contrasta com ela, ou uma fixa. */
type Paint = 'color' | 'contrast' | `#${string}` | `rgba(${string})`

interface StyleSpec {
  id: TextStyleId
  name: string
  weight: number
  /** Inclinação sintética (a fonte do app não tem itálico). */
  slant?: number
  uppercase?: boolean
  /** Espaço entre letras, em fração do tamanho da letra. */
  tracking: number
  lineHeight: number
  /** Letras; `null` = só o contorno (vazado). */
  fill: Paint | null
  /** Contorno das letras, por baixo do preenchimento; espessura em fração do tamanho. */
  stroke?: { paint: Paint; width: number }
  /** Brilho em volta das letras (neon): uma passada por desfoque, do maior para o menor. */
  glow?: { paint: Paint; blurs: readonly number[] }
  /** Sombra: deslocamento e desfoque em fração do tamanho (desfoque 0 = sombra dura). */
  shadow?: { paint: Paint; x: number; y: number; blur: number }
  /**
   * Fundo: `line` atrás de cada linha; `block` em volta de todas (bolha); `highlight` só na metade de baixo
   * de cada linha (marca-texto). Medidas em fração do tamanho; raio 0,5 = pílula.
   */
  box?: { paint: Paint; mode: 'line' | 'block' | 'highlight'; padX: number; padY: number; radius: number }
}

const SOFT_SHADOW = { paint: 'rgba(0, 0, 0, 0.55)', x: 0, y: 0.04, blur: 0.14 } as const

export const TEXT_STYLES: readonly StyleSpec[] = [
  { id: 'classico', name: 'Clássico', weight: 700, tracking: 0, lineHeight: 1.2, fill: 'color', shadow: SOFT_SHADOW },
  { id: 'contorno', name: 'Contorno', weight: 850, tracking: 0, lineHeight: 1.2, fill: 'color', stroke: { paint: 'contrast', width: 0.16 } },
  {
    id: 'tarja',
    name: 'Tarja',
    weight: 700,
    tracking: 0,
    lineHeight: 1.25,
    fill: 'contrast',
    box: { paint: 'color', mode: 'line', padX: 0.35, padY: 0.12, radius: 0.18 },
  },
  {
    id: 'legenda',
    name: 'Legenda',
    weight: 600,
    tracking: 0,
    lineHeight: 1.25,
    fill: 'color',
    box: { paint: 'rgba(0, 0, 0, 0.62)', mode: 'line', padX: 0.3, padY: 0.08, radius: 0.12 },
  },
  { id: 'neon', name: 'Neon', weight: 600, tracking: 0.02, lineHeight: 1.25, fill: '#ffffff', glow: { paint: 'color', blurs: [0.9, 0.45, 0.18] } },
  {
    id: 'marca-texto',
    name: 'Marca-texto',
    weight: 800,
    tracking: 0,
    lineHeight: 1.3,
    fill: '#111111',
    box: { paint: 'color', mode: 'highlight', padX: 0.18, padY: 0, radius: 0.08 },
  },
  { id: 'titulo', name: 'Título', weight: 900, uppercase: true, tracking: -0.02, lineHeight: 1.05, fill: 'color', shadow: SOFT_SHADOW },
  { id: 'elegante', name: 'Elegante', weight: 300, uppercase: true, tracking: 0.22, lineHeight: 1.35, fill: 'color', shadow: { ...SOFT_SHADOW, blur: 0.2 } },
  { id: 'retro', name: 'Retrô', weight: 900, tracking: 0.01, lineHeight: 1.15, fill: 'color', shadow: { paint: 'contrast', x: 0.07, y: 0.07, blur: 0 } },
  {
    id: 'bolha',
    name: 'Bolha',
    weight: 700,
    tracking: 0,
    lineHeight: 1.25,
    fill: 'contrast',
    box: { paint: 'color', mode: 'block', padX: 0.7, padY: 0.45, radius: 0.5 },
  },
  { id: 'inclinado', name: 'Inclinado', weight: 800, slant: 0.2, tracking: 0, lineHeight: 1.2, fill: 'color', shadow: SOFT_SHADOW },
  { id: 'vazado', name: 'Vazado', weight: 900, uppercase: true, tracking: 0.03, lineHeight: 1.1, fill: null, stroke: { paint: 'color', width: 0.05 } },
]

export function styleOf(id: TextStyleId): StyleSpec {
  return TEXT_STYLES.find((style) => style.id === id) ?? (TEXT_STYLES[0] as StyleSpec)
}

/** Cor legível sobre a escolhida: quase preto nas claras, branco nas escuras. */
export function contrastOn(color: string): string {
  const value = /^#([0-9a-f]{6})$/i.exec(color)?.[1]
  if (!value) return '#ffffff'
  const channel = (offset: number) => {
    const linear = parseInt(value.slice(offset, offset + 2), 16) / 255
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.36 ? '#111111' : '#ffffff'
}

function paintOf(paint: Paint, color: string): string {
  if (paint === 'color') return color
  if (paint === 'contrast') return contrastOn(color)
  return paint
}

/* Medidas e quebra de linha */

export interface Size {
  width: number
  height: number
}

/** Largura de um texto já com a fonte e o espaçamento aplicados (o canvas da prévia ou do Worker mede). */
export type MeasureText = (text: string, font: string, tracking: number) => number

export interface TextLine {
  text: string
  width: number
  /** Ponta esquerda da linha e o meio dela, em pixels do quadro. */
  x: number
  y: number
}

export interface TextLayout {
  font: string
  fontSize: number
  tracking: number
  lineHeight: number
  lines: TextLine[]
  /** O retângulo do bloco (com o fundo, quando há), em pixels do quadro: onde a pessoa toca para mover. */
  bounds: { x: number; y: number; width: number; height: number }
}

/** A fonte do canvas: o peso do estilo na fonte do app; nas outras, o peso do arquivo dela. */
export function fontFor(style: StyleSpec, fontSize: number, font: TextFont = fontOf('inter')): string {
  return `${font.weight ?? style.weight} ${fontSize.toFixed(2)}px ${font.family}`
}

/** Quebra o texto em linhas que cabem na largura: pelas quebras da pessoa e, depois, entre palavras. */
export function wrapText(text: string, maxWidth: number, measure: (line: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (!current || measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      lines.push(current)
      current = word
    }
    // Palavra maior que a linha inteira: quebra por letras.
    for (const piece of breakLongWord(current, maxWidth, measure)) lines.push(piece)
  }
  return lines
}

function breakLongWord(line: string, maxWidth: number, measure: (line: string) => number): string[] {
  if (measure(line) <= maxWidth) return [line]
  const pieces: string[] = []
  let current = ''
  for (const char of line) {
    if (current && measure(current + char) > maxWidth) {
      pieces.push(current)
      current = char
    } else current += char
  }
  if (current) pieces.push(current)
  return pieces
}

export function displayText(text: VideoText): string {
  const style = styleOf(text.style)
  return style.uppercase ? text.text.toLocaleUpperCase('pt-BR') : text.text
}

/** Onde cada linha fica no quadro e o retângulo do bloco. Medidas em pixels do quadro dado. */
export function layoutText(
  text: VideoText,
  frame: Size,
  measure: MeasureText,
  { fontSize: fixedSize }: { fontSize?: number } = {},
): TextLayout {
  const style = styleOf(text.style)
  const short = Math.min(frame.width, frame.height)
  // `fontSize` fixo só para as miniaturas dos estilos, maiores que o limite de um texto no vídeo.
  const fontSize = fixedSize ?? Math.max(4, clamp(text.size, TEXT_LIMITS.minSize, TEXT_LIMITS.maxSize) * short)
  const font = fontFor(style, fontSize, fontOf(text.font))
  const tracking = style.tracking * fontSize
  const lineHeight = style.lineHeight * fontSize
  const padX = (style.box?.padX ?? 0) * fontSize
  const padY = (style.box?.padY ?? 0) * fontSize
  const maxWidth = Math.max(fontSize, frame.width * 0.9 - 2 * padX)
  const content = displayText(text).trim() || ' '
  const wrapped = wrapText(content, maxWidth, (line) => measure(line, font, tracking))
  const widths = wrapped.map((line) => measure(line, font, tracking))
  const blockWidth = Math.max(...widths, fontSize * 0.5)
  const blockHeight = wrapped.length * lineHeight
  const centerX = text.x * frame.width
  const centerY = text.y * frame.height
  const top = centerY - blockHeight / 2
  const lines = wrapped.map((line, index) => {
    const width = widths[index] ?? 0
    const left = text.align === 'left' ? centerX - blockWidth / 2 : text.align === 'right' ? centerX + blockWidth / 2 - width : centerX - width / 2
    return { text: line, width, x: left, y: top + (index + 0.5) * lineHeight }
  })
  const glowPad = style.glow ? fontSize * 0.25 : 0
  return {
    font,
    fontSize,
    tracking,
    lineHeight,
    lines,
    bounds: {
      x: centerX - blockWidth / 2 - padX - glowPad,
      y: top - padY - glowPad,
      width: blockWidth + 2 * (padX + glowPad),
      height: blockHeight + 2 * (padY + glowPad),
    },
  }
}

/* Desenho */

/** O pedaço do canvas 2D que o desenho usa: o mesmo no `<canvas>` da prévia e no `OffscreenCanvas` do Worker. */
export interface TextCanvas {
  font: string
  fillStyle: unknown
  strokeStyle: unknown
  lineWidth: number
  lineJoin: 'bevel' | 'miter' | 'round'
  textAlign: 'center' | 'end' | 'left' | 'right' | 'start'
  textBaseline: 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top'
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  save(): void
  restore(): void
  translate(x: number, y: number): void
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void
  beginPath(): void
  roundRect(x: number, y: number, width: number, height: number, radius: number): void
  fill(): void
  fillText(text: string, x: number, y: number): void
  strokeText(text: string, x: number, y: number): void
  measureText(text: string): { width: number }
}

function setTracking(context: TextCanvas, tracking: number) {
  // Onde o canvas não tem espaçamento entre letras, fica sem: a prévia e o arquivo, no mesmo navegador, ficam iguais.
  if ('letterSpacing' in context) (context as TextCanvas & { letterSpacing: string }).letterSpacing = `${tracking.toFixed(2)}px`
}

/** Medidor que usa o próprio canvas (com a fonte e o espaçamento de cada estilo). */
export function canvasMeasure(context: TextCanvas): MeasureText {
  return (text, font, tracking) => {
    context.font = font
    setTracking(context, tracking)
    return context.measureText(text).width
  }
}

function resetShadow(context: TextCanvas) {
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
}

function roundedBox(context: TextCanvas, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, Math.max(0, Math.min(radius, width / 2, height / 2)))
  context.fill()
}

function drawBoxes(context: TextCanvas, style: StyleSpec, layout: TextLayout, color: string) {
  const box = style.box
  if (!box) return
  const { fontSize, lineHeight, lines } = layout
  const padX = box.padX * fontSize
  const padY = box.padY * fontSize
  context.fillStyle = paintOf(box.paint, color)
  if (box.mode === 'block') {
    const { bounds } = layout
    roundedBox(context, bounds.x, bounds.y, bounds.width, bounds.height, box.radius * Math.min(bounds.height, fontSize * 2))
    return
  }
  for (const line of lines) {
    if (!line.text.trim()) continue
    if (box.mode === 'highlight') {
      // A metade de baixo da linha, como uma caneta marca-texto passada sobre as letras.
      roundedBox(context, line.x - padX, line.y - fontSize * 0.08, line.width + 2 * padX, fontSize * 0.5, box.radius * fontSize)
    } else {
      roundedBox(context, line.x - padX, line.y - lineHeight / 2 - padY, line.width + 2 * padX, lineHeight + 2 * padY, box.radius * fontSize)
    }
  }
}

function forEachLine(layout: TextLayout, draw: (line: TextLine) => void) {
  for (const line of layout.lines) if (line.text) draw(line)
}

/** Desenha um texto já medido (`layoutText`) no canvas, no estilo e na cor dele. */
export function drawText(context: TextCanvas, text: VideoText, layout: TextLayout) {
  const style = styleOf(text.style)
  const { fontSize } = layout
  context.save()
  context.font = layout.font
  setTracking(context, layout.tracking)
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  if (style.slant) {
    // Inclina em volta do centro do bloco, para o texto não sair do lugar.
    const centerY = layout.bounds.y + layout.bounds.height / 2
    context.translate(0, centerY)
    context.transform(1, 0, -style.slant, 1, 0, 0)
    context.translate(0, -centerY)
  }

  drawBoxes(context, style, layout, text.color)

  if (style.shadow) {
    const { shadow } = style
    if (shadow.blur === 0) {
      // Sombra dura (retrô): as letras de novo, deslocadas, por baixo.
      context.fillStyle = paintOf(shadow.paint, text.color)
      forEachLine(layout, (line) => context.fillText(line.text, line.x + shadow.x * fontSize, line.y + shadow.y * fontSize))
    } else {
      context.shadowColor = paintOf(shadow.paint, text.color)
      context.shadowBlur = shadow.blur * fontSize
      context.shadowOffsetX = shadow.x * fontSize
      context.shadowOffsetY = shadow.y * fontSize
    }
  }

  if (style.glow) {
    context.fillStyle = paintOf(style.glow.paint, text.color)
    context.shadowColor = paintOf(style.glow.paint, text.color)
    for (const blur of style.glow.blurs) {
      context.shadowBlur = blur * fontSize
      forEachLine(layout, (line) => context.fillText(line.text, line.x, line.y))
    }
    resetShadow(context)
  }

  if (style.stroke) {
    context.strokeStyle = paintOf(style.stroke.paint, text.color)
    context.lineWidth = style.stroke.width * fontSize
    forEachLine(layout, (line) => context.strokeText(line.text, line.x, line.y))
    // A sombra fica só no contorno: no preenchimento, ela escureceria as letras.
    resetShadow(context)
  }

  if (style.fill) {
    context.fillStyle = paintOf(style.fill, text.color)
    forEachLine(layout, (line) => context.fillText(line.text, line.x, line.y))
  }
  context.restore()
}

/* Tempo */

/** Textos que aparecem neste instante do vídeo original, na ordem de cima (os mais novos por cima). */
export function textsAt(texts: readonly VideoText[], sourceTime: number): VideoText[] {
  return texts.filter((text) => sourceTime >= text.start && sourceTime < text.end)
}

/* Validação (o Worker confere tudo o que recebe) */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const STYLE_IDS = new Set<string>(TEXT_STYLES.map((style) => style.id))
const FONT_IDS = new Set<string>(TEXT_FONTS.map((font) => font.id))

/** Texto inválido (números fora do lugar, estilo ou cor desconhecidos) é descartado; o resto é trazido para os limites. */
export function sanitizeTexts(texts: readonly VideoText[], duration: number): VideoText[] {
  return texts.slice(0, TEXT_LIMITS.maxTexts).flatMap((text) => {
    const numbers = [text.size, text.x, text.y, text.start, text.end]
    if (!numbers.every(Number.isFinite) || !STYLE_IDS.has(text.style) || !/^#[0-9a-f]{6}$/i.test(text.color)) return []
    if (!Number.isInteger(text.id) || !['left', 'center', 'right'].includes(text.align) || typeof text.text !== 'string') return []
    if (text.font !== undefined && !FONT_IDS.has(text.font)) return []
    const start = clamp(text.start, 0, duration)
    const end = clamp(text.end, 0, duration)
    const content = text.text.slice(0, TEXT_LIMITS.maxLength)
    if (end - start <= 0 || !content.trim()) return []
    return [{ ...text, text: content, size: clamp(text.size, TEXT_LIMITS.minSize, TEXT_LIMITS.maxSize), x: clamp(text.x, 0, 1), y: clamp(text.y, 0, 1), start, end }]
  })
}

/* Edição (Editar vídeo) */

/** Texto novo: no meio do quadro, no estilo clássico, branco, aparecendo a partir de `start` por 3 s. */
export function newText(id: number, start: number, duration: number, text = ''): VideoText {
  const from = clamp(start, 0, Math.max(0, duration - TEXT_LIMITS.minDuration))
  return {
    id,
    text,
    style: 'classico',
    color: '#ffffff',
    size: TEXT_LIMITS.defaultSize,
    align: 'center',
    x: 0.5,
    y: 0.5,
    start: from,
    end: Math.min(duration, from + TEXT_LIMITS.defaultDuration),
  }
}

/** Muda quando o texto começa ou termina (tempo do original), sem ele ficar menor que 0,3 s nem sair do vídeo. */
export function setTextEdge(text: VideoText, edge: 'start' | 'end', sourceTime: number, duration: number): VideoText {
  if (edge === 'start') return { ...text, start: clamp(sourceTime, 0, Math.max(0, text.end - TEXT_LIMITS.minDuration)) }
  return { ...text, end: clamp(sourceTime, Math.min(duration, text.start + TEXT_LIMITS.minDuration), duration) }
}

/** Limites de cada ponta do texto, para as alças e o teclado. */
export function textEdgeLimits(text: VideoText, edge: 'start' | 'end', duration: number): { min: number; max: number } {
  return edge === 'start'
    ? { min: 0, max: Math.max(0, text.end - TEXT_LIMITS.minDuration) }
    : { min: Math.min(duration, text.start + TEXT_LIMITS.minDuration), max: duration }
}

/** Os textos que aparecem em alguma parte que fica no vídeo (os outros não vão para o arquivo). */
export function textsInRanges(texts: readonly VideoText[], ranges: readonly { start: number; end: number }[]): VideoText[] {
  return texts.filter((text) => text.text.trim() && ranges.some((range) => text.start < range.end && text.end > range.start))
}

/**
 * Linha de cada bloco na faixa de textos: um texto que se sobrepõe ao anterior desce uma linha, como nos
 * editores de celular. `spans` em tempo do vídeo editado.
 */
export function laneRows(spans: readonly { start: number; end: number }[]): number[] {
  const rowEnds: number[] = []
  return spans.map((span) => {
    const row = rowEnds.findIndex((end) => end <= span.start + 1e-6)
    const index = row >= 0 ? row : rowEnds.length
    rowEnds[index] = span.end
    return index
  })
}
