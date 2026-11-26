import { describe, expect, it } from 'vitest'
import { DEFAULT_FRAMING } from '../../../core/image/collage'
import { INITIAL_COLLAGE_STATE, collageReducer, type CollageAction, type CollageState, type PhotoSize } from './collage-state'

const photo = (id: string, width = 1000, height = 800): PhotoSize => ({ id, width, height })

function apply(...actions: CollageAction[]): CollageState {
  return actions.reduce(collageReducer, INITIAL_COLLAGE_STATE)
}

describe('estado da colagem', () => {
  it('fotos novas entram no fim da grade e do monte; as que saem somem de tudo', () => {
    const state = apply({ type: 'sync', photos: [photo('a'), photo('b')] }, { type: 'sync', photos: [photo('a'), photo('b'), photo('c')] })
    expect(state.order).toEqual(['a', 'b', 'c'])
    expect(state.stack).toEqual(['a', 'b', 'c'])
    expect(state.framing.c).toEqual(DEFAULT_FRAMING)

    const removed = collageReducer({ ...state, selected: 'b' }, { type: 'sync', photos: [photo('a'), photo('c')] })
    expect(removed.order).toEqual(['a', 'c'])
    expect(Object.keys(removed.framing)).toEqual(['a', 'c'])
    expect(Object.keys(removed.placement)).toEqual(['a', 'c'])
    expect(removed.selected).toBeUndefined()
  })

  it('sem mudança nas fotos, devolve o mesmo estado (nada é redesenhado)', () => {
    const state = apply({ type: 'sync', photos: [photo('a'), photo('b')] })
    expect(collageReducer(state, { type: 'sync', photos: [photo('a'), photo('b')] })).toBe(state)
  })

  it('trocar duas fotos de lugar desmarca e centraliza as duas nos espaços novos', () => {
    const state = apply(
      { type: 'sync', photos: [photo('a'), photo('b'), photo('c')] },
      { type: 'framing', id: 'a', framing: { focusX: 0.1, focusY: 0.2, zoom: 2 } },
      { type: 'select', id: 'a' },
      { type: 'swap', a: 'a', b: 'c' },
    )
    expect(state.order).toEqual(['c', 'b', 'a'])
    expect(state.framing.a).toEqual(DEFAULT_FRAMING)
    expect(state.selected).toBeUndefined()
  })

  it('no estilo livre, a foto marcada vem para a frente; "mandar para trás" a leva para o fundo', () => {
    const state = apply({ type: 'sync', photos: [photo('a'), photo('b'), photo('c')] }, { type: 'mode', mode: 'free' }, { type: 'select', id: 'a' })
    expect(state.stack).toEqual(['b', 'c', 'a'])
    expect(state.order).toEqual(['a', 'b', 'c']) // a grade não muda
    expect(collageReducer(state, { type: 'back', id: 'a' }).stack).toEqual(['a', 'b', 'c'])
  })

  it('as fotos se espalham de novo a cada chegada até a pessoa mexer em uma; depois, as novas só se encaixam', () => {
    const one = apply({ type: 'sync', photos: [photo('a')] })
    const two = collageReducer(one, { type: 'sync', photos: [photo('a'), photo('b')] })
    // A primeira não fica com o tamanho de foto única quando chega a segunda.
    expect(two.placement.a?.width).toBeLessThan(one.placement.a?.width ?? 0)

    const moved = collageReducer(two, { type: 'placement', id: 'a', placement: { x: 0.2, y: 0.3, width: 0.5, rotation: 0 } })
    expect(moved.freeTouched).toBe(true)
    const three = collageReducer(moved, { type: 'sync', photos: [photo('a'), photo('b'), photo('c')] })
    expect(three.placement.a).toEqual({ x: 0.2, y: 0.3, width: 0.5, rotation: 0 })
    expect(three.placement.c).toBeDefined()

    const scattered = collageReducer(three, { type: 'scatter', photos: [photo('a'), photo('b'), photo('c')] })
    expect(scattered.freeTouched).toBe(false)
    expect(scattered.placement.a).not.toEqual({ x: 0.2, y: 0.3, width: 0.5, rotation: 0 })
  })

  it('posição fora do quadro é trazida para dentro', () => {
    const state = apply({ type: 'sync', photos: [photo('a')] }, { type: 'placement', id: 'a', placement: { x: 2, y: -1, width: 0.5, rotation: 0 } })
    expect(state.placement.a).toMatchObject({ x: 1, y: 0 })
  })

  it('o layout escolhido fica guardado por número de fotos, e a cor inválida vira branco', () => {
    const state = apply({ type: 'layout', count: 3, id: '3-direita' }, { type: 'style', style: { color: 'azul' } })
    expect(state.layouts[3]).toBe('3-direita')
    expect(state.style.color).toBe('#ffffff')
    expect(collageReducer(state, { type: 'style', style: { color: '#FF6699' } }).style.color).toBe('#ff6699')
  })

  it('trocar de estilo desmarca a foto; recomeçar volta ao início', () => {
    const state = apply({ type: 'sync', photos: [photo('a')] }, { type: 'select', id: 'a' }, { type: 'mode', mode: 'free' })
    expect(state.selected).toBeUndefined()
    expect(collageReducer(state, { type: 'reset' })).toBe(INITIAL_COLLAGE_STATE)
  })
})

describe('ordem das fotos', () => {
  it('sem troca da pessoa, segue a ordem da escolha, mesmo que as fotos fiquem prontas fora de ordem', () => {
    const late = apply({ type: 'sync', photos: [photo('b')] }, { type: 'sync', photos: [photo('a'), photo('b')] })
    expect(late.order).toEqual(['a', 'b'])
    expect(late.stack).toEqual(['a', 'b'])
  })

  it('depois de uma troca, as fotos novas entram no fim sem desfazer a arrumação', () => {
    const swapped = apply({ type: 'sync', photos: [photo('a'), photo('b')] }, { type: 'swap', a: 'a', b: 'b' })
    expect(swapped.orderTouched).toBe(true)
    expect(collageReducer(swapped, { type: 'sync', photos: [photo('a'), photo('b'), photo('c')] }).order).toEqual(['b', 'a', 'c'])
  })
})
