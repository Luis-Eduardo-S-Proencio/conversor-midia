import type { ProcessingErrorCode } from '../core/image/messages'
import type { ImageJob, JobOutput, OutputFor, WorkerRequest, WorkerResponse } from './image-protocol'

/** Falha de processamento com código estável; a mensagem ao usuário vem de core/image/messages. */
export class ImageJobError extends Error {
  readonly code: ProcessingErrorCode

  constructor(code: ProcessingErrorCode) {
    super(code)
    this.name = 'ImageJobError'
    this.code = code
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

const abortError = () => new DOMException('Tarefa cancelada.', 'AbortError')

export interface ImageWorkerClient {
  run<J extends ImageJob>(job: J, signal?: AbortSignal): Promise<OutputFor<J>>
  /** Cancela tudo e encerra o Worker. Use ao sair da tela. */
  dispose(): void
}

export type WorkerFactory = () => Worker

/** Recursos mínimos para processar imagens fora da thread principal. */
export function supportsImageWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined'
}

export function createImageWorker(): Worker {
  return new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
}

interface Pending {
  id: number
  job: ImageJob
  resolve: (output: JobOutput) => void
  reject: (error: unknown) => void
  cleanup: () => void
}

/**
 * Cliente do Worker de imagens: uma tarefa por vez, em ordem de chegada (limita a memória em celulares).
 * Cancelar uma tarefa na fila só a remove; cancelar a que está rodando encerra o Worker,
 * porque decodificar e codificar não podem ser interrompidos no meio. O próximo Worker nasce sob demanda.
 */
export function createImageWorkerClient(createWorker: WorkerFactory = createImageWorker): ImageWorkerClient {
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
    created.addEventListener('message', (event: MessageEvent<WorkerResponse>) => settle(event.data))
    created.addEventListener('error', (event) => {
      event.preventDefault()
      fail('worker-failed')
    })
    created.addEventListener('messageerror', () => fail('worker-failed'))
    worker = created
    return created
  }

  function settle(response: WorkerResponse) {
    const pending = active
    if (!pending || pending.id !== response.id) return
    active = null
    pending.cleanup()
    if (response.ok) pending.resolve(response.output)
    else pending.reject(new ImageJobError(response.code))
    pump()
  }

  /** Um Worker que falhou não é reaproveitado: a tarefa atual falha e as próximas usam um novo. */
  function fail(code: ProcessingErrorCode) {
    stopWorker()
    const pending = active
    active = null
    if (pending) {
      pending.cleanup()
      pending.reject(new ImageJobError(code))
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
    const request: WorkerRequest = { ...next.job, id: next.id }
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
    run<J extends ImageJob>(job: J, signal?: AbortSignal): Promise<OutputFor<J>> {
      return new Promise<OutputFor<J>>((resolve, reject) => {
        if (disposed || signal?.aborted) {
          reject(abortError())
          return
        }
        const pending: Pending = {
          id: nextId++,
          job,
          // O Worker responde com o resultado do mesmo tipo da tarefa.
          resolve: resolve as (output: JobOutput) => void,
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
