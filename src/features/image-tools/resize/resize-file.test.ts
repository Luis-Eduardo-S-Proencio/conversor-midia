import { describe, expect, it, vi } from 'vitest'
import type { InspectedImage } from '../../../core/image/inspect'
import type { ResizeRequest } from '../../../core/image/resize'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { ConvertJob } from '../../../workers/image-protocol'
import { KEPT_ORIGINAL_NOTE, resizeFile } from './resize-file'

const image = (format: InspectedImage['format'], width: number, height: number, hasAlpha = false): InspectedImage => ({
  format,
  width,
  height,
  hasAlpha,
  animated: false,
})

/** Worker simulado: devolve um resultado com as medidas pedidas e registra a tarefa recebida. */
function fakeClient() {
  const jobs: ConvertJob[] = []
  const client = {
    run: vi.fn(async (job: ConvertJob) => {
      jobs.push(job)
      const size = job.resize ?? { width: 0, height: 0 }
      return { kind: 'convert', blob: new Blob([new Uint8Array(10)], { type: `image/${job.target}` }), ...size }
    }),
    dispose: () => {},
  } as unknown as ImageWorkerClient
  return { client, jobs }
}

const file = (name: string, size = 1000) => new File([Uint8Array.from({ length: size }, (_, index) => index % 251)], name)
const signal = new AbortController().signal
const half: ResizeRequest = { mode: 'percent', percent: 50 }

describe('resizeFile', () => {
  it('pede ao Worker as medidas finais, no mesmo formato, com qualidade de 92%', async () => {
    const { client, jobs } = fakeClient()
    const output = await resizeFile({ file: file('praia.jpg'), image: image('jpeg', 5120, 2880), request: half, canEncodeWebp: true, client, signal })

    expect(jobs[0]).toMatchObject({ kind: 'convert', target: 'jpeg', quality: 0.92, resize: { width: 2560, height: 1440 } })
    expect(output.name).toBe('praia-2560x1440.jpg')
    expect(output.note).toBe('Novo tamanho: 2560 × 1440') // aparece na lista, ao lado das medidas originais
  })

  it('JPG gravado com qualidade menor: redimensiona com a qualidade dele, para não ficar mais pesado', async () => {
    const { client, jobs } = fakeClient()
    const zap = { ...image('jpeg', 5120, 2880), jpegQuality: 75 }
    await resizeFile({ file: file('zap.jpg'), image: zap, request: half, canEncodeWebp: true, client, signal })
    expect(jobs[0]?.quality).toBe(0.75)
  })

  it('PNG continua PNG (com a transparência) e o nome ganha as medidas', async () => {
    const { client, jobs } = fakeClient()
    const output = await resizeFile({
      file: file('logo.png'),
      image: image('png', 1000, 500, true),
      request: { mode: 'fit', width: 200 },
      canEncodeWebp: true,
      client,
      signal,
    })
    expect(jobs[0]).toMatchObject({ target: 'png', resize: { width: 200, height: 100 } })
    expect(output.name).toBe('logo-200x100.png')
  })

  it('imagem que já cabe no tamanho pedido volta intacta, com aviso, sem passar pelo Worker', async () => {
    const original = file('pequena.JPEG')
    const { client } = fakeClient()
    const output = await resizeFile({
      file: original,
      image: image('jpeg', 800, 600),
      request: { mode: 'fit', width: 1920 },
      canEncodeWebp: true,
      client,
      signal,
    })

    expect(client.run).not.toHaveBeenCalled()
    expect(new Uint8Array(await output.blob.arrayBuffer())).toEqual(new Uint8Array(await original.arrayBuffer()))
    expect(output.name).toBe('pequena.jpg')
    expect(output.note).toBe(KEPT_ORIGINAL_NOTE)
  })

  it('a original mantida sai com o tipo do formato real, não com o informado pelo sistema', async () => {
    // JPG renomeado para .png: o sistema informa image/png pela extensão.
    const renamed = new File([new Uint8Array(100)], 'renomeada.png', { type: 'image/png' })
    const { client } = fakeClient()
    const output = await resizeFile({
      file: renamed,
      image: image('jpeg', 100, 80),
      request: { mode: 'exact', width: 100, height: 80 },
      canEncodeWebp: true,
      client,
      signal,
    })
    expect(output.name).toBe('renomeada.jpg')
    expect(output.blob.type).toBe('image/jpeg')
  })

  it('sem WEBP no navegador: WEBP opaco sai em JPG e transparente em PNG, com aviso', async () => {
    const { client, jobs } = fakeClient()
    const opaque = await resizeFile({ file: file('foto.webp'), image: image('webp', 400, 300), request: half, canEncodeWebp: false, client, signal })
    expect(jobs[0]?.target).toBe('jpeg')
    expect(opaque).toMatchObject({
      name: 'foto-200x150.jpg',
      note: 'Novo tamanho: 200 × 150. Este navegador não gera WEBP: a imagem saiu em JPG.',
    })

    const transparent = await resizeFile({
      file: file('logo.webp'),
      image: image('webp', 400, 300, true),
      request: half,
      canEncodeWebp: false,
      client,
      signal,
    })
    expect(jobs[1]?.target).toBe('png')
    expect(transparent).toMatchObject({
      name: 'logo-200x150.png',
      note: 'Novo tamanho: 200 × 150. Este navegador não gera WEBP: a imagem saiu em PNG.',
    })
  })
})
