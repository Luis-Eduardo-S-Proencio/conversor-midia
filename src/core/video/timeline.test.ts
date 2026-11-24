import { describe, expect, it } from 'vitest'
import {
  canRemoveSelection,
  canSplitAt,
  commit,
  editedDuration,
  editedTimeAt,
  initialEdit,
  moveSelectionEdge,
  pieceOffsets,
  redo,
  removeSelection,
  savePlan,
  selectPiece,
  selectionLimits,
  sourceTimeAt,
  splitAt,
  startHistory,
  thumbnailCell,
  undo,
  visibleTiles,
  type Edit,
  type Selection,
} from './timeline'

/** Vídeo de 10 s dividido em 2, 5 e 8 s: pedaços 0–2, 2–5, 5–8 e 8–10. */
function fourPieces(): Edit {
  let edit = initialEdit(10)
  for (const time of [2, 5, 8]) edit = splitAt(edit, time) ?? edit
  return edit
}

const ranges = (edit: Edit) => edit.pieces.map(({ start, end }) => [start, end])

/** Marca o pedaço inteiro da posição pedida. */
const whole = (edit: Edit, index: number): Selection => selectPiece(edit, edit.pieces[index]?.id ?? -1) as Selection

describe('dividir', () => {
  it('divide o pedaço no ponto da linha; os dois continuam encostados', () => {
    expect(ranges(fourPieces())).toEqual([
      [0, 2],
      [2, 5],
      [5, 8],
      [8, 10],
    ])
    expect(new Set(fourPieces().pieces.map((piece) => piece.id)).size).toBe(4)
  })

  it('não divide a menos de 0,1 s de uma ponta (pedaço pequeno demais)', () => {
    const edit = initialEdit(10)
    expect(canSplitAt(edit, 0.05)).toBe(false)
    expect(canSplitAt(edit, 9.95)).toBe(false)
    expect(splitAt(edit, 0.05)).toBeNull()
    expect(canSplitAt(edit, 0.1)).toBe(true)
  })

  it('o ponto é do vídeo editado: depois de excluir, divide no lugar certo do original', () => {
    const withoutSecond = removeSelection(fourPieces(), whole(fourPieces(), 1)) // tira 2–5
    expect(withoutSecond).not.toBeNull()
    // No editado, 3 s caem 1 s depois do começo do pedaço 5–8.
    const split = splitAt(withoutSecond as Edit, 3)
    expect(ranges(split as Edit)).toEqual([
      [0, 2],
      [5, 6],
      [6, 8],
      [8, 10],
    ])
  })
})

describe('marcar e excluir', () => {
  it('tocar num pedaço marca ele inteiro; excluir tira o pedaço e o vídeo encurta', () => {
    const edit = fourPieces()
    expect(whole(edit, 2)).toEqual({ id: edit.pieces[2]?.id, start: 5, end: 8 })
    const without = removeSelection(edit, whole(edit, 2)) as Edit
    expect(ranges(without)).toEqual([
      [0, 2],
      [2, 5],
      [8, 10],
    ])
    expect(editedDuration(without.pieces)).toBe(7)
  })

  it('a marca no meio do pedaço tira só aquela parte: o pedaço vira dois, sem precisar dividir', () => {
    const edit = initialEdit(10)
    const marked = { ...whole(edit, 0), start: 3, end: 6 }
    const without = removeSelection(edit, marked) as Edit
    expect(ranges(without)).toEqual([
      [0, 3],
      [6, 10],
    ])
    expect(new Set(without.pieces.map((piece) => piece.id)).size).toBe(2)
    expect(editedDuration(without.pieces)).toBe(7)
  })

  it('a marca encostada numa ponta tira o começo ou o fim do pedaço', () => {
    const edit = initialEdit(10)
    expect(ranges(removeSelection(edit, { ...whole(edit, 0), end: 4 }) as Edit)).toEqual([[4, 10]])
    expect(ranges(removeSelection(edit, { ...whole(edit, 0), start: 7 }) as Edit)).toEqual([[0, 7]])
  })

  it('sobra menor que 0,1 s sai junto com a parte marcada', () => {
    const edit = initialEdit(10)
    expect(ranges(removeSelection(edit, { ...whole(edit, 0), start: 0.05, end: 4 }) as Edit)).toEqual([[4, 10]])
  })

  it('não dá para tirar o vídeo inteiro', () => {
    const edit = initialEdit(10)
    expect(removeSelection(edit, whole(edit, 0))).toBeNull()
    expect(canRemoveSelection(edit, whole(edit, 0))).toBe(false)
    expect(canRemoveSelection(edit, { ...whole(edit, 0), end: 9 })).toBe(true)
    expect(canRemoveSelection(edit, undefined)).toBe(false)
  })
})

describe('alças da marca', () => {
  it('cada ponta anda dentro do pedaço, sem a marca ficar menor que 0,1 s', () => {
    const edit = fourPieces()
    const marked = { ...whole(edit, 1), start: 3, end: 4 } // pedaço 2–5
    expect(selectionLimits(edit, marked, 'start')).toEqual({ min: 2, max: 3.9 })
    expect(selectionLimits(edit, marked, 'end')).toEqual({ min: 3.1, max: 5 })
  })

  it('mover uma ponta respeita os limites e não mexe no vídeo', () => {
    const edit = fourPieces()
    const marked = whole(edit, 1) // 2–5
    expect(moveSelectionEdge(edit, marked, 'start', 3.5)).toMatchObject({ start: 3.5, end: 5 })
    expect(moveSelectionEdge(edit, marked, 'start', 0)).toMatchObject({ start: 2 }) // não sai do pedaço
    expect(moveSelectionEdge(edit, marked, 'end', 2)).toMatchObject({ start: 2, end: 2.1 }) // fica com 0,1 s
    expect(ranges(edit)[1]).toEqual([2, 5])
  })
})

describe('tempo editado e tempo do original', () => {
  const edit = removeSelection(fourPieces(), whole(fourPieces(), 1)) as Edit // 0–2, 5–8, 8–10

  it('onde cada pedaço começa no vídeo editado', () => {
    expect(pieceOffsets(edit.pieces)).toEqual([0, 2, 5])
  })

  it('do editado para o original e de volta', () => {
    expect(sourceTimeAt(edit.pieces, 1)).toEqual({ index: 0, time: 1 })
    expect(sourceTimeAt(edit.pieces, 2)).toEqual({ index: 1, time: 5 }) // a emenda já é o pedaço seguinte
    expect(sourceTimeAt(edit.pieces, 6)).toEqual({ index: 2, time: 9 })
    expect(sourceTimeAt(edit.pieces, 7)).toEqual({ index: 2, time: 10 }) // o fim
    expect(editedTimeAt(edit.pieces, 6)).toBe(3)
    expect(editedTimeAt(edit.pieces, 3)).toBe(2) // parte excluída: o começo do pedaço seguinte
    expect(editedTimeAt(edit.pieces, 12)).toBe(7)
  })
})

describe('salvar', () => {
  it('sem corte nenhum (ou só divisões), nada a salvar', () => {
    expect(savePlan(initialEdit(10), 10)).toEqual({ kind: 'unchanged' })
    expect(savePlan(fourPieces(), 10)).toEqual({ kind: 'unchanged' })
  })

  it('um trecho só: corte comum (pode copiar sem refazer)', () => {
    const edit = removeSelection(fourPieces(), whole(fourPieces(), 0)) as Edit
    expect(savePlan(edit, 10)).toEqual({ kind: 'trim', range: { start: 2, end: 10 } })
  })

  it('vários trechos: junta os pedaços, com os encostados unidos', () => {
    const edit = removeSelection(fourPieces(), whole(fourPieces(), 2)) as Edit
    expect(savePlan(edit, 10)).toEqual({
      kind: 'join',
      ranges: [
        { start: 0, end: 5 },
        { start: 8, end: 10 },
      ],
    })
  })
})

describe('desfazer e refazer', () => {
  it('volta e avança pelas mudanças; mudança nova apaga o que podia ser refeito', () => {
    let history = startHistory(1)
    history = commit(history, 2)
    history = commit(history, 3)
    history = undo(history)
    expect(history.present).toBe(2)
    history = redo(history)
    expect(history.present).toBe(3)
    history = undo(undo(history))
    expect(history.present).toBe(1)
    expect(undo(history)).toBe(history) // nada a desfazer
    history = commit(history, 4)
    expect(history.future).toEqual([])
    expect(redo(history)).toBe(history)
  })

  it('guarda no máximo 100 passos', () => {
    let history = startHistory(0)
    for (let step = 1; step <= 150; step += 1) history = commit(history, step)
    expect(history.past).toHaveLength(100)
  })
})

describe('miniaturas da barra', () => {
  it('cada tempo do original usa a miniatura do seu pedaço do vídeo', () => {
    expect(thumbnailCell(0, 10, 10)).toBe(0)
    expect(thumbnailCell(9.99, 10, 10)).toBe(9)
    expect(thumbnailCell(10, 10, 10)).toBe(9)
    expect(thumbnailCell(5, 10, 20)).toBe(10)
  })

  it('só as miniaturas visíveis, presas ao pedaço, com o tempo do original de cada uma', () => {
    const edit = removeSelection(fourPieces(), whole(fourPieces(), 1)) as Edit // 0–2, 5–8, 8–10
    // 10 px por segundo, miniaturas de 10 px (1 s); janela de 15 a 45 px do vídeo editado (1,5 a 4,5 s).
    const tiles = visibleTiles(edit.pieces, 10, 10, 15, 45)
    expect(tiles.map((tile) => [tile.piece, tile.left, tile.source])).toEqual([
      [0, 10, 1],
      [1, 0, 5],
      [1, 10, 6],
      [1, 20, 7],
    ])
  })
})
