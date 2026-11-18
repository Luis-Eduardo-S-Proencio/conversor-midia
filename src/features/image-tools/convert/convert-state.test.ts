import { describe, expect, it } from 'vitest'
import type { InspectedImage } from '../../../core/image/inspect'
import { INITIAL_CONVERT_STATE, convertReducer, summarize, type ConvertAction, type ConvertState } from './convert-state'

const png: InspectedImage = { format: 'png', width: 100, height: 80, hasAlpha: true, animated: false }
const jpeg: InspectedImage = { format: 'jpeg', width: 100, height: 80, hasAlpha: false, animated: false }

function apply(...actions: ConvertAction[]): ConvertState {
  return actions.reduce(convertReducer, INITIAL_CONVERT_STATE)
}

const added = (...ids: string[]): ConvertAction => ({
  type: 'added',
  files: ids.map((id) => ({ id, name: `${id}.png`, size: 1000 })),
  overflow: 0,
})
const ready = (id: string, image: InspectedImage = png): ConvertAction[] => [
  { type: 'inspected', id, image },
  { type: 'previewed', id, thumbnailUrl: `blob:t-${id}`, previewUrl: `blob:p-${id}` },
]

describe('convertReducer', () => {
  it('adiciona arquivos em preparação e avisa o excedente do limite', () => {
    const state = apply({ type: 'added', files: [{ id: 'a', name: 'a.png', size: 10 }], overflow: 2 })
    expect(state.items).toEqual([{ id: 'a', name: 'a.png', size: 10, status: 'inspecting' }])
    expect(state.notice).toBe('2 arquivos ficaram de fora: o limite é de 20 arquivos por vez.')
  })

  it('percorre o fluxo completo de um arquivo', () => {
    const state = apply(
      added('a'),
      ...ready('a'),
      { type: 'queued', ids: ['a'] },
      { type: 'converting', id: 'a' },
      { type: 'converted', id: 'a', output: { name: 'a.jpg', size: 400 } },
      { type: 'finished' },
    )
    expect(state.items[0]).toMatchObject({ status: 'done', image: png, thumbnailUrl: 'blob:t-a', output: { name: 'a.jpg', size: 400 } })
    expect(state.run).toBeUndefined()
  })

  it('conta o progresso do lote e uma falha não afeta os demais', () => {
    const state = apply(
      added('a', 'b', 'c'),
      ...ready('a'),
      ...ready('b'),
      ...ready('c'),
      { type: 'queued', ids: ['a', 'b', 'c'] },
      { type: 'converting', id: 'a' },
      { type: 'failed', id: 'a', message: 'Arquivo corrompido.' },
      { type: 'converting', id: 'b' },
      { type: 'converted', id: 'b', output: { name: 'b.jpg', size: 1 } },
    )
    expect(state.items.map((item) => item.status)).toEqual(['failed', 'done', 'queued'])
    expect(state.run).toEqual({ total: 3, completed: 2 })
  })

  it('cancelar devolve o que estava na fila ou em andamento e mantém os prontos', () => {
    const state = apply(
      added('a', 'b', 'c'),
      ...ready('a'),
      ...ready('b'),
      ...ready('c'),
      { type: 'queued', ids: ['a', 'b', 'c'] },
      { type: 'converting', id: 'a' },
      { type: 'converted', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'converting', id: 'b' },
      { type: 'cancelled' },
    )
    expect(state.items.map((item) => item.status)).toEqual(['done', 'ready', 'ready'])
    expect(state.run).toBeUndefined()
  })

  it('invalidar (opções mudaram) devolve os prontos para conversão e apaga a saída', () => {
    const state = apply(
      added('a'),
      ...ready('a'),
      { type: 'queued', ids: ['a'] },
      { type: 'converted', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'finished' },
      { type: 'invalidated' },
    )
    expect(state.items[0]?.status).toBe('ready')
    expect(state.items[0]?.output).toBeUndefined()
  })

  it('recusa, remove e reinicia', () => {
    const rejected = apply(added('a', 'b'), { type: 'rejected', id: 'a', message: 'O arquivo está vazio.' })
    expect(rejected.items[0]).toMatchObject({ status: 'rejected', message: 'O arquivo está vazio.' })
    expect(convertReducer(rejected, { type: 'removed', id: 'a' }).items.map((item) => item.id)).toEqual(['b'])
    expect(convertReducer(rejected, { type: 'reset' })).toEqual(INITIAL_CONVERT_STATE)
  })
})

describe('summarize', () => {
  it('só permite converter quando todos foram preparados e há algum pronto', () => {
    expect(summarize(apply(added('a', 'b'), ...ready('a')).items).canConvert).toBe(false)
    expect(summarize(apply(added('a', 'b'), ...ready('a'), ...ready('b')).items).canConvert).toBe(true)
    expect(summarize(apply(added('a'), { type: 'rejected', id: 'a', message: 'x' }).items).canConvert).toBe(false)
  })

  it('mostra resultados quando não há mais nada a converter', () => {
    const finished = apply(
      added('a', 'b'),
      ...ready('a'),
      { type: 'rejected', id: 'b', message: 'x' },
      { type: 'queued', ids: ['a'] },
      { type: 'converted', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'finished' },
    )
    expect(summarize(finished.items)).toMatchObject({ hasResults: true, canConvert: false, isConverting: false, done: 1 })
  })

  it('informa formatos e transparência dos arquivos válidos', () => {
    const items = apply(added('a', 'b', 'c'), ...ready('a', jpeg), ...ready('b', png), { type: 'rejected', id: 'c', message: 'x' }).items
    expect(summarize(items)).toMatchObject({ formats: ['jpeg', 'png'], hasTransparency: true })
    expect(summarize(apply(added('a'), ...ready('a', jpeg)).items).hasTransparency).toBe(false)
  })
})
