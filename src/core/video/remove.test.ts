import { describe, expect, it } from 'vitest'
import { joinSegments, keptPieces, mergeRanges, segmentAt } from './remove'

describe('pedaços encostados', () => {
  it('viram um só, em ordem, encostando no começo e no fim do vídeo os que quase chegam lá', () => {
    expect(mergeRanges([{ start: 2, end: 3 }, { start: 1, end: 2 }], 10)).toEqual([{ start: 1, end: 3 }])
    expect(mergeRanges([{ start: 0.003, end: 4 }, { start: 6, end: 9.998 }], 10)).toEqual([
      { start: 0, end: 4 },
      { start: 6, end: 10 },
    ])
  })
})

describe('emenda no Worker', () => {
  // Vídeo de 10 s sem 5–7 s: o Worker recebe os quadros com tempos a partir do primeiro pedaço (aqui, 0).
  const segments = joinSegments([
    { start: 0, end: 5 },
    { start: 7, end: 10 },
  ])

  it('cada pedaço anda para trás o quanto foi removido antes dele', () => {
    expect(segments).toEqual([
      { start: 0, end: 5, shift: 0 },
      { start: 7, end: 10, shift: 2 },
    ])
    expect(joinSegments([{ start: 1, end: 2 }, { start: 3, end: 4 }])).toEqual([
      { start: 0, end: 1, shift: 0 },
      { start: 2, end: 3, shift: 1 },
    ])
  })

  it('quadro da parte removida some; os outros encostam', () => {
    expect(segmentAt(segments, 4.9)).toEqual(segments[0])
    expect(segmentAt(segments, 5)).toBeNull()
    expect(segmentAt(segments, 6.99)).toBeNull()
    expect(segmentAt(segments, 7)).toEqual(segments[1])
  })

  it('bloco de som que atravessa a emenda é dividido, e as partes ficam contínuas no resultado', () => {
    expect(keptPieces(segments, 4.99, 0.02)).toEqual([{ from: 4.99, to: 5, outputStart: 4.99 }])
    expect(keptPieces(segments, 6.99, 0.02)).toEqual([{ from: 7, to: 7.01, outputStart: 5 }])
    expect(keptPieces(segments, 5.5, 0.02)).toEqual([])
  })
})
