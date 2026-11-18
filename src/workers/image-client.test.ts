import { describe, expect, it } from 'vitest'
import { ImageJobError, createImageWorkerClient } from './image-client'
import type { WorkerRequest, WorkerResponse } from './image-protocol'

type Listener = (event: { data?: unknown; preventDefault?: () => void }) => void

/** Worker simulado: registra mensagens e responde quando o teste mandar. */
class FakeWorker {
  readonly posted: WorkerRequest[] = []
  terminated = false
  private readonly listeners = new Map<string, Listener[]>()

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  postMessage(message: WorkerRequest) {
    this.posted.push(message)
  }
  terminate() {
    this.terminated = true
  }
  reply(response: WorkerResponse) {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: response })
  }
  crash() {
    for (const listener of this.listeners.get('error') ?? []) listener({ preventDefault: () => {} })
  }
}

function setup() {
  const workers: FakeWorker[] = []
  const client = createImageWorkerClient(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker as unknown as Worker
  })
  return { client, workers }
}

const probe = { kind: 'probe' } as const
const probeReply = (id: number): WorkerResponse => ({ id, ok: true, output: { kind: 'probe', webpEncoding: true } })
const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createImageWorkerClient', () => {
  it('só cria o Worker na primeira tarefa', () => {
    const { client, workers } = setup()
    expect(workers).toHaveLength(0)
    void client.run(probe)
    expect(workers).toHaveLength(1)
  })

  it('processa uma tarefa por vez, em ordem de chegada', async () => {
    const { client, workers } = setup()
    const first = client.run(probe)
    const second = client.run(probe)
    const worker = workers[0]!

    expect(worker.posted).toHaveLength(1)
    worker.reply(probeReply(worker.posted[0]!.id))
    await expect(first).resolves.toEqual({ kind: 'probe', webpEncoding: true })

    expect(worker.posted).toHaveLength(2)
    worker.reply(probeReply(worker.posted[1]!.id))
    await expect(second).resolves.toEqual({ kind: 'probe', webpEncoding: true })
  })

  it('transforma a falha informada pelo Worker em erro com código', async () => {
    const { client, workers } = setup()
    const job = client.run(probe)
    workers[0]!.reply({ id: workers[0]!.posted[0]!.id, ok: false, code: 'decode-failed' })
    await expect(job).rejects.toEqual(new ImageJobError('decode-failed'))
  })

  it('cancelar uma tarefa na fila só a remove', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    const first = client.run(probe)
    const second = client.run(probe, controller.signal)

    controller.abort()
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers[0]!.terminated).toBe(false)

    workers[0]!.reply(probeReply(workers[0]!.posted[0]!.id))
    await expect(first).resolves.toBeDefined()
    expect(workers[0]!.posted).toHaveLength(1)
  })

  it('cancelar a tarefa em andamento encerra o Worker e segue em um novo', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    const first = client.run(probe, controller.signal)
    const second = client.run(probe)

    controller.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers[0]!.terminated).toBe(true)
    expect(workers).toHaveLength(2)

    workers[1]!.reply(probeReply(workers[1]!.posted[0]!.id))
    await expect(second).resolves.toBeDefined()
  })

  it('falha inesperada do Worker rejeita a tarefa atual e não trava as seguintes', async () => {
    const { client, workers } = setup()
    const first = client.run(probe)
    const second = client.run(probe)

    workers[0]!.crash()
    await expect(first).rejects.toEqual(new ImageJobError('worker-failed'))
    expect(workers[0]!.terminated).toBe(true)

    workers[1]!.reply(probeReply(workers[1]!.posted[0]!.id))
    await expect(second).resolves.toBeDefined()
  })

  it('ignora respostas de tarefas que não estão em andamento', async () => {
    const { client, workers } = setup()
    const job = client.run(probe)
    workers[0]!.reply(probeReply(999))
    await settled()
    workers[0]!.reply(probeReply(workers[0]!.posted[0]!.id))
    await expect(job).resolves.toBeDefined()
  })

  it('rejeita sem enviar quando o sinal já está cancelado', async () => {
    const { client, workers } = setup()
    const controller = new AbortController()
    controller.abort()
    await expect(client.run(probe, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers).toHaveLength(0)
  })

  it('dispose rejeita tudo, encerra o Worker e recusa novas tarefas', async () => {
    const { client, workers } = setup()
    const first = client.run(probe)
    const second = client.run(probe)

    client.dispose()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(workers[0]!.terminated).toBe(true)
    await expect(client.run(probe)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
