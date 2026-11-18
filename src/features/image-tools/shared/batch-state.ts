import type { ImageFormat } from '../../../core/image/formats'
import { IMAGE_LIMITS, type InspectedImage } from '../../../core/image/inspect'
import { batchLimitMessage } from '../../../core/image/messages'

/**
 * Estado de uma ferramenta de imagens em lote: só metadados. Os arquivos e os resultados (Blobs)
 * ficam fora do estado do React, em referências do hook, para não pesar nas renderizações.
 */

export type ItemStatus = 'inspecting' | 'ready' | 'rejected' | 'queued' | 'processing' | 'done' | 'failed'

export interface BatchOutputInfo {
  name: string
  size: number
  /** Observação sobre o resultado (ex.: "mantida a original"). */
  note?: string
}

export interface BatchItem {
  id: string
  name: string
  size: number
  status: ItemStatus
  image?: InspectedImage
  thumbnailUrl?: string
  previewUrl?: string
  /** Motivo da recusa ou da falha, já em texto para o usuário. */
  message?: string
  output?: BatchOutputInfo
}

export interface BatchState {
  items: BatchItem[]
  /** Arquivos que não couberam no limite do lote. */
  notice?: string
  /** Progresso do processamento em andamento. */
  run?: { total: number; completed: number }
}

export const INITIAL_BATCH_STATE: BatchState = { items: [] }

export type BatchAction =
  | { type: 'added'; files: Array<{ id: string; name: string; size: number }>; overflow: number }
  | { type: 'inspected'; id: string; image: InspectedImage }
  | { type: 'previewed'; id: string; thumbnailUrl: string; previewUrl: string }
  | { type: 'rejected'; id: string; message: string }
  | { type: 'removed'; id: string }
  | { type: 'queued'; ids: string[] }
  | { type: 'processing'; id: string }
  | { type: 'processed'; id: string; output: BatchOutputInfo }
  | { type: 'failed'; id: string; message: string }
  | { type: 'finished' }
  | { type: 'cancelled' }
  | { type: 'invalidated' }
  | { type: 'reset' }

function patch(state: BatchState, id: string, changes: Partial<BatchItem>): BatchState {
  return { ...state, items: state.items.map((item) => (item.id === id ? { ...item, ...changes } : item)) }
}

function advance(run: BatchState['run']): BatchState['run'] {
  return run && { ...run, completed: run.completed + 1 }
}

export function batchReducer(state: BatchState, action: BatchAction): BatchState {
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
    case 'processing':
      return patch(state, action.id, { status: 'processing' })
    case 'processed':
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
          item.status === 'queued' || item.status === 'processing' ? { ...item, status: 'ready' } : item,
        ),
      }
    case 'invalidated':
      return {
        ...state,
        items: state.items.map((item) => (item.status === 'done' ? { ...item, status: 'ready', output: undefined } : item)),
      }
    case 'reset':
      return INITIAL_BATCH_STATE
  }
}

export interface BatchSummary {
  inspecting: number
  ready: number
  done: number
  failed: number
  isProcessing: boolean
  /** Há algo para processar e nada sendo preparado. */
  canStart: boolean
  /** O processamento terminou e há resultados para baixar. */
  hasResults: boolean
  hasTransparency: boolean
  formats: ImageFormat[]
}

export function summarizeBatch(items: readonly BatchItem[]): BatchSummary {
  const count = (status: ItemStatus) => items.filter((item) => item.status === status).length
  const inspecting = count('inspecting')
  const ready = count('ready')
  const done = count('done')
  const isProcessing = items.some((item) => item.status === 'queued' || item.status === 'processing')
  const valid = items.filter((item) => item.status !== 'rejected' && item.image)
  return {
    inspecting,
    ready,
    done,
    failed: count('failed'),
    isProcessing,
    canStart: ready > 0 && inspecting === 0 && !isProcessing,
    hasResults: done > 0 && ready === 0 && inspecting === 0 && !isProcessing,
    hasTransparency: valid.some((item) => item.image?.hasAlpha),
    formats: valid.flatMap((item) => (item.image ? [item.image.format] : [])),
  }
}
