import type { CropRect } from '../../../core/image/crop'
import type { Dimensions } from '../../../core/image/resize'
import type { BatchLabels } from '../shared/constants'
import { digitsOnly } from '../shared/number-input'

export const CROP_LABELS: BatchLabels = {
  action: 'Recortar',
  progress: 'Recortando',
  done: 'recortada',
  noun: 'Edição', // feminino, como pede a base: "Edição cancelada."
  again: 'Recortar outra',
}

/** Uma imagem por vez: o ZIP nunca é montado, mas a tela comum pede um nome. */
export const CROP_ZIP_NAME = 'imagens-recortadas.zip'

/** Qualidade fixa para JPG e WEBP: a ferramenta só recorta; para reduzir o arquivo existe Comprimir. */
export const CROP_QUALITY = 0.92

export const NOTHING_CROPPED = 'Ajuste a área de recorte antes: arraste os cantos sobre a imagem ou digite as medidas.'

export type AspectChoice = 'free' | 'square' | 'standard' | 'wide'

export const ASPECT_CHOICES: readonly AspectChoice[] = ['free', 'square', 'standard', 'wide']

/** Lados de uma área deitada (largura : altura). Numa foto em pé, a área fica em pé também. */
const RATIOS: Record<Exclude<AspectChoice, 'free'>, readonly [number, number]> = {
  square: [1, 1],
  standard: [4, 3],
  wide: [16, 9],
}

function sides(choice: AspectChoice, image: Dimensions): readonly [number, number] | undefined {
  if (choice === 'free') return undefined
  const [long, short] = RATIOS[choice]
  return image.height > image.width ? [short, long] : [long, short]
}

/** Largura ÷ altura da proporção escolhida; `undefined` em Livre. */
export function aspectRatio(choice: AspectChoice, image: Dimensions): number | undefined {
  const pair = sides(choice, image)
  return pair ? pair[0] / pair[1] : undefined
}

export function aspectLabel(choice: AspectChoice, image: Dimensions): string {
  const pair = sides(choice, image)
  return pair ? `${pair[0]}:${pair[1]}` : 'Livre'
}

export type CropField = 'x' | 'y' | 'width' | 'height'

export const CROP_FIELDS: readonly CropField[] = ['x', 'y', 'width', 'height']

/** Texto dos campos, como digitado (só algarismos; vazio = não preenchido). */
export type CropFields = Record<CropField, string>

export const fieldsOf = (crop: CropRect): CropFields => ({
  x: String(crop.x),
  y: String(crop.y),
  width: String(crop.width),
  height: String(crop.height),
})

export interface CropError {
  message: string
  /** Campos com problema; o primeiro recebe o foco quando a pessoa tenta recortar. */
  fields: CropField[]
  /** Aparece só depois de tentar recortar (campo vazio, nada recortado), não enquanto a pessoa digita. */
  missing: boolean
}

export type CropValidation = { ok: true; crop: CropRect } | { ok: false; error: CropError }

/** Pedido de foco: um objeto novo a cada tentativa de recortar com problema. */
export interface FocusRequest {
  field: CropField
}

const invalid = (message: string, fields: CropField[], missing = false): CropValidation => ({
  ok: false,
  error: { message, fields, missing },
})

/** Confere os campos e os traduz na área de recorte. Valor errado vem antes de campo vazio. */
export function validateCropFields(fields: CropFields, image: Dimensions): CropValidation {
  const limits: Record<CropField, readonly [number, number]> = {
    x: [0, image.width - 1],
    y: [0, image.height - 1],
    width: [1, image.width],
    height: [1, image.height],
  }
  const values: Partial<Record<CropField, number>> = {}
  for (const field of CROP_FIELDS) {
    const text = fields[field]
    if (text === '') continue
    const value = /^\d+$/.test(text) ? Number(text) : Number.NaN
    const [min, max] = limits[field]
    if (!(value >= min && value <= max)) return invalid(`Use um valor de ${min} a ${max} px.`, [field])
    values[field] = value
  }

  const { x, y, width, height } = values
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    const empty = CROP_FIELDS.filter((field) => fields[field] === '')
    return invalid('Preencha margem esquerda, margem superior, largura e altura.', empty, true)
  }
  if (x + width > image.width) {
    return invalid(
      `A área passa da borda direita da imagem, que tem ${image.width} px de largura. Diminua a margem esquerda ou a largura.`,
      ['width', 'x'],
    )
  }
  if (y + height > image.height) {
    return invalid(
      `A área passa da borda de baixo da imagem, que tem ${image.height} px de altura. Diminua a margem superior ou a altura.`,
      ['height', 'y'],
    )
  }
  return { ok: true, crop: { x, y, width, height } }
}

/** Texto de um campo editado. Com proporção fixa, a largura puxa a altura e a altura puxa a largura. */
export function editField(fields: CropFields, field: CropField, text: string, ratio?: number): CropFields {
  const value = digitsOnly(text)
  const next: CropFields = { ...fields, [field]: value }
  const size = Number(value)
  if (ratio === undefined || value === '' || size === 0) return next
  if (field === 'width') next.height = String(Math.max(1, Math.round(size / ratio)))
  if (field === 'height') next.width = String(Math.max(1, Math.round(size * ratio)))
  return next
}
