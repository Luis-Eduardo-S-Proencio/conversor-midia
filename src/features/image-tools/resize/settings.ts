import { IMAGE_LIMITS } from '../../../core/image/inspect'
import { MAX_OUTPUT_SIDE, type ResizeRequest } from '../../../core/image/resize'
import type { BatchLabels } from '../shared/constants'

export const RESIZE_LABELS: BatchLabels = {
  action: 'Redimensionar',
  progress: 'Redimensionando',
  done: 'redimensionada',
  noun: 'Mudança de tamanho', // feminino, como pede a base: "Mudança de tamanho cancelada."
}

export const RESIZE_ZIP_NAME = 'imagens-redimensionadas.zip'

/** Qualidade fixa para JPG e WEBP: a ferramenta muda as medidas; para reduzir o arquivo existe Comprimir. */
export const RESIZE_QUALITY = 0.92

/** Só reduz: ampliar por porcentagem não é oferecido. Passos de 5% facilitam acertar 25%, 50% e 75%. */
export const PERCENT_RANGE = { min: 10, max: 90, step: 5 } as const

export type ResizeMode = 'percent' | 'pixels'

export type SizeField = 'width' | 'height'

export interface ResizeSettings {
  mode: ResizeMode
  percent: number
  /** Texto dos campos de pixels, só com algarismos (vazio = não informado). */
  width: string
  height: string
  keepRatio: boolean
}

export const DEFAULT_SETTINGS: ResizeSettings = { mode: 'percent', percent: 50, width: '', height: '', keepRatio: true }

export interface ResizeError {
  message: string
  /** Campos com problema; o primeiro recebe o foco quando a pessoa tenta redimensionar. */
  fields: SizeField[]
  /** Falta preencher: só é apontado depois de tentar redimensionar, não enquanto a pessoa ainda digita. */
  missing: boolean
}

export type ResizeValidation = { ok: true; request: ResizeRequest } | { ok: false; error: ResizeError }

/** Pedido de foco: um objeto novo a cada tentativa de redimensionar com campo inválido. */
export interface FocusRequest {
  field: SizeField
}

const megapixelFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

type Parsed = { field: SizeField; value: number | undefined; valid: boolean }

function parse(field: SizeField, text: string): Parsed {
  if (text === '') return { field, value: undefined, valid: true }
  const value = /^\d+$/.test(text) ? Number(text) : Number.NaN
  return { field, value, valid: value >= 1 && value <= MAX_OUTPUT_SIDE }
}

const invalid = (message: string, fields: SizeField[], missing = false): ResizeValidation => ({
  ok: false,
  error: { message, fields, missing },
})

/** Confere as opções e as traduz no pedido de redimensionamento. Funções puras: sem React. */
export function validateResize(settings: ResizeSettings): ResizeValidation {
  if (settings.mode === 'percent') return { ok: true, request: { mode: 'percent', percent: settings.percent } }

  const fields = [parse('width', settings.width), parse('height', settings.height)]
  const outOfRange = fields.find((field) => !field.valid)
  if (outOfRange) return invalid(`Use um valor de 1 a ${MAX_OUTPUT_SIDE} px.`, [outOfRange.field])

  const [width, height] = fields.map((field) => field.value)
  const empty = fields.filter((field) => field.value === undefined).map((field) => field.field)

  if (settings.keepRatio) {
    if (width === undefined && height === undefined) return invalid('Preencha a largura, a altura ou as duas.', empty, true)
    return { ok: true, request: { mode: 'fit', width, height } }
  }

  if (width === undefined || height === undefined) {
    return invalid('Sem manter a proporção, preencha a largura e a altura.', empty, true)
  }
  if (width * height > IMAGE_LIMITS.maxPixels) {
    const megapixels = megapixelFormat.format((width * height) / 1_000_000)
    const limit = megapixelFormat.format(IMAGE_LIMITS.maxPixels / 1_000_000)
    return invalid(`O resultado teria ${megapixels} megapixels; o limite é ${limit}. Diminua a largura ou a altura.`, ['width', 'height'])
  }
  return { ok: true, request: { mode: 'exact', width, height } }
}
