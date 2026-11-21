import { useCallback, useEffect, useRef, useState } from 'react'
import { checkVideoFile, type VideoCheck } from '../../../core/video/inspect'
import { videoErrorMessage, videoRejectionMessage } from '../../../core/video/messages'
import { VideoJobError, createVideoWorkerClient, isAbortError, type VideoWorkerClient } from '../../../workers/video-client'
import type { CropJob, JoinJob, TrimJob, VideoInfo } from '../../../workers/video-protocol'

/** Textos que mudam de uma ferramenta de vídeo para outra ("Cortar" / "Recortar"). */
export interface VideoToolLabels {
  /** Verbo da ação principal: "Cortar". */
  action: string
  /** Gerúndio para o progresso: "Cortando". */
  progress: string
  /** Particípio no masculino: "cortado" ("Vídeo cortado."). */
  done: string
  /** Substantivo masculino da operação: "Corte" ("Corte cancelado."). */
  noun: string
}

export type VideoPhase = 'empty' | 'opening' | 'rejected' | 'ready' | 'processing' | 'done' | 'failed'

export interface VideoToolState {
  phase: VideoPhase
  /** Muda a cada vídeo escolhido: as opções da ferramenta recomeçam com o vídeo novo. */
  fileId: number
  file?: { name: string; size: number }
  info?: VideoInfo
  /** URL temporária do vídeo escolhido, para o player. Liberada ao trocar de vídeo ou sair. */
  sourceUrl?: string
  /** Motivo da recusa ou da falha, em linguagem simples. */
  message?: string
  /** De 0 a 1, enquanto processa. */
  progress: number
  result?: { name: string; size: number }
  /** Aviso quando chegam vários arquivos: só o primeiro abre. */
  notice?: string
}

type ProcessJob = (file: File) => TrimJob | JoinJob | CropJob

const EMPTY: VideoToolState = { phase: 'empty', fileId: 0, progress: 0 }

const ONE_AT_A_TIME = 'Só o primeiro arquivo foi aberto: esta ferramenta trabalha com um vídeo por vez.'

const errorMessage = (error: unknown) => videoErrorMessage(error instanceof VideoJobError ? error.code : 'unexpected')

/**
 * Base das ferramentas de vídeo: um vídeo por vez. Valida pelo conteúdo, abre no Worker (formato,
 * duração, medidas e o que o navegador consegue fazer), processa com progresso e cancelamento e
 * entrega o resultado. O arquivo, o resultado e as URLs temporárias ficam em referências (fora do
 * estado do React) e são liberados ao trocar de vídeo, recomeçar ou sair da tela.
 * `labels` deve ser uma constante do módulo da ferramenta.
 */
export function useVideoTool(labels: VideoToolLabels) {
  const [state, setState] = useState<VideoToolState>(EMPTY)
  const [announcement, setAnnouncement] = useState('')
  const [completedRuns, setCompletedRuns] = useState(0)

  const client = useRef<VideoWorkerClient | null>(null)
  const file = useRef<File | null>(null)
  const result = useRef<File | null>(null)
  const sourceUrl = useRef<string | null>(null)
  const opening = useRef<AbortController | null>(null)
  const running = useRef<AbortController | null>(null)
  const lastFileId = useRef(0)

  const release = useCallback(() => {
    opening.current?.abort()
    opening.current = null
    running.current?.abort()
    running.current = null
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current)
    sourceUrl.current = null
    file.current = null
    result.current = null
  }, [])

  useEffect(() => {
    const instance = createVideoWorkerClient()
    client.current = instance
    return () => {
      release()
      instance.dispose()
      client.current = null
    }
  }, [release])

  const open = useCallback(
    async (chosen: File, fileId: number) => {
      const controller = new AbortController()
      opening.current = controller
      const stale = () => controller.signal.aborted
      const reject = (message: string) => {
        file.current = null
        setState((current) => ({ ...current, phase: 'rejected', message }))
        setAnnouncement(`Vídeo recusado. ${message}`)
      }

      let check: VideoCheck | null
      try {
        check = await checkVideoFile(chosen)
      } catch {
        check = null // arquivo ilegível (ex.: removido do disco depois de escolhido)
      }
      if (stale()) return
      if (!check) return reject(videoErrorMessage('read-failed'))
      if (!check.ok) return reject(videoRejectionMessage(check.reason))

      const worker = client.current
      if (!worker) return
      try {
        const { info } = await worker.run({ kind: 'inspect', file: chosen }, { signal: controller.signal })
        if (stale()) return
        const url = URL.createObjectURL(chosen)
        sourceUrl.current = url
        setState((current) => (current.fileId === fileId ? { ...current, phase: 'ready', info, sourceUrl: url } : current))
        setAnnouncement(`Vídeo pronto para ${labels.action.toLowerCase()}.`)
      } catch (error) {
        if (isAbortError(error) || stale()) return
        reject(errorMessage(error))
      } finally {
        if (opening.current === controller) opening.current = null
      }
    },
    [labels],
  )

  /** Um vídeo por vez: o novo substitui o atual, que é liberado. */
  const selectFiles = useCallback(
    (incoming: File[]) => {
      const [chosen] = incoming
      if (!chosen || running.current) return
      release()
      file.current = chosen
      lastFileId.current += 1
      const fileId = lastFileId.current
      setState({
        phase: 'opening',
        fileId,
        file: { name: chosen.name, size: chosen.size },
        progress: 0,
        ...(incoming.length > 1 && { notice: ONE_AT_A_TIME }),
      })
      setAnnouncement('Abrindo o vídeo…')
      void open(chosen, fileId)
    },
    [open, release],
  )

  /** O resultado sempre reflete as opções atuais: mudou alguma, ele é descartado. */
  const invalidateResult = useCallback(() => {
    if (!result.current) return
    result.current = null
    setState((current) => (current.phase === 'done' ? { ...current, phase: 'ready', result: undefined } : current))
  }, [])

  const run = useCallback(
    async (makeJob: ProcessJob, outputName: string) => {
      const worker = client.current
      const chosen = file.current
      if (!worker || !chosen || running.current) return
      const controller = new AbortController()
      running.current = controller
      result.current = null
      setState((current) => ({ ...current, phase: 'processing', progress: 0, message: undefined, result: undefined }))
      setAnnouncement(`${labels.progress} o vídeo…`)
      try {
        const output = await worker.run(makeJob(chosen), {
          signal: controller.signal,
          onProgress: (progress) => setState((current) => (current.phase === 'processing' ? { ...current, progress } : current)),
        })
        const done = new File([output.blob], outputName, { type: output.blob.type })
        result.current = done
        setState((current) => ({ ...current, phase: 'done', progress: 1, result: { name: done.name, size: done.size } }))
        setAnnouncement(`Vídeo ${labels.done}. Pronto para baixar.`)
        setCompletedRuns((count) => count + 1)
      } catch (error) {
        // Cancelado pela pessoa (volta às opções) ou porque ela trocou de vídeo ou saiu (nada a fazer).
        if (isAbortError(error)) {
          if (running.current !== controller) return
          setState((current) => ({ ...current, phase: 'ready', progress: 0 }))
          setAnnouncement(`${labels.noun} cancelado.`)
          return
        }
        const message = errorMessage(error)
        setState((current) => ({ ...current, phase: 'failed', message }))
        setAnnouncement(message)
      } finally {
        if (running.current === controller) running.current = null
      }
    },
    [labels],
  )

  const cancel = useCallback(() => running.current?.abort(), [])

  const reset = useCallback(() => {
    release()
    setState((current) => ({ ...EMPTY, fileId: current.fileId }))
    setAnnouncement('')
  }, [release])

  const getResultFile = useCallback(() => result.current, [])

  return { state, announcement, setAnnouncement, completedRuns, selectFiles, run, cancel, reset, invalidateResult, getResultFile }
}

export type VideoTool = ReturnType<typeof useVideoTool>
