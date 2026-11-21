/**
 * Remover partes de um vídeo e juntar o que sobra: validação das partes, o que fica e onde cada
 * pedaço vai parar no resultado. Funções puras: sem React nem DOM.
 */
import { MIN_TRIM_SECONDS, TIME_TOLERANCE, checkRange, checkTimeValues, type TrimError, type TrimFields, type TrimRange } from './trim'

/** Mais que isso vira edição de vídeo, fora do propósito da ferramenta. */
export const MAX_REMOVED_PARTS = 10

/** Uma parte a remover, como digitada. `id` mantém a linha da lista estável na tela. */
export interface RemovalPart extends TrimFields {
  id: number
}

export interface RemovalError extends TrimError {
  /** Posição da parte com problema na lista (a partir de 0). */
  part: number
}

export type RemovalValidation = { ok: true; removed: TrimRange[]; kept: TrimRange[] } | { ok: false; error: RemovalError }

/** "Parte 2: o início precisa..." quando há mais de uma parte; com uma só, a mensagem fica como está. */
function inPart(message: string, index: number, count: number): string {
  if (count === 1) return message
  return `Parte ${index + 1}: ${message.charAt(0).toLowerCase()}${message.slice(1)}`
}

const partError = (error: TrimError, index: number, count: number): RemovalValidation => ({
  ok: false,
  error: { ...error, message: inPart(error.message, index, count), part: index },
})

/** Junta partes que se sobrepõem ou se encostam, em ordem; encosta no começo e no fim do vídeo as que quase chegam lá. */
export function mergeRanges(ranges: readonly TrimRange[], duration: number): TrimRange[] {
  const snapped = ranges
    .map(({ start, end }) => ({
      start: start <= TIME_TOLERANCE ? 0 : start,
      end: end >= duration - TIME_TOLERANCE ? duration : Math.min(end, duration),
    }))
    .sort((a, b) => a.start - b.start)
  const merged: TrimRange[] = []
  for (const range of snapped) {
    const last = merged.at(-1)
    if (last && range.start <= last.end + TIME_TOLERANCE) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}

/** O que sobra do vídeo depois de tirar as partes (já juntadas e em ordem). */
export function keptRanges(removed: readonly TrimRange[], duration: number): TrimRange[] {
  const kept: TrimRange[] = []
  let cursor = 0
  for (const range of removed) {
    if (range.start - cursor > TIME_TOLERANCE) kept.push({ start: cursor, end: range.start })
    cursor = Math.max(cursor, range.end)
  }
  if (duration - cursor > TIME_TOLERANCE) kept.push({ start: cursor, end: duration })
  return kept
}

export const totalDuration = (ranges: readonly TrimRange[]) => ranges.reduce((total, range) => total + range.end - range.start, 0)

/**
 * Confere as partes e diz o que fica. Valor errado (em qualquer parte) vem antes de campo vazio,
 * como no corte de um trecho; e o resultado precisa ter pelo menos 0,1 s.
 */
export function validateRemovals(parts: readonly TrimFields[], duration: number): RemovalValidation {
  const values = []
  for (const [index, fields] of parts.entries()) {
    const checked = checkTimeValues(fields, duration)
    if (!checked.ok) return partError(checked.error, index, parts.length)
    values.push(checked.values)
  }

  const ranges: TrimRange[] = []
  for (const [index, fields] of parts.entries()) {
    const checked = checkRange(fields, values[index] ?? {}, duration, 'A parte')
    if (!checked.ok) return partError(checked.error, index, parts.length)
    ranges.push(checked.range)
  }

  const removed = mergeRanges(ranges, duration)
  const kept = keptRanges(removed, duration)
  if (totalDuration(kept) < MIN_TRIM_SECONDS - TIME_TOLERANCE) {
    return partError(
      { message: 'Assim o vídeo inteiro seria removido. Deixe pelo menos 0,1 segundo.', fields: ['start', 'end'], missing: false },
      parts.length - 1,
      1,
    )
  }
  return { ok: true, removed, kept }
}

/**
 * O que fica, considerando só as partes já preenchidas certo: a linha do tempo da tela acompanha a
 * pessoa enquanto ela ainda completa as outras.
 */
export function previewKept(parts: readonly TrimFields[], duration: number): TrimRange[] {
  const ranges = parts.flatMap((fields) => {
    const checked = checkTimeValues(fields, duration)
    if (!checked.ok) return []
    const range = checkRange(fields, checked.values, duration, 'A parte')
    return range.ok ? [range.range] : []
  })
  return keptRanges(mergeRanges(ranges, duration), duration)
}

/**
 * Um pedaço que fica, na linha do tempo que começa no primeiro pedaço (é assim que o Worker recebe os
 * quadros), e quanto ele anda para trás para encostar no anterior.
 */
export interface JoinSegment {
  start: number
  end: number
  shift: number
}

export function joinSegments(kept: readonly TrimRange[]): JoinSegment[] {
  const origin = kept[0]?.start ?? 0
  let removedSoFar = 0
  return kept.map((range, index) => {
    const previous = kept[index - 1]
    if (previous) removedSoFar += range.start - previous.end
    return { start: range.start - origin, end: range.end - origin, shift: removedSoFar }
  })
}

/** O pedaço em que um instante cai; `null` quando ele foi removido. */
export function segmentAt(segments: readonly JoinSegment[], time: number): JoinSegment | null {
  return segments.find((segment) => time >= segment.start && time < segment.end) ?? null
}

/** Partes de um intervalo (ex.: um bloco de som) que ficam, com o instante em que cada uma começa no resultado. */
export function keptPieces(segments: readonly JoinSegment[], start: number, duration: number) {
  return segments.flatMap((segment) => {
    const from = Math.max(start, segment.start)
    const to = Math.min(start + duration, segment.end)
    return to > from ? [{ from, to, outputStart: from - segment.shift }] : []
  })
}
