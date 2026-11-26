import {
  DEFAULT_COLLAGE_STYLE,
  DEFAULT_FRAMING,
  clampPlacement,
  normalizeColor,
  scatterPlacements,
  type CollageMode,
  type CollageRatio,
  type CollageStyle,
  type Framing,
  type FreePlacement,
  type Size,
} from '../../../core/image/collage'

/**
 * Como a colagem está montada: só escolhas e números. As fotos (arquivos e prévias) ficam na base das
 * ferramentas de imagem; aqui elas aparecem só pelo id.
 */
export interface CollageState {
  mode: CollageMode
  ratio: CollageRatio
  /** Layout escolhido para cada número de fotos: tirar uma foto e pôr de volta mantém a escolha. */
  layouts: Partial<Record<number, string>>
  /** Ids na ordem dos espaços da grade. */
  order: string[]
  /** Ids de baixo para cima, no estilo livre (a última fica por cima). */
  stack: string[]
  framing: Record<string, Framing>
  placement: Record<string, FreePlacement>
  style: CollageStyle
  /** Foto marcada: na grade, a que vai trocar de lugar; no estilo livre, a que está sendo ajustada. */
  selected?: string
  /**
   * A pessoa já mexeu em alguma foto do estilo livre. Até lá, a disposição é refeita com todas as fotos
   * (elas chegam uma de cada vez, e a primeira não pode ficar com o tamanho de foto única).
   */
  freeTouched: boolean
  /** A pessoa já trocou fotos de lugar na grade. Até lá, a ordem é a da escolha dos arquivos. */
  orderTouched: boolean
}

export const INITIAL_COLLAGE_STATE: CollageState = {
  mode: 'grid',
  ratio: '1:1',
  layouts: {},
  order: [],
  stack: [],
  framing: {},
  placement: {},
  style: DEFAULT_COLLAGE_STYLE,
  freeTouched: false,
  orderTouched: false,
}

export type PhotoSize = { id: string } & Size

export type CollageAction =
  /** As fotos prontas mudaram (abertas, tiradas): entram no fim, e as que saíram somem de tudo. */
  | { type: 'sync'; photos: readonly PhotoSize[] }
  | { type: 'mode'; mode: CollageMode }
  /** `photos`: para espalhar de novo na proporção nova, se a pessoa ainda não mexeu no estilo livre. */
  | { type: 'ratio'; ratio: CollageRatio; photos: readonly PhotoSize[] }
  | { type: 'layout'; count: number; id: string }
  | { type: 'style'; style: Partial<CollageStyle> }
  | { type: 'select'; id?: string }
  /** Troca duas fotos de lugar na grade (e desmarca). */
  | { type: 'swap'; a: string; b: string }
  | { type: 'framing'; id: string; framing: Framing }
  | { type: 'placement'; id: string; placement: FreePlacement }
  | { type: 'front'; id: string }
  | { type: 'back'; id: string }
  /** Espalha todas as fotos de novo, como ao abrir o estilo livre. */
  | { type: 'scatter'; photos: readonly PhotoSize[] }
  | { type: 'reset' }

function pick<T>(record: Record<string, T>, ids: readonly string[]): Record<string, T> {
  return Object.fromEntries(ids.flatMap((id) => (id in record ? [[id, record[id] as T]] : [])))
}

function sync(state: CollageState, photos: readonly PhotoSize[]): CollageState {
  const ids = photos.map((photo) => photo.id)
  const present = new Set(ids)
  const keep = (list: readonly string[]) => list.filter((id) => present.has(id))
  const added = ids.filter((id) => !state.order.includes(id))
  if (added.length === 0 && ids.length === state.order.length && ids.length === state.stack.length) return state

  // As fotos ficam prontas uma de cada vez: sem arrumação da pessoa, a ordem é a da escolha, não a de chegada.
  const order = state.orderTouched ? [...keep(state.order), ...added] : ids
  const stack = state.freeTouched ? [...keep(state.stack), ...added] : ids
  const framing = pick(state.framing, ids)
  for (const id of added) framing[id] = DEFAULT_FRAMING

  // Sem mexida da pessoa, todas se espalham de novo; depois, as novas ocupam os lugares que lhes caberiam.
  const scattered = scatter(stack, photos, state.ratio)
  const placement = state.freeTouched ? pick(state.placement, ids) : {}
  stack.forEach((id, index) => {
    const spot = scattered[index]
    if (!(id in placement) && spot) placement[id] = spot
  })

  const selected = state.selected && present.has(state.selected) ? state.selected : undefined
  return { ...state, order, stack, framing, placement, selected }
}

function scatter(stack: readonly string[], photos: readonly PhotoSize[], ratio: CollageRatio): FreePlacement[] {
  const byId = new Map(photos.map((photo) => [photo.id, photo]))
  return scatterPlacements(stack.map((id) => byId.get(id) ?? { width: 1, height: 1 }), ratio)
}

function placementsOf(stack: readonly string[], spots: readonly FreePlacement[]): Record<string, FreePlacement> {
  return Object.fromEntries(stack.flatMap((id, index) => (spots[index] ? [[id, spots[index]]] : [])))
}

function moveTo(list: readonly string[], id: string, end: 'front' | 'back'): string[] {
  if (!list.includes(id)) return [...list]
  const rest = list.filter((item) => item !== id)
  return end === 'front' ? [...rest, id] : [id, ...rest]
}

export function collageReducer(state: CollageState, action: CollageAction): CollageState {
  switch (action.type) {
    case 'sync':
      return sync(state, action.photos)
    case 'mode':
      return action.mode === state.mode ? state : { ...state, mode: action.mode, selected: undefined }
    case 'ratio':
      if (state.freeTouched) return { ...state, ratio: action.ratio }
      return { ...state, ratio: action.ratio, placement: placementsOf(state.stack, scatter(state.stack, action.photos, action.ratio)) }
    case 'layout':
      return { ...state, layouts: { ...state.layouts, [action.count]: action.id } }
    case 'style':
      return {
        ...state,
        style: { ...state.style, ...action.style, ...(action.style.color !== undefined && { color: normalizeColor(action.style.color) }) },
      }
    case 'select':
      if (!action.id) return { ...state, selected: undefined }
      // No estilo livre, a foto tocada vem para a frente, como num monte de fotos de verdade.
      return { ...state, selected: action.id, stack: state.mode === 'free' ? moveTo(state.stack, action.id, 'front') : state.stack }
    case 'swap': {
      const a = state.order.indexOf(action.a)
      const b = state.order.indexOf(action.b)
      if (a < 0 || b < 0 || a === b) return { ...state, selected: undefined }
      const order = [...state.order]
      order[a] = action.b
      order[b] = action.a
      // O enquadramento era de um espaço com outro formato: a foto chega centralizada no novo.
      const framing = { ...state.framing, [action.a]: DEFAULT_FRAMING, [action.b]: DEFAULT_FRAMING }
      return { ...state, order, framing, selected: undefined, orderTouched: true }
    }
    case 'framing':
      return { ...state, framing: { ...state.framing, [action.id]: action.framing } }
    case 'placement':
      return { ...state, placement: { ...state.placement, [action.id]: clampPlacement(action.placement) }, freeTouched: true }
    case 'front':
      return { ...state, stack: moveTo(state.stack, action.id, 'front') }
    case 'back':
      return { ...state, stack: moveTo(state.stack, action.id, 'back') }
    case 'scatter':
      return { ...state, placement: placementsOf(state.stack, scatter(state.stack, action.photos, state.ratio)), selected: undefined, freeTouched: false }
    case 'reset':
      return INITIAL_COLLAGE_STATE
  }
}
