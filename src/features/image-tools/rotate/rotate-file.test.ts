import { describe, expect, it, vi } from 'vitest'
import type { InspectedImage } from '../../../core/image/inspect'
import type { Orientation } from '../../../core/image/orientation'
import type { ImageWorkerClient } from '../../../workers/image-client'
import type { ConvertJob } from '../../../workers/image-protocol'
import { rotateFile } from './rotate-file'

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
      return { kind: 'convert', blob: new Blob([new Uint8Array(10)], { type: `image/${job.target}` }), width: 300, height: 400 }
    }),
    dispose: () => {},
  } as unknown as ImageWorkerClient
  return { client, jobs }
}

const file = (name: string) => new File([new Uint8Array(100)], name)
const signal = new AbortController().signal
const right: Orientation = { quarterTurns: 1, mirrored: false }
const mirrored: Orientation = { quarterTurns: 0, mirrored: true }

describe('rotateFile', () => {
  it('gira no mesmo formato, com qualidade de 92%, e mantém o nome (é uma correção)', async () => {
    const { client, jobs } = fakeClient()
    const output = await rotateFile({ file: file('praia.JPEG'), image: image('jpeg'), orientation: right, canEncodeWebp: true, client, signal })

    expect(jobs[0]).toMatchObject({ kind: 'convert', target: 'jpeg', quality: 0.92, orientation: right })
    expect(jobs[0]?.resize).toBeUndefined()
    expect(output.name).toBe('praia.jpg')
    expect(output.note).toBe('Girada 90° para a direita') // aparece na lista, junto do arquivo
  })

  it('PNG continua PNG, com a transparência', async () => {
    const { client, jobs } = fakeClient()
    const output = await rotateFile({ file: file('logo.png'), image: image('png', true), orientation: mirrored, canEncodeWebp: true, client, signal })
    expect(jobs[0]?.target).toBe('png')
    expect(output).toMatchObject({ name: 'logo.png', note: 'Espelhada na horizontal' })
  })

  it('sem WEBP no navegador: WEBP opaco sai em JPG e transparente em PNG, com aviso', async () => {
    const { client, jobs } = fakeClient()
    const opaque = await rotateFile({ file: file('foto.webp'), image: image('webp'), orientation: right, canEncodeWebp: false, client, signal })
    expect(jobs[0]?.target).toBe('jpeg')
    expect(opaque).toMatchObject({
      name: 'foto.jpg',
      note: 'Girada 90° para a direita. Este navegador não gera WEBP: a imagem saiu em JPG.',
    })

    const transparent = await rotateFile({
      file: file('logo.webp'),
      image: image('webp', true),
      orientation: right,
      canEncodeWebp: false,
      client,
      signal,
    })
    expect(jobs[1]?.target).toBe('png')
    expect(transparent.name).toBe('logo.png')
  })
})
