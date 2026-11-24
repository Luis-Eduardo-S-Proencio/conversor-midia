import { describe, expect, it, vi } from 'vitest'
import type { CropRect } from '../../../core/image/crop'
import type { InspectedImage } from '../../../core/image/inspect'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { ConvertJob } from '../../../workers/image-protocol'
import { cropFile } from './crop-file'

const image = (format: InspectedImage['format'], hasAlpha = false): InspectedImage => ({
  format,
  width: 400,
  height: 300,
  hasAlpha,
  animated: false,
})

/** Worker simulado que registra a tarefa recebida. */
function fakeClient() {
  const jobs: ConvertJob[] = []
  const client = {
    run: vi.fn(async (job: ConvertJob) => {
      jobs.push(job)
      return { kind: 'convert', blob: new Blob([new Uint8Array(10)], { type: `image/${job.target}` }), width: 200, height: 100 }
    }),
    dispose: () => {},
  } as unknown as ImageWorkerClient
  return { client, jobs }
}

const file = (name: string) => new File([new Uint8Array(100)], name)
const signal = new AbortController().signal
const crop: CropRect = { x: 50, y: 40, width: 200, height: 100 }

describe('cropFile', () => {
  it('recorta no mesmo formato, com qualidade de 92%, e mantém o nome', async () => {
    const { client, jobs } = fakeClient()
    const output = await cropFile({ file: file('praia.JPEG'), image: image('jpeg'), crop, canEncodeWebp: true, client, signal })

    expect(jobs[0]).toMatchObject({ kind: 'convert', target: 'jpeg', quality: 0.92, crop })
    expect(jobs[0]?.resize).toBeUndefined()
    expect(jobs[0]?.orientation).toBeUndefined()
    expect(output.name).toBe('praia.jpg')
    expect(output.note).toBe('Recortada para 200 × 100') // aparece na lista, junto das medidas originais
  })

  it('JPG gravado com qualidade menor: recorta com a qualidade dele, para não ficar mais pesado', async () => {
    const { client, jobs } = fakeClient()
    await cropFile({ file: file('zap.jpg'), image: { ...image('jpeg'), jpegQuality: 70 }, crop, canEncodeWebp: true, client, signal })
    expect(jobs[0]?.quality).toBe(0.7)
  })

  it('PNG continua PNG, com a transparência', async () => {
    const { client, jobs } = fakeClient()
    const output = await cropFile({ file: file('logo.png'), image: image('png', true), crop, canEncodeWebp: true, client, signal })
    expect(jobs[0]?.target).toBe('png')
    expect(output.name).toBe('logo.png')
  })

  it('sem WEBP no navegador: WEBP opaco sai em JPG e transparente em PNG, com aviso', async () => {
    const { client, jobs } = fakeClient()
    const opaque = await cropFile({ file: file('foto.webp'), image: image('webp'), crop, canEncodeWebp: false, client, signal })
    expect(jobs[0]?.target).toBe('jpeg')
    expect(opaque).toMatchObject({
      name: 'foto.jpg',
      note: 'Recortada para 200 × 100. Este navegador não gera WEBP: a imagem saiu em JPG.',
    })

    const transparent = await cropFile({ file: file('logo.webp'), image: image('webp', true), crop, canEncodeWebp: false, client, signal })
    expect(jobs[1]?.target).toBe('png')
    expect(transparent.name).toBe('logo.png')
  })
})
