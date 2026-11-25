/**
 * Editar vídeo: os pedaços que ficam (em segundos do vídeo original, em ordem e sem sobreposição), as
 * operações da barra (dividir, marcar a parte a tirar e excluí-la), desfazer e refazer, a conversão entre o tempo do
 * vídeo editado (os pedaços encostados um no outro) e o do original, e o que salvar. Funções puras: sem
 * React nem DOM.
 */
import { mergeRanges } from './remove'
import { MIN_TRIM_SECONDS, TIME_TOLERANCE, type TrimRange } from './trim'

export interface Piece extends TrimRange {
  /** Identifica o pedaço na tela (seleção), mesmo depois de outros saírem. */
  id: number
}

export interface Edit {
  pieces: Piece[]
  nextId: number
}

/** O vídeo inteiro, num pedaço só. */
export const initialEdit = (duration: number): Edit => ({ pieces: [{ id: 1, start: 0, end: duration }], nextId: 2 })

/** Duração do vídeo editado: a soma dos pedaços. */
export const editedDuration = (pieces: readonly TrimRange[]) => pieces.reduce((total, piece) => total + piece.end - piece.start, 0)

/** Onde cada pedaço começa no vídeo editado. */
export function pieceOffsets(pieces: readonly TrimRange[]): number[] {
  let offset = 0
  return pieces.map((piece) => {
    const start = offset
    offset += piece.end - piece.start
    return start
  })
}

/**
 * Pedaço e tempo do original para um ponto do vídeo editado. Na emenda, já vale o pedaço seguinte; depois
 * do fim, o fim do último.
 */
export function sourceTimeAt(pieces: readonly TrimRange[], editedTime: number): { index: number; time: number } {
  const offsets = pieceOffsets(pieces)
  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    const piece = pieces[index] as TrimRange
    const offset = offsets[index] ?? 0
    if (editedTime >= offset || index === 0) {
      return { index, time: Math.min(piece.end, piece.start + Math.max(0, editedTime - offset)) }
    }
  }
  return { index: 0, time: 0 }
}

/** Ponto do vídeo editado para um tempo do original. Em parte excluída: o começo do pedaço seguinte (ou o fim). */
export function editedTimeAt(pieces: readonly TrimRange[], sourceTime: number): number {
  const offsets = pieceOffsets(pieces)
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index] as TrimRange
    const offset = offsets[index] ?? 0
    if (sourceTime < piece.start) return offset
    if (sourceTime <= piece.end) return offset + sourceTime - piece.start
  }
  return editedDuration(pieces)
}

/** O pedaço que o ponto divide e onde, quando fica ao menos 0,1 s de cada lado. */
function splitPoint(edit: Edit, editedTime: number): { index: number; time: number } | null {
  const { index, time } = sourceTimeAt(edit.pieces, editedTime)
  const piece = edit.pieces[index]
  if (!piece) return null
  const fits = time - piece.start >= MIN_TRIM_SECONDS - TIME_TOLERANCE && piece.end - time >= MIN_TRIM_SECONDS - TIME_TOLERANCE
  return fits ? { index, time } : null
}

export const canSplitAt = (edit: Edit, editedTime: number) => splitPoint(edit, editedTime) !== null

/** Divide o pedaço no ponto do vídeo editado; `null` quando o ponto fica a menos de 0,1 s de uma ponta. */
export function splitAt(edit: Edit, editedTime: number): Edit | null {
  const point = splitPoint(edit, editedTime)
  if (!point) return null
  const piece = edit.pieces[point.index] as Piece
  const pieces = [...edit.pieces]
  pieces.splice(point.index, 1, { ...piece, end: point.time }, { id: edit.nextId, start: point.time, end: piece.end })
  return { pieces, nextId: edit.nextId + 1 }
}

/** Tira o pedaço; `null` para o último que sobra (o vídeo ficaria vazio). */
export type Edge = 'start' | 'end'

/**
 * A parte marcada para sair, dentro de um pedaço, em tempo do vídeo original. Tocar num pedaço marca
 * ele inteiro; as alças encolhem a marca até cobrir só o que deve sair; "Excluir" tira essa parte.
 */
export interface Selection extends TrimRange {
  /** O pedaço onde a parte está. */
  id: number
}

/** Marca o pedaço inteiro (o primeiro passo ao tocar num pedaço). */
export function selectPiece(edit: Edit, id: number): Selection | undefined {
  const piece = edit.pieces.find((item) => item.id === id)
  return piece ? { id, start: piece.start, end: piece.end } : undefined
}

/** Até onde uma ponta da marca anda: dentro do pedaço, sem a marca ficar menor que 0,1 s. */
export function selectionLimits(edit: Edit, selection: Selection, edge: Edge): { min: number; max: number } {
  const piece = edit.pieces.find((item) => item.id === selection.id)
  if (!piece) return { min: selection.start, max: selection.end }
  const round = (value: number) => Math.round(value * 1000) / 1000
  if (edge === 'start') return { min: piece.start, max: round(selection.end - MIN_TRIM_SECONDS) }
  return { min: round(selection.start + MIN_TRIM_SECONDS), max: piece.end }
}

/** Move uma ponta da marca para o tempo pedido do original, dentro dos limites. */
export function moveSelectionEdge(edit: Edit, selection: Selection, edge: Edge, sourceTime: number): Selection {
  const { min, max } = selectionLimits(edit, selection, edge)
  return { ...selection, [edge]: Math.min(max, Math.max(min, sourceTime)) }
}

/**
 * Tira do vídeo a parte marcada: o pedaço some inteiro, perde uma ponta ou vira dois (antes e depois da
 * parte). Sobra menor que 0,1 s sai junto, em vez de virar um pedaço que ninguém consegue tocar.
 * `null` quando não sobraria vídeo nenhum.
 */
export function removeSelection(edit: Edit, selection: Selection): Edit | null {
  const index = edit.pieces.findIndex((piece) => piece.id === selection.id)
  const piece = edit.pieces[index]
  if (!piece) return null
  const keepBefore = selection.start - piece.start >= MIN_TRIM_SECONDS - TIME_TOLERANCE
  const keepAfter = piece.end - selection.end >= MIN_TRIM_SECONDS - TIME_TOLERANCE
  const rest: Piece[] = []
  if (keepBefore) rest.push({ ...piece, end: selection.start })
  if (keepAfter) rest.push({ id: keepBefore ? edit.nextId : piece.id, start: selection.end, end: piece.end })
  const pieces = [...edit.pieces]
  pieces.splice(index, 1, ...rest)
  if (pieces.length === 0) return null
  return { pieces, nextId: keepBefore && keepAfter ? edit.nextId + 1 : edit.nextId }
}

/** Dá para excluir a parte marcada sem apagar o vídeo inteiro. */
export const canRemoveSelection = (edit: Edit, selection: Selection | undefined): boolean =>
  selection !== undefined && removeSelection(edit, selection) !== null

export type SavePlan = { kind: 'unchanged' } | { kind: 'trim'; range: TrimRange } | { kind: 'join'; ranges: TrimRange[] }

/**
 * O que salvar. Pedaços encostados (só divididos) voltam a ser um. Um trecho só é um corte comum, que pode
 * copiar sem refazer; vários são juntados (e refeitos).
 */
export function savePlan(edit: Edit, duration: number): SavePlan {
  const ranges = mergeRanges(edit.pieces, duration)
  const [only] = ranges
  if (ranges.length === 1 && only) {
    const whole = only.start <= TIME_TOLERANCE && only.end >= duration - TIME_TOLERANCE
    return whole ? { kind: 'unchanged' } : { kind: 'trim', range: only }
  }
  return { kind: 'join', ranges }
}

/* Desfazer e refazer */

export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

/** Passos guardados para desfazer. */
const MAX_HISTORY = 100

export const startHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] })

/** Mudança nova: o estado atual vai para o passado, e o que podia ser refeito se perde. */
export const commit = <T>({ past, present }: History<T>, next: T): History<T> => ({
  past: [...past, present].slice(-MAX_HISTORY),
  present: next,
  future: [],
})

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...future] = history.future
  if (next === undefined) return history
  return { past: [...history.past, history.present], present: next, future }
}

/* Miniaturas da barra */

/** Qual das `count` miniaturas (espalhadas por igual pelo vídeo) mostra o tempo pedido. */
export const thumbnailCell = (sourceTime: number, duration: number, count: number) =>
  Math.min(count - 1, Math.max(0, Math.floor((sourceTime / duration) * count)))

export interface Tile {
  /** Posição do pedaço na lista. */
  piece: number
  /** Distância, em pixels, do começo do pedaço até a miniatura. */
  left: number
  /** Tempo do original no começo da miniatura. */
  source: number
}

/**
 * Miniaturas a desenhar na janela visível da barra (de `viewStart` a `viewEnd`, em pixels do vídeo editado),
 * cada uma presa ao seu pedaço. Só as visíveis: num vídeo longo com zoom, a barra inteira teria milhares.
 */
export function visibleTiles(pieces: readonly TrimRange[], pixelsPerSecond: number, tileWidth: number, viewStart: number, viewEnd: number): Tile[] {
  const tiles: Tile[] = []
  const offsets = pieceOffsets(pieces)
  pieces.forEach((piece, index) => {
    const pieceLeft = (offsets[index] ?? 0) * pixelsPerSecond
    const pieceWidth = (piece.end - piece.start) * pixelsPerSecond
    if (pieceLeft + pieceWidth <= viewStart || pieceLeft >= viewEnd) return
    const first = Math.max(0, Math.floor((viewStart - pieceLeft) / tileWidth))
    for (let left = first * tileWidth; left < pieceWidth && pieceLeft + left < viewEnd; left += tileWidth) {
      tiles.push({ piece: index, left, source: piece.start + left / pixelsPerSecond })
    }
  })
  return tiles
}
