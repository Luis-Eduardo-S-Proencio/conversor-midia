import { describe, expect, it } from 'vitest'
import {
  canSplitAt,
  commit,
  deletePiece,
  editedDuration,
  editedTimeAt,
  edgeLimits,
  initialEdit,
  moveEdge,
  pieceOffsets,
  redo,
  savePlan,
  sourceTimeAt,
  splitAt,
  startHistory,
  thumbnailCell,
  undo,
  visibleTiles,
  type Edit,
} from './timeline'

/** Vídeo de 10 s dividido em 2, 5 e 8 s: pedaços 0–2, 2–5, 5–8 e 8–10. */
function fourPieces(): Edit {
  let edit = initialEdit(10)
  for (const time of [2, 5, 8]) edit = splitAt(edit, time) ?? edit
  return edit
}

const ranges = (edit: Edit) => edit.pieces.map(({ start, end }) => [start, end])

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
    const withoutSecond = deletePiece(fourPieces(), fourPieces().pieces[1]?.id ?? -1) // tira 2–5
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

describe('excluir', () => {
  it('tira o pedaço; o vídeo editado encurta', () => {
    const edit = fourPieces()
    const without = deletePiece(edit, edit.pieces[2]?.id ?? -1) as Edit
    expect(ranges(without)).toEqual([
      [0, 2],
      [2, 5],
      [8, 10],
    ])
    expect(editedDuration(without.pieces)).toBe(7)
  })

  it('o último pedaço não sai: o vídeo ficaria vazio', () => {
    const edit = initialEdit(10)
    expect(deletePiece(edit, edit.pieces[0]?.id ?? -1)).toBeNull()
  })
})

describe('pontas', () => {
  it('cada ponta anda até o pedaço vizinho (ou o começo e o fim do vídeo), sem passar da outra ponta', () => {
    let edit = fourPieces()
    const [first, second, third] = edit.pieces
    edit = deletePiece(edit, second?.id ?? -1) as Edit // tira 2–5: o pedaço 5–8 pode voltar até 2
    expect(edgeLimits(edit, third?.id ?? -1, 'start', 10)).toEqual({ min: 2, max: 7.9 })
    expect(edgeLimits(edit, third?.id ?? -1, 'end', 10)).toEqual({ min: 5.1, max: 8 })
    expect(edgeLimits(edit, first?.id ?? -1, 'start', 10)).toEqual({ min: 0, max: 1.9 })
  })

  it('mover uma ponta respeita os limites', () => {
    const edit = deletePiece(fourPieces(), fourPieces().pieces[1]?.id ?? -1) as Edit
    const id = edit.pieces[1]?.id ?? -1 // 5–8
    expect(ranges(moveEdge(edit, id, 'start', 3.5, 10))[1]).toEqual([3.5, 8])
    expect(ranges(moveEdge(edit, id, 'start', 0, 10))[1]).toEqual([2, 8]) // não invade o pedaço 0–2
    expect(ranges(moveEdge(edit, id, 'end', 5, 10))[1]).toEqual([5, 5.1]) // fica com 0,1 s
  })
})

describe('tempo editado e tempo do original', () => {
  const edit = deletePiece(fourPieces(), fourPieces().pieces[1]?.id ?? -1) as Edit // 0–2, 5–8, 8–10

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
    const edit = deletePiece(fourPieces(), fourPieces().pieces[0]?.id ?? -1) as Edit
    expect(savePlan(edit, 10)).toEqual({ kind: 'trim', range: { start: 2, end: 10 } })
  })

  it('vários trechos: junta os pedaços, com os encostados unidos', () => {
    const edit = deletePiece(fourPieces(), fourPieces().pieces[2]?.id ?? -1) as Edit
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
    const edit = deletePiece(fourPieces(), fourPieces().pieces[1]?.id ?? -1) as Edit // 0–2, 5–8, 8–10
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
