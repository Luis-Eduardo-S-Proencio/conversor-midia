import { describe, expect, it } from 'vitest'
import { joinSegments, keptPieces, keptRanges, mergeRanges, previewKept, segmentAt, totalDuration, validateRemovals } from './remove'

const part = (start: string, end: string) => ({ start, end })

describe('validateRemovals', () => {
  it('remover o meio deixa o começo e o fim', () => {
    expect(validateRemovals([part('0:05,00', '0:07,00')], 10)).toEqual({
      ok: true,
      removed: [{ start: 5, end: 7 }],
      kept: [
        { start: 0, end: 5 },
        { start: 7, end: 10 },
      ],
    })
  })

  it('várias partes, fora de ordem e sobrepostas, viram partes juntadas e em ordem', () => {
    const result = validateRemovals([part('0:06,00', '0:08,00'), part('0:01,00', '0:02,00'), part('0:07,00', '0:09,00')], 10)
    expect(result).toEqual({
      ok: true,
      removed: [
        { start: 1, end: 2 },
        { start: 6, end: 9 },
      ],
      kept: [
        { start: 0, end: 1 },
        { start: 2, end: 6 },
        { start: 9, end: 10 },
      ],
    })
  })

  it('parte que chega ao fim (mesmo arredondado) não deixa uma sobra mínima', () => {
    expect(validateRemovals([part('0:03,00', '0:04,01')], 4.011)).toMatchObject({ ok: true, kept: [{ start: 0, end: 3 }] })
    expect(validateRemovals([part('0:00,00', '0:01,00')], 4)).toMatchObject({ ok: true, kept: [{ start: 1, end: 4 }] })
  })

  it('valor errado: erro já ao digitar, na parte certa; com uma parte só, sem número', () => {
    expect(validateRemovals([part('abc', '0:02,00')], 10)).toEqual({
      ok: false,
      error: { message: 'Use minutos e segundos, como 1:05,30.', fields: ['start'], missing: false, part: 0 },
    })
    expect(validateRemovals([part('0:01,00', '0:02,00'), part('0:03,00', '0:12,00')], 10)).toEqual({
      ok: false,
      error: { message: 'Parte 2: o vídeo tem 0:10,00: o fim não pode passar disso.', fields: ['end'], missing: false, part: 1 },
    })
  })

  it('valor errado em qualquer parte vem antes de campo vazio em outra', () => {
    expect(validateRemovals([part('', ''), part('x', '0:02,00')], 10)).toMatchObject({ ok: false, error: { part: 1, missing: false } })
  })

  it('campo vazio só vira aviso ao tentar; início antes do fim; parte de pelo menos 0,1 s', () => {
    expect(validateRemovals([part('0:01,00', '')], 10)).toEqual({
      ok: false,
      error: { message: 'Preencha o fim.', fields: ['end'], missing: true, part: 0 },
    })
    expect(validateRemovals([part('0:01,00', '0:02,00'), part('0:05,00', '0:04,00')], 10)).toEqual({
      ok: false,
      error: { message: 'Parte 2: o início precisa vir antes do fim.', fields: ['start', 'end'], missing: false, part: 1 },
    })
    expect(validateRemovals([part('0:05,00', '0:05,05')], 10)).toMatchObject({
      ok: false,
      error: { message: 'A parte precisa ter pelo menos 0,1 segundo.' },
    })
  })

  it('não deixa remover o vídeo inteiro', () => {
    expect(validateRemovals([part('0:00,00', '0:06,00'), part('0:05,00', '0:10,00')], 10)).toEqual({
      ok: false,
      error: { message: 'Assim o vídeo inteiro seria removido. Deixe pelo menos 0,1 segundo.', fields: ['start', 'end'], missing: false, part: 1 },
    })
  })
})

describe('prévia na linha do tempo', () => {
  it('usa só as partes já preenchidas certo', () => {
    expect(previewKept([part('0:05,00', '0:07,00'), part('', ''), part('x', '0:01,00')], 10)).toEqual([
      { start: 0, end: 5 },
      { start: 7, end: 10 },
    ])
    expect(previewKept([part('', '')], 10)).toEqual([{ start: 0, end: 10 }])
  })
})

describe('partes que ficam', () => {
  it('juntar e complementar', () => {
    expect(mergeRanges([{ start: 2, end: 3 }, { start: 1, end: 2 }], 10)).toEqual([{ start: 1, end: 3 }])
    expect(keptRanges([{ start: 0, end: 2 }, { start: 8, end: 10 }], 10)).toEqual([{ start: 2, end: 8 }])
    expect(totalDuration([{ start: 0, end: 5 }, { start: 7, end: 10 }])).toBe(8)
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
