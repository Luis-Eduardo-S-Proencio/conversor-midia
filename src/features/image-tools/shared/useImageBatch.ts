import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { IMAGE_LIMITS, inspectImageFile, type Inspection } from '../../../core/image/inspect'
import { batchLimitMessage, processingErrorMessage, rejectionMessage } from '../../../core/image/messages'
import { uniqueFileNames } from '../../../core/image/output-name'
import { ImageJobError, createImageWorkerClient, isAbortError, type ImageWorkerClient } from '../../../workers/image-client'
import { BatchItemError, type BatchProcess } from './batch-process'
import { INITIAL_BATCH_STATE, batchReducer, summarizeBatch } from './batch-state'
import { PREVIEW_SIZE, THUMBNAIL_SIZE, type BatchLabels } from './constants'

let lastId = 0
const nextId = () => `arquivo-${(lastId += 1)}`

const errorCode = (error: unknown) => (error instanceof ImageJobError ? error.code : 'unexpected')

type PrepareResult = 'ready' | 'rejected' | 'cancelled'

/** Resumo para o leitor de tela depois de preparar os arquivos: inclui as recusas, que a lista mostra. */
function preparedAnnouncement(results: readonly PrepareResult[], skipped: number, labels: BatchLabels): string {
  const ready = results.filter((result) => result === 'ready').length
  const rejected = results.filter((result) => result === 'rejected').length
  const action = labels.action.toLowerCase()
  const parts: string[] = []
  if (ready > 0) parts.push(ready === 1 ? `1 arquivo pronto para ${action}.` : `${ready} arquivos prontos para ${action}.`)
  if (rejected > 0) {
    parts.push(rejected === 1 ? '1 arquivo recusado; o motivo está na lista.' : `${rejected} arquivos recusados; os motivos estão na lista.`)
  }
  if (skipped > 0) parts.push(batchLimitMessage(skipped, IMAGE_LIMITS.maxFiles))
  return parts.join(' ')
}

function finishedAnnouncement(succeeded: number, total: number, labels: BatchLabels): string {
  if (succeeded === 0) return 'Nenhuma imagem pôde ser processada.'
  if (succeeded < total) return `${succeeded} de ${total} imagens ${labels.done}s. As demais tiveram erro.`
  return total === 1 ? `Imagem ${labels.done}. Pronta para baixar.` : `${total} imagens ${labels.done}s. Prontas para baixar.`
}

/**
 * Base de toda ferramenta de imagens em lote: valida, gera prévias, processa um arquivo por vez
 * e entrega os resultados. Arquivos, resultados e URLs temporárias ficam em referências (fora do
 * estado do React) e são liberados ao remover, recomeçar ou sair da tela.
 * `labels` deve ser uma constante do módulo da ferramenta.
 */
export function useImageBatch(labels: BatchLabels) {
  const [state, dispatch] = useReducer(batchReducer, INITIAL_BATCH_STATE)
  const [webpSupported, setWebpSupported] = useState<boolean>()
  const [announcement, setAnnouncement] = useState('')
  const [completedRuns, setCompletedRuns] = useState(0)

  const client = useRef<ImageWorkerClient | null>(null)
  const files = useRef(new Map<string, File>())
  const results = useRef(new Map<string, File>())
  const objectUrls = useRef(new Map<string, string[]>())
  const preparing = useRef(new Map<string, AbortController>())
  const activeRun = useRef<AbortController | null>(null)
  const items = useRef(state.items)

  useEffect(() => {
    items.current = state.items
  }, [state.items])

  const summary = useMemo(() => summarizeBatch(state.items), [state.items])

  const releaseItem = useCallback((id: string) => {
    preparing.current.get(id)?.abort()
    preparing.current.delete(id)
    for (const url of objectUrls.current.get(id) ?? []) URL.revokeObjectURL(url)
    objectUrls.current.delete(id)
    files.current.delete(id)
    results.current.delete(id)
  }, [])

  const releaseAll = useCallback(() => {
    const ids = new Set([...files.current.keys(), ...objectUrls.current.keys(), ...results.current.keys()])
    for (const id of ids) releaseItem(id)
  }, [releaseItem])

  useEffect(() => {
    const instance = createImageWorkerClient()
    client.current = instance
    instance.run({ kind: 'probe' }).then(
      (output) => setWebpSupported(output.webpEncoding),
      (error: unknown) => {
        if (!isAbortError(error)) setWebpSupported(false)
      },
    )
    return () => {
      activeRun.current?.abort()
      releaseAll()
      instance.dispose()
      client.current = null
    }
  }, [releaseAll])

  const prepare = useCallback(async (id: string, file: File): Promise<PrepareResult> => {
    const controller = new AbortController()
    preparing.current.set(id, controller)
    try {
      let inspection: Inspection
      try {
        inspection = await inspectImageFile(file)
      } catch {
        inspection = { ok: false, reason: { code: 'corrupt' } } // arquivo ilegível (ex.: removido do disco)
      }
      if (controller.signal.aborted) return 'cancelled'
      if (!inspection.ok) {
        files.current.delete(id)
        dispatch({ type: 'rejected', id, message: rejectionMessage(inspection.reason) })
        return 'rejected'
      }
      dispatch({ type: 'inspected', id, image: inspection.image })

      const worker = client.current
      if (!worker) return 'cancelled'
      // A prévia também prova que o arquivo decodifica: se falhar, ele é recusado já aqui.
      const output = await worker.run({ kind: 'preview', file, previewSize: PREVIEW_SIZE, thumbnailSize: THUMBNAIL_SIZE }, controller.signal)
      const thumbnailUrl = URL.createObjectURL(output.thumbnail)
      const previewUrl = URL.createObjectURL(output.preview)
      objectUrls.current.set(id, [thumbnailUrl, previewUrl])
      dispatch({ type: 'previewed', id, thumbnailUrl, previewUrl })
      return 'ready'
    } catch (error) {
      if (isAbortError(error)) return 'cancelled'
      files.current.delete(id)
      dispatch({ type: 'rejected', id, message: processingErrorMessage(errorCode(error)) })
      return 'rejected'
    } finally {
      preparing.current.delete(id)
    }
  }, [])

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0 || activeRun.current) return
      const room = Math.max(0, IMAGE_LIMITS.maxFiles - items.current.length)
      const accepted = incoming.slice(0, room).map((file) => ({ id: nextId(), file }))
      const skipped = incoming.length - accepted.length
      for (const { id, file } of accepted) files.current.set(id, file)
      dispatch({ type: 'added', files: accepted.map(({ id, file }) => ({ id, name: file.name, size: file.size })), overflow: skipped })
      setAnnouncement(accepted.length === 1 ? 'Preparando 1 arquivo…' : `Preparando ${accepted.length} arquivos…`)
      void Promise.all(accepted.map(({ id, file }) => prepare(id, file))).then((outcomes) => {
        const text = preparedAnnouncement(outcomes, skipped, labels)
        if (text) setAnnouncement(text)
      })
    },
    [prepare, labels],
  )

  /** Resultados sempre refletem as opções atuais: mudou alguma, os prontos voltam para a fila. */
  const invalidateResults = useCallback(() => {
    if (!items.current.some((item) => item.status === 'done')) return
    for (const item of items.current) if (item.status === 'done') results.current.delete(item.id)
    dispatch({ type: 'invalidated' })
  }, [])

  const run = useCallback(
    async (process: BatchProcess) => {
      const worker = client.current
      const ready = items.current.filter((item) => item.status === 'ready')
      if (!worker || ready.length === 0 || activeRun.current) return

      const controller = new AbortController()
      activeRun.current = controller
      const taken = items.current.flatMap((item) => (item.status === 'done' && item.output ? [item.output.name] : []))
      dispatch({ type: 'queued', ids: ready.map((item) => item.id) })
      setAnnouncement(ready.length === 1 ? `${labels.progress} a imagem…` : `${labels.progress} ${ready.length} imagens…`)

      let succeeded = 0
      for (const item of ready) {
        if (controller.signal.aborted) break
        const file = files.current.get(item.id)
        if (!file) {
          dispatch({ type: 'failed', id: item.id, message: processingErrorMessage('unexpected') })
          continue
        }
        dispatch({ type: 'processing', id: item.id })
        try {
          const output = await process(file, item, { client: worker, signal: controller.signal })
          const [name = output.name] = uniqueFileNames([output.name], taken)
          taken.push(name)
          results.current.set(item.id, new File([output.blob], name, { type: output.blob.type }))
          dispatch({ type: 'processed', id: item.id, output: { name, size: output.blob.size, note: output.note } })
          succeeded += 1
        } catch (error) {
          if (isAbortError(error)) break
          const message = error instanceof BatchItemError ? error.message : processingErrorMessage(errorCode(error))
          dispatch({ type: 'failed', id: item.id, message })
        }
      }

      activeRun.current = null
      if (controller.signal.aborted) {
        dispatch({ type: 'cancelled' })
        setAnnouncement(`${labels.noun} cancelada.`)
        return
      }
      dispatch({ type: 'finished' })
      setAnnouncement(finishedAnnouncement(succeeded, ready.length, labels))
      setCompletedRuns((count) => count + 1)
    },
    [labels],
  )

  const cancel = useCallback(() => activeRun.current?.abort(), [])

  const remove = useCallback(
    (id: string) => {
      if (activeRun.current) return
      releaseItem(id)
      dispatch({ type: 'removed', id })
    },
    [releaseItem],
  )

  const reset = useCallback(() => {
    activeRun.current?.abort()
    releaseAll()
    dispatch({ type: 'reset' })
    setAnnouncement('')
  }, [releaseAll])

  const getResultFile = useCallback((id: string) => results.current.get(id), [])

  const getResultFiles = useCallback(
    () => items.current.flatMap((item) => results.current.get(item.id) ?? []),
    [],
  )

  const createZip = useCallback(
    async (zipName: string) => {
      const worker = client.current
      if (!worker) throw new Error('Worker de imagens indisponível')
      const entries = getResultFiles().map((file) => ({ name: file.name, blob: file }))
      const output = await worker.run({ kind: 'zip', entries })
      return { blob: output.blob, name: zipName }
    },
    [getResultFiles],
  )

  return {
    items: state.items,
    notice: state.notice,
    progress: state.run,
    summary,
    webpSupported,
    announcement,
    completedRuns,
    addFiles,
    remove,
    reset,
    run,
    cancel,
    invalidateResults,
    getResultFile,
    getResultFiles,
    createZip,
  }
}

export type ImageBatch = ReturnType<typeof useImageBatch>
