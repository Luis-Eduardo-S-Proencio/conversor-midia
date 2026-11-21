/**
 * Trecho a manter de um vídeo: campos de início e fim, validação e as regras de corte.
 * Funções puras: sem React nem DOM.
 */
import type { VideoFormat } from './formats'
import { formatTime, parseTime } from './time'

/** Menor trecho aceito, em segundos. */
export const MIN_TRIM_SECONDS = 0.1

/**
 * Folga das comparações, em segundos. Os campos mostram centésimos arredondados: o fim digitado
 * igual ao da duração ("0:04,60" para 4,596 s) não pode contar como depois do fim do vídeo.
 */
const TOLERANCE = 0.005

export type TrimField = 'start' | 'end'

export const TRIM_FIELDS: readonly TrimField[] = ['start', 'end']

/** Texto dos campos, como digitado. */
export type TrimFields = Record<TrimField, string>

export interface TrimRange {
  start: number
  end: number
}

export interface TrimError {
  message: string
  /** Campos com problema; o primeiro recebe o foco quando a pessoa tenta cortar. */
  fields: TrimField[]
  /** Aparece só depois de tentar cortar (campo vazio, nada cortado), não enquanto a pessoa digita. */
  missing: boolean
}

export type TrimValidation = { ok: true; range: TrimRange } | { ok: false; error: TrimError }

/** Pedido de foco: um objeto novo a cada pedido (tentativa de cortar com problema, parte nova). */
export interface TrimFocusRequest {
  field: TrimField
  /** Ao remover partes, qual delas (o `id` da parte). */
  part?: number
}

/**
 * Como cortar. Exato recodifica o começo do vídeo quando o início não cai num quadro-chave; Rápido
 * copia o vídeo sem recodificar, a partir do quadro-chave anterior ao início.
 */
export type TrimMode = 'exact' | 'fast'

/** O que o navegador consegue fazer com o vídeo (vem da abertura no Worker). */
export interface TrimCapabilities {
  format: VideoFormat
  canTranscodeVideo: boolean
  /** Verdadeiro também quando o vídeo não tem som. */
  canTranscodeAudio: boolean
}

/**
 * Modos possíveis para este vídeo neste navegador. Exato exige recodificar o vídeo (e, em WEBM, o som);
 * Rápido não existe em WEBM, que não guarda quadros antes do início.
 */
export function availableTrimModes({ format, canTranscodeVideo, canTranscodeAudio }: TrimCapabilities): Record<TrimMode, boolean> {
  return {
    exact: canTranscodeVideo && (format !== 'webm' || canTranscodeAudio),
    fast: format !== 'webm',
  }
}

/** O que fazer com o vídeo: manter só um trecho, ou remover partes e juntar o que sobra. */
export type TrimAction = 'keep' | 'remove'

/**
 * Remover partes emenda pedaços: o vídeo e o som são sempre recodificados (o som em AAC no MP4 e no
 * MOV, em Opus no WEBM), então o navegador precisa conseguir as duas coisas.
 */
export const canRemoveParts = ({ canTranscodeVideo, canTranscodeAudio }: TrimCapabilities) => canTranscodeVideo && canTranscodeAudio

/** O modo escolhido, se possível; senão o outro; `null` quando não dá para cortar este vídeo aqui. */
export function resolveTrimMode(preferred: TrimMode, available: Record<TrimMode, boolean>): TrimMode | null {
  if (available[preferred]) return preferred
  if (available.exact) return 'exact'
  return available.fast ? 'fast' : null
}

const FIELD_NAMES: Record<TrimField, string> = { start: 'o início', end: 'o fim' }

const invalid = (message: string, fields: TrimField[], missing = false): TrimValidation => ({
  ok: false,
  error: { message, fields, missing },
})

export const fieldsOfRange = (range: TrimRange): TrimFields => ({ start: formatTime(range.start), end: formatTime(range.end) })

/** O vídeo inteiro: começa no início e vai até o fim. */
export const wholeRange = (duration: number): TrimRange => ({ start: 0, end: duration })

/** O trecho é o vídeo inteiro (nada a cortar)? */
export const isWholeVideo = (range: TrimRange, duration: number) => range.start <= TOLERANCE && range.end >= duration - TOLERANCE

/** Aviso de tentativa sem nada cortado. */
export const NOTHING_TRIMMED = 'Ajuste o início ou o fim antes: o trecho ainda é o vídeo inteiro.'

/** Folga das comparações de tempo, em segundos (ver TOLERANCE), para as outras regras de corte. */
export const TIME_TOLERANCE = TOLERANCE

/** Tempos lidos dos campos; os vazios ficam de fora. */
export type TimeValues = Partial<Record<TrimField, number>>

export type TimeValuesCheck = { ok: true; values: TimeValues } | { ok: false; error: TrimError }

/** Primeira etapa: cada campo preenchido é um tempo dentro do vídeo. Campo vazio fica para depois. */
export function checkTimeValues(fields: TrimFields, duration: number): TimeValuesCheck {
  const values: TimeValues = {}
  for (const field of TRIM_FIELDS) {
    if (fields[field].trim() === '') continue
    const value = parseTime(fields[field])
    if (value === null) return { ok: false, error: { message: 'Use minutos e segundos, como 1:05,30.', fields: [field], missing: false } }
    values[field] = value
  }

  const durationText = formatTime(duration)
  const { start, end } = values
  if (start !== undefined && start >= duration - TOLERANCE) {
    return { ok: false, error: { message: `O vídeo tem ${durationText}: o início precisa vir antes disso.`, fields: ['start'], missing: false } }
  }
  if (end !== undefined && end > duration + TOLERANCE) {
    return { ok: false, error: { message: `O vídeo tem ${durationText}: o fim não pode passar disso.`, fields: ['end'], missing: false } }
  }
  return { ok: true, values }
}

/**
 * Segunda etapa: os dois campos preenchidos, o início antes do fim e a duração mínima.
 * `subject` nomeia o que está sendo medido ("O trecho", "A parte").
 */
export function checkRange(fields: TrimFields, { start, end }: TimeValues, duration: number, subject: string): TrimValidation {
  if (start === undefined || end === undefined) {
    const empty = TRIM_FIELDS.filter((field) => fields[field].trim() === '')
    const names = empty.map((field) => FIELD_NAMES[field])
    return invalid(`Preencha ${names.join(' e ')}.`, empty, true)
  }
  if (start >= end) return invalid('O início precisa vir antes do fim.', ['start', 'end'])
  const range = { start, end: Math.min(end, duration) }
  if (range.end - range.start < MIN_TRIM_SECONDS - TOLERANCE) {
    return invalid(`${subject} precisa ter pelo menos 0,1 segundo.`, ['end', 'start'])
  }
  return { ok: true, range }
}

/** Confere os campos e os traduz no trecho. Valor errado vem antes de campo vazio. */
export function validateTrim(fields: TrimFields, duration: number): TrimValidation {
  const checked = checkTimeValues(fields, duration)
  if (!checked.ok) return checked
  return checkRange(fields, checked.values, duration, 'O trecho')
}
