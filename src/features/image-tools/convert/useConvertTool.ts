import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { defaultTargetFormat } from '../../../core/image/formats'
import { IMAGE_LIMITS, inspectImageFile, type Inspection } from '../../../core/image/inspect'
import { batchLimitMessage, processingErrorMessage, rejectionMessage } from '../../../core/image/messages'
import { outputFileName, uniqueFileNames } from '../../../core/image/output-name'
import { ImageJobError, createImageWorkerClient, isAbortError, type ImageWorkerClient } from '../../../workers/image-client'
import { INITIAL_CONVERT_STATE, convertReducer, summarize } from './convert-state'
import {
  BACKGROUND_COLORS,
  DEFAULT_PREFERENCES,
  PREVIEW_SIZE,
  THUMBNAIL_SIZE,
  ZIP_NAME,
  type ConvertPreferences,
  type ConvertSettings,
} from './settings'

let lastId = 0
const nextId = () => `arquivo-${(lastId += 1)}`

const errorCode = (error: unknown) => (error instanceof ImageJobError ? error.code : 'unexpected')

type PrepareResult = 'ready' | 'rejected' | 'cancelled'

/** Resumo para o leitor de tela depois de preparar os arquivos: inclui as recusas, que a lista mostra. */
function preparedAnnouncement(results: readonly PrepareResult[], skipped: number): string {
  const ready = results.filter((result) => result === 'ready').length
  const rejected = results.filter((result) => result === 'rejected').length
  const parts: string[] = []
  if (ready > 0) parts.push(ready === 1 ? '1 arquivo pronto para converter.' : `${ready} arquivos prontos para converter.`)
  if (rejected > 0) {
    parts.push(rejected === 1 ? '1 arquivo recusado; o motivo está na lista.' : `${rejected} arquivos recusados; os motivos estão na lista.`)
  }
  if (skipped > 0) parts.push(batchLimitMessage(skipped, IMAGE_LIMITS.maxFiles))
  return parts.join(' ')
}

function finishedAnnouncement(converted: number, total: number): string {
  if (converted === 0) return 'Nenhuma imagem pôde ser convertida.'
  if (converted < total) return `${converted} de ${total} imagens convertidas. As demais tiveram erro.`
  return total === 1 ? 'Imagem convertida. Pronta para baixar.' : `${total} imagens convertidas. Prontas para baixar.`
}

/**
 * Orquestra a ferramenta: valida, gera prévias, converte um arquivo por vez e entrega os resultados.
 * Arquivos, resultados e URLs temporárias ficam em referências (fora do estado do React) e são
 * liberados ao remover, recomeçar ou sair da tela.
 */
export function useConvertTool() {
  const [state, dispatch] = useReducer(convertReducer, INITIAL_CONVERT_STATE)
  const [preferences, setPreferences] = useState<ConvertPreferences>(DEFAULT_PREFERENCES)
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

  const summary = useMemo(() => summarize(state.items), [state.items])

  // Formato efetivo: a escolha da pessoa ou a sugestão pelos arquivos. Sem codificador WEBP
  // no navegador, a escolha por WEBP cai para a sugestão.
  const settings = useMemo<ConvertSettings>(() => {
    const canEncodeWebp = webpSupported !== false
    const chosen = preferences.target
    const usable = chosen !== undefined && (chosen !== 'webp' || canEncodeWebp)
    const target = usable ? chosen : defaultTargetFormat(summary.formats, canEncodeWebp)
    return { target, quality: preferences.quality, background: preferences.background }
  }, [preferences, summary.formats, webpSupported])

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
      void Promise.all(accepted.map(({ id, file }) => prepare(id, file))).then((results) => {
        const summary = preparedAnnouncement(results, skipped)
        if (summary) setAnnouncement(summary)
      })
    },
    [prepare],
  )

  /** Resultados sempre refletem as opções atuais: mudou alguma, os prontos voltam para converter. */
  const invalidateResults = useCallback(() => {
    if (!items.current.some((item) => item.status === 'done')) return
    for (const item of items.current) if (item.status === 'done') results.current.delete(item.id)
    dispatch({ type: 'invalidated' })
  }, [])

  const updateSettings = useCallback(
    (changes: Partial<ConvertSettings>) => {
      setPreferences((current) => ({ ...current, ...changes }))
      invalidateResults()
    },
    [invalidateResults],
  )

  const convert = useCallback(async () => {
    const worker = client.current
    const ready = items.current.filter((item) => item.status === 'ready')
    if (!worker || ready.length === 0 || activeRun.current) return

    const controller = new AbortController()
    activeRun.current = controller
    const { target, quality, background } = settings
    // Fixa o formato usado: arquivos adicionados depois não mudam a sugestão e misturam resultados.
    setPreferences((current) => (current.target === target ? current : { ...current, target }))
    const taken = items.current.flatMap((item) => (item.status === 'done' && item.output ? [item.output.name] : []))
    const names = uniqueFileNames(ready.map((item) => outputFileName(item.name, target)), taken)
    dispatch({ type: 'queued', ids: ready.map((item) => item.id) })
    setAnnouncement(ready.length === 1 ? 'Convertendo a imagem…' : `Convertendo ${ready.length} imagens…`)

    let converted = 0
    for (const [index, item] of ready.entries()) {
      if (controller.signal.aborted) break
      const file = files.current.get(item.id)
      const name = names[index] ?? outputFileName(item.name, target)
      if (!file) {
        dispatch({ type: 'failed', id: item.id, message: processingErrorMessage('unexpected') })
        continue
      }
      dispatch({ type: 'converting', id: item.id })
      try {
        const output = await worker.run(
          { kind: 'convert', file, target, quality: quality / 100, background: BACKGROUND_COLORS[background] },
          controller.signal,
        )
        results.current.set(item.id, new File([output.blob], name, { type: output.blob.type }))
        dispatch({ type: 'converted', id: item.id, output: { name, size: output.blob.size } })
        converted += 1
      } catch (error) {
        if (isAbortError(error)) break
        dispatch({ type: 'failed', id: item.id, message: processingErrorMessage(errorCode(error)) })
      }
    }

    activeRun.current = null
    if (controller.signal.aborted) {
      dispatch({ type: 'cancelled' })
      setAnnouncement('Conversão cancelada.')
      return
    }
    dispatch({ type: 'finished' })
    setAnnouncement(finishedAnnouncement(converted, ready.length))
    setCompletedRuns((count) => count + 1)
  }, [settings])

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
    // Recomeçar volta a sugerir o formato pelos próximos arquivos; qualidade e fundo continuam.
    setPreferences((current) => ({ ...current, target: undefined }))
    dispatch({ type: 'reset' })
    setAnnouncement('')
  }, [releaseAll])

  const getResultFile = useCallback((id: string) => results.current.get(id), [])

  const getResultFiles = useCallback(
    () => items.current.flatMap((item) => results.current.get(item.id) ?? []),
    [],
  )

  const createZip = useCallback(async () => {
    const worker = client.current
    if (!worker) throw new Error('Worker de imagens indisponível')
    const entries = getResultFiles().map((file) => ({ name: file.name, blob: file }))
    const output = await worker.run({ kind: 'zip', entries })
    return { blob: output.blob, name: ZIP_NAME }
  }, [getResultFiles])

  return {
    items: state.items,
    notice: state.notice,
    run: state.run,
    summary,
    settings,
    webpSupported,
    announcement,
    completedRuns,
    addFiles,
    remove,
    reset,
    convert,
    cancel,
    updateSettings,
    invalidateResults,
    getResultFile,
    getResultFiles,
    createZip,
  }
}
