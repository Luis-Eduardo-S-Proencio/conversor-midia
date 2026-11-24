/**
 * Juntar os pedaços que ficam de um vídeo (Editar vídeo): pedaços encostados viram um, e onde cada
 * pedaço vai parar no resultado, para o Worker. Funções puras: sem React nem DOM.
 */
import { TIME_TOLERANCE, type TrimRange } from './trim'

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
