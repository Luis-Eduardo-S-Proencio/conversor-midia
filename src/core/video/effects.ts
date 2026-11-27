/**
 * Efeitos do Editar vídeo: filtros prontos, ajustes de cor e velocidade, valendo para o vídeo inteiro.
 *
 * Toda mudança de cor vira uma matriz de cor só (3 × 4, em sRGB, com o deslocamento em frações de 0 a 1).
 * A prévia aplica essa matriz por um filtro SVG (`feColorMatrix`, em sRGB) e o Worker, em cada quadro,
 * pela mesma conta: o que a pessoa vê é o que sai. Funções puras: sem React nem DOM.
 */

/** [rr, rg, rb, ro, gr, gg, gb, go, br, bg, bb, bo]: cada linha dá um canal de saída a partir de R, G, B e um deslocamento. */
export type ColorMatrix = readonly [number, number, number, number, number, number, number, number, number, number, number, number]

export const IDENTITY: ColorMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]

/** `second` depois de `first`. */
export function compose(first: ColorMatrix, second: ColorMatrix): ColorMatrix {
  const result: number[] = []
  for (let row = 0; row < 3; row += 1) {
    const b = (column: number) => second[row * 4 + column] ?? 0
    for (let column = 0; column < 3; column += 1) {
      result.push(b(0) * first[column]! + b(1) * first[4 + column]! + b(2) * first[8 + column]!)
    }
    result.push(b(0) * first[3] + b(1) * first[7] + b(2) * first[11] + b(3))
  }
  return result as unknown as ColorMatrix
}

const chain = (...matrices: ColorMatrix[]): ColorMatrix => matrices.reduce(compose, IDENTITY)

/* Primitivas (as de filtro do CSS, em sRGB, com os pesos de luminância do Rec. 709) */

/** 0 = cinza; 1 = como está; acima de 1, cores mais fortes. */
export function saturate(amount: number): ColorMatrix {
  const s = amount
  return [
    0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0,
    0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0,
    0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0,
  ]
}

export function sepia(amount: number): ColorMatrix {
  const k = 1 - amount
  return [
    0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0,
    0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0,
    0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k, 0,
  ]
}

/** Multiplica os três canais. */
export const brightness = (amount: number): ColorMatrix => [amount, 0, 0, 0, 0, amount, 0, 0, 0, 0, amount, 0]

/** Afasta (acima de 1) ou aproxima (abaixo de 1) os tons do cinza médio. */
export const contrast = (amount: number): ColorMatrix => {
  const offset = 0.5 - 0.5 * amount
  return [amount, 0, 0, offset, 0, amount, 0, offset, 0, 0, amount, offset]
}

/** Positivo puxa para o laranja (mais vermelho, menos azul); negativo, para o azul. De −1 a 1. */
export const warmth = (amount: number): ColorMatrix => [1 + 0.15 * amount, 0, 0, 0, 0, 1 + 0.03 * amount, 0, 0, 0, 0, 1 - 0.15 * amount, 0]

/** Aspecto de foto antiga: o preto vira cinza escuro e o branco perde um pouco do brilho. De 0 a 1. */
export const fade = (amount: number): ColorMatrix => {
  const scale = 1 - 0.25 * amount
  const offset = 0.12 * amount
  return [scale, 0, 0, offset, 0, scale, 0, offset, 0, 0, scale, offset]
}

/** Brilho de −1 a 1: clareia (ou escurece) os tons escuros e os claros, sem estourar tanto quanto só multiplicar. */
const lighten = (amount: number): ColorMatrix => {
  const scale = 1 + 0.2 * amount
  const offset = 0.12 * amount
  return [scale, 0, 0, offset, 0, scale, 0, offset, 0, 0, scale, offset]
}

/* Filtros prontos */

export type FilterId =
  | 'original'
  | 'pb'
  | 'noir'
  | 'sepia'
  | 'vivido'
  | 'quente'
  | 'frio'
  | 'vintage'
  | 'fosco'
  | 'dramatico'
  | 'suave'
  | 'cinema'

export interface VideoFilter {
  id: FilterId
  name: string
  matrix: ColorMatrix
}

export const FILTERS: readonly VideoFilter[] = [
  { id: 'original', name: 'Original', matrix: IDENTITY },
  { id: 'vivido', name: 'Vívido', matrix: chain(saturate(1.5), contrast(1.1)) },
  { id: 'quente', name: 'Quente', matrix: chain(warmth(0.7), saturate(1.1)) },
  { id: 'frio', name: 'Frio', matrix: chain(warmth(-0.7), brightness(1.03)) },
  { id: 'pb', name: 'P&B', matrix: saturate(0) },
  { id: 'noir', name: 'Noir', matrix: chain(saturate(0), contrast(1.4), brightness(0.95)) },
  { id: 'sepia', name: 'Sépia', matrix: sepia(0.9) },
  { id: 'vintage', name: 'Vintage', matrix: chain(sepia(0.4), fade(0.6), saturate(0.85)) },
  { id: 'fosco', name: 'Fosco', matrix: chain(fade(1), saturate(0.65)) },
  { id: 'dramatico', name: 'Dramático', matrix: chain(contrast(1.45), saturate(0.75), brightness(0.92)) },
  { id: 'suave', name: 'Suave', matrix: chain(contrast(0.85), brightness(1.06), saturate(0.85)) },
  { id: 'cinema', name: 'Cinema', matrix: chain(warmth(0.3), contrast(1.2), saturate(0.85), fade(0.15)) },
]

const FILTER_BY_ID = new Map(FILTERS.map((filter) => [filter.id, filter]))

/* Ajustes */

/** Cada ajuste vai de −100 a 100; 0 deixa como está. */
export interface ColorAdjustments {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
}

export type AdjustmentId = keyof ColorAdjustments

export const ADJUSTMENTS: readonly { id: AdjustmentId; name: string }[] = [
  { id: 'brightness', name: 'Brilho' },
  { id: 'contrast', name: 'Contraste' },
  { id: 'saturation', name: 'Saturação' },
  { id: 'warmth', name: 'Temperatura' },
]

export const NO_ADJUSTMENTS: ColorAdjustments = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }

export const ADJUSTMENT_LIMIT = 100

function adjustmentMatrix(adjust: ColorAdjustments): ColorMatrix {
  const v = (value: number) => value / ADJUSTMENT_LIMIT
  return chain(lighten(v(adjust.brightness)), contrast(1 + 0.5 * v(adjust.contrast)), saturate(1 + v(adjust.saturation)), warmth(v(adjust.warmth)))
}

/* Cor do vídeo */

export interface ColorEffect {
  filter: FilterId
  /** Força do filtro, de 0 a 100. */
  intensity: number
  adjust: ColorAdjustments
}

export const NO_COLOR: ColorEffect = { filter: 'original', intensity: 100, adjust: NO_ADJUSTMENTS }

/** O filtro com a força pedida: no meio do caminho entre o vídeo como está e o filtro inteiro. */
export function filterMatrix(filter: FilterId, intensity = 100): ColorMatrix {
  const target = FILTER_BY_ID.get(filter)?.matrix ?? IDENTITY
  const k = Math.min(1, Math.max(0, intensity / 100))
  return target.map((value, index) => IDENTITY[index]! + k * (value - IDENTITY[index]!)) as unknown as ColorMatrix
}

const isIdentity = (matrix: ColorMatrix) => matrix.every((value, index) => Math.abs(value - IDENTITY[index]!) < 1e-6)

/** A matriz do filtro seguido dos ajustes; `null` quando nada muda a cor (o quadro não precisa ser mexido). */
export function colorMatrix(color: ColorEffect): ColorMatrix | null {
  const matrix = compose(filterMatrix(color.filter, color.intensity), adjustmentMatrix(color.adjust))
  return isIdentity(matrix) ? null : matrix
}

/** Aplica a matriz aos pixels RGBA (o alfa fica como está). O `Uint8ClampedArray` arredonda e limita de 0 a 255. */
export function applyColorMatrix(pixels: Uint8ClampedArray, matrix: ColorMatrix): void {
  const [rr, rg, rb, ro, gr, gg, gb, go, br, bg, bb, bo] = matrix
  const rOffset = ro * 255
  const gOffset = go * 255
  const bOffset = bo * 255
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index]!
    const g = pixels[index + 1]!
    const b = pixels[index + 2]!
    pixels[index] = rr * r + rg * g + rb * b + rOffset
    pixels[index + 1] = gr * r + gg * g + gb * b + gOffset
    pixels[index + 2] = br * r + bg * g + bb * b + bOffset
  }
}

/** Os 20 valores do `feColorMatrix` (4 × 5, com o alfa intacto). */
export function svgMatrixValues(matrix: ColorMatrix): string {
  const round = (value: number) => Number(value.toFixed(5))
  const row = (index: number) => [matrix[index]!, matrix[index + 1]!, matrix[index + 2]!, 0, matrix[index + 3]!].map(round).join(' ')
  return `${row(0)} ${row(4)} ${row(8)} 0 0 0 1 0`
}

/* Velocidade */

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const

/** "0,25×", "2×". */
export const speedLabel = (speed: number) => `${String(speed).replace('.', ',')}×`

/* Tudo junto */

export interface VideoEffects {
  color: ColorEffect
  /** 1 = velocidade normal; 2 = duas vezes mais rápido (o vídeo dura a metade). */
  speed: number
}

export const NO_EFFECTS: VideoEffects = { color: NO_COLOR, speed: 1 }

export const hasColorChange = (color: ColorEffect | undefined) => Boolean(color && colorMatrix(color))

/** Força e ajustes fora do lugar voltam ao limite; filtro desconhecido não vale. O Worker não confia no que recebe. */
export function sanitizeColor(color: ColorEffect | undefined): ColorEffect | undefined {
  if (!color || typeof color !== 'object' || !FILTER_BY_ID.has(color.filter)) return undefined
  const adjust = (color.adjust ?? {}) as Partial<ColorAdjustments>
  const limited = (value: unknown, min: number, max: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0)
  const clean: ColorEffect = {
    filter: color.filter,
    intensity: typeof color.intensity === 'number' && Number.isFinite(color.intensity) ? Math.min(100, Math.max(0, color.intensity)) : 100,
    adjust: {
      brightness: limited(adjust.brightness, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
      contrast: limited(adjust.contrast, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
      saturation: limited(adjust.saturation, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
      warmth: limited(adjust.warmth, -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT),
    },
  }
  return colorMatrix(clean) ? clean : undefined
}

/** Só as velocidades oferecidas; qualquer outra coisa é a normal. */
export const sanitizeSpeed = (speed: unknown): number => (SPEEDS as readonly unknown[]).includes(speed) ? (speed as number) : 1
