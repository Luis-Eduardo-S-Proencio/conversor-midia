import { describe, expect, it, vi } from 'vitest'
import type { InspectedImage } from '../../../core/image/inspect'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { ConvertJob } from '../../../workers/image-protocol'
import { BatchItemError } from '../shared/batch-process'
import { KEPT_ORIGINAL_NOTE, compressFile } from './compress-file'

const image = (format: InspectedImage['format'], hasAlpha = false): InspectedImage => ({
  format,
  width: 100,
  height: 80,
  hasAlpha,
  animated: false,
})

/** Worker simulado que devolve um resultado do tamanho pedido e registra a tarefa recebida. */
function fakeClient(outputSize: number) {
  const jobs: ConvertJob[] = []
  const client = {
    run: vi.fn(async (job: ConvertJob) => {
      jobs.push(job)
      return { kind: 'convert', blob: new Blob([new Uint8Array(outputSize)], { type: `image/${job.target}` }), width: 100, height: 80 }
    }),
    dispose: () => {},
  } as unknown as ImageWorkerClient
  return { client, jobs }
}

const original = (name: string, size: number) => new File([new Uint8Array(size)], name)
const signal = new AbortController().signal

describe('compressFile', () => {
  it('JPG: recodifica em JPG com a qualidade do nível e entrega a versão menor', async () => {
    const { client, jobs } = fakeClient(400)
    const output = await compressFile({ file: original('praia.jpg', 1000), image: image('jpeg'), quality: 70, canEncodeWebp: true, client, signal })

    expect(jobs[0]).toMatchObject({ kind: 'convert', target: 'jpeg', quality: 0.7 })
    expect(output.name).toBe('praia.jpg')
    expect(output.note).toBeUndefined()
    expect(output.blob.size).toBe(400)
  })

  it('PNG vira WEBP quando o navegador gera WEBP', async () => {
    const { client, jobs } = fakeClient(300)
    const output = await compressFile({ file: original('tela.png', 1000), image: image('png', true), quality: 85, canEncodeWebp: true, client, signal })
    expect(jobs[0]?.target).toBe('webp')
    expect(output.name).toBe('tela.webp')
  })

  it('se a versão reduzida ficar maior ou igual, mantém o original intacto e avisa', async () => {
    const file = new File([Uint8Array.from({ length: 1000 }, (_, index) => index % 251)], 'baixa.JPEG')
    const { client } = fakeClient(1000)
    const output = await compressFile({ file, image: image('jpeg'), quality: 85, canEncodeWebp: true, client, signal })

    expect(new Uint8Array(await output.blob.arrayBuffer())).toEqual(new Uint8Array(await file.arrayBuffer()))
    expect(output.name).toBe('baixa.jpg')
    expect(output.note).toBe(KEPT_ORIGINAL_NOTE)
  })

  it('a original mantida sai com o tipo do formato real, não com o informado pelo sistema', async () => {
    // JPG renomeado para .png: o sistema informa image/png pela extensão.
    const file = new File([new Uint8Array(1000)], 'renomeada.png', { type: 'image/png' })
    const { client } = fakeClient(1000)
    const output = await compressFile({ file, image: image('jpeg'), quality: 85, canEncodeWebp: true, client, signal })

    expect(output.name).toBe('renomeada.jpg')
    expect(output.blob.type).toBe('image/jpeg')
  })

  it('sem WEBP no navegador: PNG opaco vira JPG', async () => {
    const { client, jobs } = fakeClient(300)
    const output = await compressFile({ file: original('tela.png', 1000), image: image('png'), quality: 85, canEncodeWebp: false, client, signal })
    expect(jobs[0]?.target).toBe('jpeg')
    expect(output.name).toBe('tela.jpg')
  })

  it('sem WEBP no navegador: imagem transparente é recusada com explicação, sem processar', async () => {
    const { client } = fakeClient(300)
    await expect(
      compressFile({ file: original('logo.png', 1000), image: image('png', true), quality: 85, canEncodeWebp: false, client, signal }),
    ).rejects.toBeInstanceOf(BatchItemError)
    expect(client.run).not.toHaveBeenCalled()
  })
})
