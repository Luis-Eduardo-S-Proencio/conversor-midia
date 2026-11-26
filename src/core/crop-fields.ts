/**
 * Campos da área de recorte (margens e tamanho) e proporções prontas, comuns ao recorte de imagem e
 * ao de vídeo. Funções puras: sem React nem DOM.
 */
import { digitsOnly } from './digits'
import type { CropRect } from './image/crop'
import type { Dimensions } from './image/resize'

/** O que está sendo recortado: muda só o texto das mensagens. */
export type CropSubject = 'image' | 'video'

const SUBJECT_TEXT: Record<CropSubject, { of: string; over: string }> = {
  image: { of: 'da imagem', over: 'sobre a imagem' },
  video: { of: 'do vídeo', over: 'sobre o vídeo' },
}

/** Aviso de tentativa sem nada recortado (a área ainda é o quadro inteiro). */
export const nothingCroppedMessage = (subject: CropSubject) =>
  `Ajuste a área de recorte antes: arraste os cantos ${SUBJECT_TEXT[subject].over} ou digite as medidas.`

/**
 * Proporções prontas, sempre na orientação escrita (9:16 é em pé, 16:9 é deitada), como nos apps de
 * edição: dá para tirar um Story 9:16 de um vídeo deitado. 4:5 é o post do Instagram; 3:2, a foto clássica.
 */
export type AspectChoice = 'free' | '1:1' | '4:5' | '9:16' | '16:9' | '3:2'

export const ASPECT_CHOICES: readonly AspectChoice[] = ['free', '1:1', '4:5', '9:16', '16:9', '3:2']

/** Largura : altura de cada proporção. */
const RATIOS: Record<Exclude<AspectChoice, 'free'>, readonly [number, number]> = {
  '1:1': [1, 1],
  '4:5': [4, 5],
  '9:16': [9, 16],
  '16:9': [16, 9],
  '3:2': [3, 2],
}

/** Largura ÷ altura da proporção escolhida; `undefined` em Livre. */
export function aspectRatio(choice: AspectChoice): number | undefined {
  if (choice === 'free') return undefined
  const [width, height] = RATIOS[choice]
  return width / height
}

export const aspectLabel = (choice: AspectChoice): string => (choice === 'free' ? 'Livre' : choice)

/** Proporção pedida no endereço (ex.: "?proporcao=9:16", vindo de um atalho); `undefined` se não for uma das prontas. */
export function parseAspect(text: string | null): AspectChoice | undefined {
  return ASPECT_CHOICES.find((choice) => choice !== 'free' && choice === text)
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

/**
 * Confere os campos e os traduz na área de recorte. Valor errado vem antes de campo vazio.
 * `minSide` é o menor lado aceito para a área (vídeo tem mínimo; imagem, 1 px).
 */
export function validateCropFields(fields: CropFields, size: Dimensions, subject: CropSubject = 'image', minSide = 1): CropValidation {
  const limits: Record<CropField, readonly [number, number]> = {
    x: [0, size.width - minSide],
    y: [0, size.height - minSide],
    width: [minSide, size.width],
    height: [minSide, size.height],
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
  const of = SUBJECT_TEXT[subject].of
  if (x + width > size.width) {
    return invalid(
      `A área passa da borda direita ${of}, que tem ${size.width} px de largura. Diminua a margem esquerda ou a largura.`,
      ['width', 'x'],
    )
  }
  if (y + height > size.height) {
    return invalid(
      `A área passa da borda de baixo ${of}, que tem ${size.height} px de altura. Diminua a margem superior ou a altura.`,
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
