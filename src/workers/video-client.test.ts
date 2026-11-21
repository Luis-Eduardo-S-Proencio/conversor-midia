import { describe, expect, it, vi } from 'vitest'
import { VideoJobError, createVideoWorkerClient, isAbortError } from './video-client'
import type { VideoWorkerRequest, VideoWorkerResponse } from './video-protocol'

type Listener = (event: { data?: unknown; preventDefault?: () => void }) => void

/** Worker simulado: registra mensagens e responde quando o teste mandar. */
class FakeWorker {
  readonly posted: VideoWorkerRequest[] = []
  terminated = false
  private readonly listeners = new Map<string, Listener[]>()

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  postMessage(message: VideoWorkerRequest) {
    this.posted.push(message)
  }
  terminate() {
    this.terminated = true
  }
  reply(response: VideoWorkerResponse) {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: response })
  }
  crash() {
    for (const listener of this.listeners.get('error') ?? []) listener({ preventDefault: () => {} })
  }
}

function setup() {
  const workers: FakeWorker[] = []
  const client = createVideoWorkerClient(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker as unknown as Worker
  })
  return { client, workers }
}

const file = new Blob(['x'])
const trimJob = { kind: 'trim', file, start: 1, end: 2, mode: 'exact' } as const
const trimmed = new Blob(['trecho'])
const done = (id: number): VideoWorkerResponse => ({ id, type: 'done', output: { kind: 'trim', blob: trimmed, copied: false } })
const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createVideoWorkerClient', () => {
  it('só cria o Worker na primeira tarefa e processa uma por vez, em ordem', async () => {
    const { client, workers } = setup()
    expect(workers).toHaveLength(0)
    const first = client.run(trimJob)
    const second = client.run(trimJob)
    const worker = workers[0]!
    expect(worker.posted).toHaveLength(1)

    worker.reply(done(worker.posted[0]!.id))
    await expect(first).resolves.toEqual({ kind: 'trim', blob: trimmed, copied: false })
    expect(worker.posted).toHaveLength(2)
    worker.reply(done(worker.posted[1]!.id))
    await expect(second).resolves.toMatchObject({ kind: 'trim' })
  })

  it('repassa o progresso da tarefa em andamento', async () => {
    const { client, workers } = setup()
    const onProgress = vi.fn()
    const job = client.run(trimJob, { onProgress })
    const worker = workers[0]!
    const { id } = worker.posted[0]!
    worker.reply({ id, type: 'progress', value: 0.25 })
    worker.reply({ id, type: 'progress', value: 0.5 })
    worker.reply({ id: id + 99, type: 'progress', value: 0.9 }) // de outra tarefa: ignorado
    worker.reply(done(id))
    await job
    expect(onProgress.mock.calls).toEqual([[0.25], [0.5]])
  })

  it('transforma a falha informada pelo Worker em erro com código', async () => {
    const { client, workers } = setup()
    const job = client.run(trimJob)
    workers[0]!.reply({ id: workers[0]!.posted[0]!.id, type: 'error', code: 'decode-unsupported' })
    await expect(job).rejects.toEqual(new VideoJobError('decode-unsupported'))
  })

  it('cancelar a tarefa em andamento encerra o Worker na hora e segue em um novo', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    const first = client.run(trimJob, { signal: controller.signal })
    const second = client.run(trimJob)

    controller.abort()
    await expect(first).rejects.toSatisfy(isAbortError)
    expect(workers[0]!.terminated).toBe(true)
    expect(workers).toHaveLength(2)
    workers[1]!.reply(done(workers[1]!.posted[0]!.id))
    await expect(second).resolves.toMatchObject({ kind: 'trim' })
  })

  it('cancelar uma tarefa na fila só a remove', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    const first = client.run(trimJob)
    const second = client.run(trimJob, { signal: controller.signal })
    controller.abort()
    await expect(second).rejects.toSatisfy(isAbortError)
    expect(workers[0]!.terminated).toBe(false)
    workers[0]!.reply(done(workers[0]!.posted[0]!.id))
    await expect(first).resolves.toMatchObject({ kind: 'trim' })
    await settled()
    expect(workers[0]!.posted).toHaveLength(1)
  })

  it('falha inesperada do Worker rejeita a tarefa atual e não trava as seguintes', async () => {
    const { client, workers } = setup()
    const first = client.run(trimJob)
    const second = client.run(trimJob)
    workers[0]!.crash()
    await expect(first).rejects.toEqual(new VideoJobError('worker-failed'))
    expect(workers).toHaveLength(2)
    workers[1]!.reply(done(workers[1]!.posted[0]!.id))
    await expect(second).resolves.toMatchObject({ kind: 'trim' })
  })

  it('rejeita sem enviar quando o sinal já está cancelado', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    controller.abort()
    await expect(client.run(trimJob, { signal: controller.signal })).rejects.toSatisfy(isAbortError)
    expect(workers).toHaveLength(0)
  })

  it('dispose rejeita tudo, encerra o Worker e recusa novas tarefas', async () => {
    const { client, workers } = setup()
    const first = client.run(trimJob)
    const second = client.run(trimJob)
    client.dispose()
    await expect(first).rejects.toSatisfy(isAbortError)
    await expect(second).rejects.toSatisfy(isAbortError)
    expect(workers[0]!.terminated).toBe(true)
    await expect(client.run(trimJob)).rejects.toSatisfy(isAbortError)
  })
})
