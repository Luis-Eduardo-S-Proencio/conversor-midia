import { describe, expect, it } from 'vitest'
import type { InspectedImage } from '../../../core/image/inspect'
import { INITIAL_BATCH_STATE, batchReducer, summarizeBatch, type BatchAction, type BatchState } from './batch-state'

const png: InspectedImage = { format: 'png', width: 100, height: 80, hasAlpha: true, animated: false }
const jpeg: InspectedImage = { format: 'jpeg', width: 100, height: 80, hasAlpha: false, animated: false }

function apply(...actions: BatchAction[]): BatchState {
  return actions.reduce(batchReducer, INITIAL_BATCH_STATE)
}

const added = (...ids: string[]): BatchAction => ({
  type: 'added',
  files: ids.map((id) => ({ id, name: `${id}.png`, size: 1000 })),
  overflow: 0,
})
const ready = (id: string, image: InspectedImage = png): BatchAction[] => [
  { type: 'inspected', id, image },
  { type: 'previewed', id, thumbnailUrl: `blob:t-${id}`, previewUrl: `blob:p-${id}`, width: image.width, height: image.height },
]

describe('batchReducer', () => {
  it('adiciona arquivos em preparação e avisa o excedente do limite', () => {
    const state = apply({ type: 'added', files: [{ id: 'a', name: 'a.png', size: 10 }], overflow: 2 })
    expect(state.items).toEqual([{ id: 'a', name: 'a.png', size: 10, status: 'inspecting' }])
    expect(state.notice).toBe('2 arquivos ficaram de fora: o limite é de 20 arquivos por vez.')
  })

  it('percorre o fluxo completo de um arquivo, guardando a observação do resultado', () => {
    const state = apply(
      added('a'),
      ...ready('a'),
      { type: 'queued', ids: ['a'] },
      { type: 'processing', id: 'a' },
      { type: 'processed', id: 'a', output: { name: 'a.jpg', size: 400, note: 'Mantida a original.' } },
      { type: 'finished' },
    )
    expect(state.items[0]).toMatchObject({
      status: 'done',
      image: png,
      thumbnailUrl: 'blob:t-a',
      output: { name: 'a.jpg', size: 400, note: 'Mantida a original.' },
    })
    expect(state.run).toBeUndefined()
  })

  it('a prévia troca as medidas do cabeçalho pelas da imagem decodificada, já na posição em que aparece', () => {
    // PNG com orientação nos metadados: o cabeçalho diz 100 × 80, mas a imagem aparece em pé.
    const state = apply(added('a'), { type: 'inspected', id: 'a', image: png }, {
      type: 'previewed',
      id: 'a',
      thumbnailUrl: 'blob:t-a',
      previewUrl: 'blob:p-a',
      width: 80,
      height: 100,
    })
    expect(state.items[0]).toMatchObject({ status: 'ready', image: { ...png, width: 80, height: 100 } })
  })

  it('conta o progresso do lote e uma falha não afeta os demais', () => {
    const state = apply(
      added('a', 'b', 'c'),
      ...ready('a'),
      ...ready('b'),
      ...ready('c'),
      { type: 'queued', ids: ['a', 'b', 'c'] },
      { type: 'processing', id: 'a' },
      { type: 'failed', id: 'a', message: 'Arquivo corrompido.' },
      { type: 'processing', id: 'b' },
      { type: 'processed', id: 'b', output: { name: 'b.jpg', size: 1 } },
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
      { type: 'processing', id: 'a' },
      { type: 'processed', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'processing', id: 'b' },
      { type: 'cancelled' },
    )
    expect(state.items.map((item) => item.status)).toEqual(['done', 'ready', 'ready'])
    expect(state.run).toBeUndefined()
  })

  it('invalidar (opções mudaram) devolve os prontos para processamento e apaga a saída', () => {
    const state = apply(
      added('a'),
      ...ready('a'),
      { type: 'queued', ids: ['a'] },
      { type: 'processed', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'finished' },
      { type: 'invalidated' },
    )
    expect(state.items[0]?.status).toBe('ready')
    expect(state.items[0]?.output).toBeUndefined()
  })

  it('recusa, remove e reinicia', () => {
    const rejected = apply(added('a', 'b'), { type: 'rejected', id: 'a', message: 'O arquivo está vazio.' })
    expect(rejected.items[0]).toMatchObject({ status: 'rejected', message: 'O arquivo está vazio.' })
    expect(batchReducer(rejected, { type: 'removed', id: 'a' }).items.map((item) => item.id)).toEqual(['b'])
    expect(batchReducer(rejected, { type: 'reset' })).toEqual(INITIAL_BATCH_STATE)
  })
})

describe('summarizeBatch', () => {
  it('só permite começar quando todos foram preparados e há algum pronto', () => {
    expect(summarizeBatch(apply(added('a', 'b'), ...ready('a')).items).canStart).toBe(false)
    expect(summarizeBatch(apply(added('a', 'b'), ...ready('a'), ...ready('b')).items).canStart).toBe(true)
    expect(summarizeBatch(apply(added('a'), { type: 'rejected', id: 'a', message: 'x' }).items).canStart).toBe(false)
  })

  it('mostra resultados quando não há mais nada a processar', () => {
    const finished = apply(
      added('a', 'b'),
      ...ready('a'),
      { type: 'rejected', id: 'b', message: 'x' },
      { type: 'queued', ids: ['a'] },
      { type: 'processed', id: 'a', output: { name: 'a.jpg', size: 1 } },
      { type: 'finished' },
    )
    expect(summarizeBatch(finished.items)).toMatchObject({ hasResults: true, canStart: false, isProcessing: false, done: 1 })
  })

  it('informa formatos e transparência dos arquivos válidos', () => {
    const items = apply(added('a', 'b', 'c'), ...ready('a', jpeg), ...ready('b', png), { type: 'rejected', id: 'c', message: 'x' }).items
    expect(summarizeBatch(items)).toMatchObject({ formats: ['jpeg', 'png'], hasTransparency: true })
    expect(summarizeBatch(apply(added('a'), ...ready('a', jpeg)).items).hasTransparency).toBe(false)
  })
})
