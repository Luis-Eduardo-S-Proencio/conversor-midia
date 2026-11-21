import type { VideoErrorCode } from '../core/video/messages'
import type { VideoJob, VideoJobOutput, VideoOutputFor, VideoWorkerRequest, VideoWorkerResponse } from './video-protocol'

/** Falha de processamento com código estável; a mensagem ao usuário vem de core/video/messages. */
export class VideoJobError extends Error {
  readonly code: VideoErrorCode

  constructor(code: VideoErrorCode) {
    super(code)
    this.name = 'VideoJobError'
    this.code = code
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

const abortError = () => new DOMException('Tarefa cancelada.', 'AbortError')

export interface RunOptions {
  signal?: AbortSignal
  /** De 0 a 1, enquanto a tarefa roda. */
  onProgress?: (value: number) => void
}

export interface VideoWorkerClient {
  run<J extends VideoJob>(job: J, options?: RunOptions): Promise<VideoOutputFor<J>>
  /** Cancela tudo e encerra o Worker. Use ao sair da tela. */
  dispose(): void
}

export type WorkerFactory = () => Worker

/** Recurso mínimo para processar vídeo fora da thread principal (o resto é conferido ao abrir o vídeo). */
export function supportsVideoWorker(): boolean {
  return typeof Worker !== 'undefined'
}

export function createVideoWorker(): Worker {
  return new Worker(new URL('./video.worker.ts', import.meta.url), { type: 'module' })
}

interface Pending {
  id: number
  job: VideoJob
  onProgress?: (value: number) => void
  resolve: (output: VideoJobOutput) => void
  reject: (error: unknown) => void
  cleanup: () => void
}

/**
 * Cliente do Worker de vídeo: uma tarefa por vez, em ordem de chegada. Cancelar a tarefa que está
 * rodando encerra o Worker, o que interrompe a conversão na hora e libera a memória dela; o
 * próximo Worker nasce sob demanda. Cancelar uma tarefa na fila só a remove.
 */
export function createVideoWorkerClient(createWorker: WorkerFactory = createVideoWorker): VideoWorkerClient {
  const queue: Pending[] = []
  let worker: Worker | null = null
  let active: Pending | null = null
  let nextId = 1
  let disposed = false

  function stopWorker() {
    worker?.terminate()
    worker = null
  }

  function ensureWorker(): Worker {
    if (worker) return worker
    const created = createWorker()
    created.addEventListener('message', (event: MessageEvent<VideoWorkerResponse>) => handle(event.data))
    created.addEventListener('error', (event) => {
      event.preventDefault()
      fail('worker-failed')
    })
    created.addEventListener('messageerror', () => fail('worker-failed'))
    worker = created
    return created
  }

  function handle(response: VideoWorkerResponse) {
    const pending = active
    if (!pending || pending.id !== response.id) return
    if (response.type === 'progress') {
      pending.onProgress?.(response.value)
      return
    }
    active = null
    pending.cleanup()
    if (response.type === 'done') pending.resolve(response.output)
    else pending.reject(new VideoJobError(response.code))
    pump()
  }

  /** Um Worker que falhou não é reaproveitado: a tarefa atual falha e as próximas usam um novo. */
  function fail(code: VideoErrorCode) {
    stopWorker()
    const pending = active
    active = null
    if (pending) {
      pending.cleanup()
      pending.reject(new VideoJobError(code))
    }
    pump()
  }

  function pump() {
    if (active || disposed) return
    const next = queue.shift()
    if (!next) return
    active = next
    let target: Worker
    try {
      target = ensureWorker()
    } catch {
      fail('worker-failed') // ex.: navegador sem suporte a Worker de módulo
      return
    }
    const request: VideoWorkerRequest = { ...next.job, id: next.id }
    target.postMessage(request)
  }

  function cancel(pending: Pending) {
    if (active === pending) {
      active = null
      stopWorker()
    } else {
      const index = queue.indexOf(pending)
      if (index >= 0) queue.splice(index, 1)
    }
    pending.cleanup()
    pending.reject(abortError())
    pump()
  }

  return {
    run<J extends VideoJob>(job: J, { signal, onProgress }: RunOptions = {}): Promise<VideoOutputFor<J>> {
      return new Promise<VideoOutputFor<J>>((resolve, reject) => {
        if (disposed || signal?.aborted) {
          reject(abortError())
          return
        }
        const pending: Pending = {
          id: nextId++,
          job,
          onProgress,
          // O Worker responde com o resultado do mesmo tipo da tarefa.
          resolve: resolve as (output: VideoJobOutput) => void,
          reject,
          cleanup: () => {},
        }
        if (signal) {
          const onAbort = () => cancel(pending)
          signal.addEventListener('abort', onAbort, { once: true })
          pending.cleanup = () => signal.removeEventListener('abort', onAbort)
        }
        queue.push(pending)
        pump()
      })
    },

    dispose() {
      disposed = true
      const pending = active ? [active, ...queue] : [...queue]
      queue.length = 0
      active = null
      stopWorker()
      for (const item of pending) {
        item.cleanup()
        item.reject(abortError())
      }
    },
  }
}
