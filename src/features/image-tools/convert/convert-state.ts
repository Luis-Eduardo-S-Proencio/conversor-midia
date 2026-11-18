import type { ImageFormat } from '../../../core/image/formats'
import { IMAGE_LIMITS, type InspectedImage } from '../../../core/image/inspect'
import { batchLimitMessage } from '../../../core/image/messages'

/**
 * Estado da tela de conversão: só metadados. Os arquivos e os resultados (Blobs) ficam fora
 * do estado do React, em referências do hook, para não pesar nas renderizações.
 */

export type ItemStatus = 'inspecting' | 'ready' | 'rejected' | 'queued' | 'converting' | 'done' | 'failed'

export interface ConvertItem {
  id: string
  name: string
  size: number
  status: ItemStatus
  image?: InspectedImage
  thumbnailUrl?: string
  previewUrl?: string
  /** Motivo da recusa ou da falha, já em texto para o usuário. */
  message?: string
  output?: { name: string; size: number }
}

export interface ConvertState {
  items: ConvertItem[]
  /** Arquivos que não couberam no limite do lote. */
  notice?: string
  /** Progresso da conversão em andamento. */
  run?: { total: number; completed: number }
}

export const INITIAL_CONVERT_STATE: ConvertState = { items: [] }

export type ConvertAction =
  | { type: 'added'; files: Array<{ id: string; name: string; size: number }>; overflow: number }
  | { type: 'inspected'; id: string; image: InspectedImage }
  | { type: 'previewed'; id: string; thumbnailUrl: string; previewUrl: string }
  | { type: 'rejected'; id: string; message: string }
  | { type: 'removed'; id: string }
  | { type: 'queued'; ids: string[] }
  | { type: 'converting'; id: string }
  | { type: 'converted'; id: string; output: { name: string; size: number } }
  | { type: 'failed'; id: string; message: string }
  | { type: 'finished' }
  | { type: 'cancelled' }
  | { type: 'invalidated' }
  | { type: 'reset' }

function patch(state: ConvertState, id: string, changes: Partial<ConvertItem>): ConvertState {
  return { ...state, items: state.items.map((item) => (item.id === id ? { ...item, ...changes } : item)) }
}

function advance(run: ConvertState['run']): ConvertState['run'] {
  return run && { ...run, completed: run.completed + 1 }
}

export function convertReducer(state: ConvertState, action: ConvertAction): ConvertState {
  switch (action.type) {
    case 'added':
      return {
        ...state,
        items: [...state.items, ...action.files.map((file) => ({ ...file, status: 'inspecting' as const }))],
        notice: action.overflow > 0 ? batchLimitMessage(action.overflow, IMAGE_LIMITS.maxFiles) : undefined,
      }
    case 'inspected':
      return patch(state, action.id, { image: action.image })
    case 'previewed':
      return patch(state, action.id, { status: 'ready', thumbnailUrl: action.thumbnailUrl, previewUrl: action.previewUrl })
    case 'rejected':
      return patch(state, action.id, { status: 'rejected', message: action.message })
    case 'removed':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) }
    case 'queued':
      return {
        ...state,
        notice: undefined,
        run: { total: action.ids.length, completed: 0 },
        items: state.items.map((item) => (action.ids.includes(item.id) ? { ...item, status: 'queued' } : item)),
      }
    case 'converting':
      return patch(state, action.id, { status: 'converting' })
    case 'converted':
      return { ...patch(state, action.id, { status: 'done', output: action.output }), run: advance(state.run) }
    case 'failed':
      return { ...patch(state, action.id, { status: 'failed', message: action.message }), run: advance(state.run) }
    case 'finished':
      return { ...state, run: undefined }
    case 'cancelled':
      return {
        ...state,
        run: undefined,
        items: state.items.map((item) =>
          item.status === 'queued' || item.status === 'converting' ? { ...item, status: 'ready' } : item,
        ),
      }
    case 'invalidated':
      return {
        ...state,
        items: state.items.map((item) => (item.status === 'done' ? { ...item, status: 'ready', output: undefined } : item)),
      }
    case 'reset':
      return INITIAL_CONVERT_STATE
  }
}

export interface ConvertSummary {
  inspecting: number
  ready: number
  done: number
  failed: number
  isConverting: boolean
  /** Há algo para converter e nada sendo preparado. */
  canConvert: boolean
  /** A conversão terminou e há resultados para baixar. */
  hasResults: boolean
  hasTransparency: boolean
  formats: ImageFormat[]
}

export function summarize(items: readonly ConvertItem[]): ConvertSummary {
  const count = (status: ItemStatus) => items.filter((item) => item.status === status).length
  const inspecting = count('inspecting')
  const ready = count('ready')
  const done = count('done')
  const isConverting = items.some((item) => item.status === 'queued' || item.status === 'converting')
  const valid = items.filter((item) => item.status !== 'rejected' && item.image)
  return {
    inspecting,
    ready,
    done,
    failed: count('failed'),
    isConverting,
    canConvert: ready > 0 && inspecting === 0 && !isConverting,
    hasResults: done > 0 && ready === 0 && inspecting === 0 && !isConverting,
    hasTransparency: valid.some((item) => item.image?.hasAlpha),
    formats: valid.flatMap((item) => (item.image ? [item.image.format] : [])),
  }
}
