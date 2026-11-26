import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  COLLAGE_LIMITS,
  FREE_FRAME_COLOR,
  planCollage,
  resolveLayout,
  type CollagePhoto,
  type CollageSpec,
} from '../../../core/image/collage'
import { reencodeQuality } from '../../../core/image/jpeg-quality'
import type { ProcessingErrorCode } from '../../../core/image/messages'
import { ImageJobError, createImageWorkerClient, isAbortError, type ImageWorkerClient } from '../../../workers/image-client'
import type { BatchItem } from '../shared/batch-state'
import type { BatchLabels } from '../shared/constants'
import { useImageBatch } from '../shared/useImageBatch'
import { INITIAL_COLLAGE_STATE, collageReducer, type PhotoSize } from './collage-state'

export const COLLAGE_LABELS: BatchLabels = {
  action: 'Criar colagem',
  progress: 'Montando',
  done: 'montada',
  noun: 'Colagem',
}

/** Qualidade do JPG final: alta, mas nunca acima da foto JPG mais caprichada (senão o arquivo pesa à toa). */
const BASE_QUALITY = 0.9

export const COLLAGE_FILE_NAME = 'colagem.jpg'

export interface CollagePhotoView extends CollagePhoto {
  id: string
  name: string
  previewUrl: string
}

export type CollagePhase = 'editing' | 'rendering' | 'done'

export interface CollageResult {
  name: string
  size: number
  width: number
  height: number
  url: string
}

/** O que dizer quando a colagem não sai: falta de memória e foto ilegível têm saída própria. */
export function collageErrorMessage(code: ProcessingErrorCode): string {
  if (code === 'canvas-unavailable') return 'Este aparelho não tem memória suficiente para montar esta colagem. Tente com menos fotos ou em um computador.'
  if (code === 'decode-failed') return 'Não foi possível ler uma das fotos. Tire essa foto e tente de novo.'
  return 'Não foi possível montar a colagem. Tente de novo.'
}

function isReady(item: BatchItem): item is BatchItem & { image: NonNullable<BatchItem['image']>; previewUrl: string } {
  return item.status === 'ready' && Boolean(item.image) && Boolean(item.previewUrl)
}

/**
 * A colagem: as fotos (pela base das ferramentas de imagem, até 9), como estão montadas e o arquivo final,
 * gerado no Worker a partir do mesmo plano que a tela mostra. O resultado fica numa referência, fora do
 * estado do React, e a URL temporária dele é liberada ao editar de novo, recomeçar ou sair.
 */
export function useCollage() {
  const batch = useImageBatch(COLLAGE_LABELS, { maxFiles: COLLAGE_LIMITS.maxPhotos })
  const [state, dispatch] = useReducer(collageReducer, INITIAL_COLLAGE_STATE)
  const [phase, setPhase] = useState<CollagePhase>('editing')
  const [result, setResult] = useState<CollageResult>()
  const [error, setError] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const [completedRuns, setCompletedRuns] = useState(0)

  const client = useRef<ImageWorkerClient | null>(null)
  const resultFile = useRef<File | null>(null)
  const resultUrl = useRef<string | null>(null)
  const running = useRef<AbortController | null>(null)

  const ready = useMemo(() => batch.items.filter(isReady), [batch.items])
  const sizes = useMemo<PhotoSize[]>(() => ready.map((item) => ({ id: item.id, width: item.image.width, height: item.image.height })), [ready])

  // Sem mudança real nas fotos prontas, o redutor devolve o mesmo estado e nada é redesenhado.
  useEffect(() => dispatch({ type: 'sync', photos: sizes }), [sizes])

  const dropResult = useCallback(() => {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
    resultUrl.current = null
    resultFile.current = null
    setResult(undefined)
  }, [])

  useEffect(
    () => () => {
      running.current?.abort()
      client.current?.dispose()
      client.current = null
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
    },
    [],
  )

  /** Fotos na ordem do modo atual (espaços da grade, ou de baixo para cima no estilo livre). */
  const photos = useMemo<CollagePhotoView[]>(() => {
    const byId = new Map(ready.map((item) => [item.id, item]))
    const ids = state.mode === 'grid' ? state.order : state.stack
    return ids.flatMap((id) => {
      const item = byId.get(id)
      const framing = state.framing[id]
      const placement = state.placement[id]
      if (!item || !framing || !placement) return []
      return [{ id, name: item.name, previewUrl: item.previewUrl, width: item.image.width, height: item.image.height, framing, placement }]
    })
  }, [ready, state.mode, state.order, state.stack, state.framing, state.placement])

  const layout = resolveLayout(photos.length, state.layouts[photos.length])

  const spec = useMemo<CollageSpec>(
    () => ({ mode: state.mode, ratio: state.ratio, layoutId: layout?.id, photos, style: state.style }),
    [state.mode, state.ratio, layout?.id, photos, state.style],
  )
  const plan = useMemo(() => planCollage(spec), [spec])

  const preparing = batch.items.some((item) => item.status === 'inspecting')
  const canCreate = phase === 'editing' && photos.length >= COLLAGE_LIMITS.minPhotos && !preparing

  const create = useCallback(async () => {
    if (!canCreate || running.current) return
    const pieces = plan.pieces.flatMap((piece) => {
      const photo = photos[piece.index]
      const file = photo && batch.getFile(photo.id)
      if (!file) return []
      return [{ file, box: piece.box, radius: piece.radius, border: piece.border, borderColor: FREE_FRAME_COLOR, source: piece.source }]
    })
    if (pieces.length !== photos.length) return

    const quality = Math.max(...ready.map((item) => reencodeQuality(BASE_QUALITY, item.image, 'jpeg')))
    const controller = new AbortController()
    running.current = controller
    client.current ??= createImageWorkerClient()
    setError(undefined)
    setPhase('rendering')
    setAnnouncement('Montando a colagem…')
    try {
      const output = await client.current.run(
        { kind: 'collage', width: plan.width, height: plan.height, background: plan.background, quality, shadow: plan.shadow, pieces },
        controller.signal,
      )
      const file = new File([output.blob], COLLAGE_FILE_NAME, { type: output.blob.type })
      dropResult()
      resultFile.current = file
      resultUrl.current = URL.createObjectURL(file)
      setResult({ name: file.name, size: file.size, width: output.width, height: output.height, url: resultUrl.current })
      setPhase('done')
      setAnnouncement('Colagem pronta para baixar.')
      setCompletedRuns((count) => count + 1)
    } catch (caught) {
      setPhase('editing')
      if (isAbortError(caught)) {
        setAnnouncement('Colagem cancelada.')
        return
      }
      if (import.meta.env.DEV) console.error(caught)
      const message = collageErrorMessage(caught instanceof ImageJobError ? caught.code : 'unexpected')
      setError(message)
      setAnnouncement(message)
    } finally {
      running.current = null
    }
  }, [canCreate, plan, photos, ready, batch, dropResult])

  const cancel = useCallback(() => running.current?.abort(), [])

  /** Volta à montagem, com tudo como estava (o arquivo pronto é descartado). */
  const edit = useCallback(() => {
    dropResult()
    setPhase('editing')
  }, [dropResult])

  const reset = useCallback(() => {
    running.current?.abort()
    dropResult()
    setError(undefined)
    setPhase('editing')
    dispatch({ type: 'reset' })
    batch.reset()
  }, [batch, dropResult])

  const { addFiles: addToBatch } = batch
  /** Fotos novas voltam à montagem (um resultado pronto não mostraria as novas). */
  const addFiles = useCallback(
    (files: File[]) => {
      if (running.current) return
      dropResult()
      setPhase('editing')
      addToBatch(files)
    },
    [addToBatch, dropResult],
  )

  const getResultFiles = useCallback(() => (resultFile.current ? [resultFile.current] : []), [])

  return {
    batch,
    state,
    dispatch,
    photos,
    layout,
    plan,
    phase,
    result,
    error,
    announcement,
    completedRuns,
    preparing,
    canCreate,
    addFiles,
    create,
    cancel,
    edit,
    reset,
    getResultFiles,
  }
}

export type Collage = ReturnType<typeof useCollage>
