import { afterAll, describe, expect, it } from 'vitest'
import cortadoUrl from '../../tests/fixtures/videos/cortado.mp4?url'
import giradoUrl from '../../tests/fixtures/videos/girado.mp4?url'
import longoUrl from '../../tests/fixtures/videos/longo.mp4?url'
import quadrantesUrl from '../../tests/fixtures/videos/quadrantes.mov?url'
import segundosMp4Url from '../../tests/fixtures/videos/segundos.mp4?url'
import segundosWebmUrl from '../../tests/fixtures/videos/segundos.webm?url'
import soAudioUrl from '../../tests/fixtures/videos/so-audio.mp4?url'
import textoUrl from '../../tests/fixtures/videos/texto.mp4?url'
import { fixtureBlob, readVideo } from '../test/video-reader'
import { VideoJobError, createVideoWorkerClient, isAbortError } from './video-client'

// Worker real, no Chromium: confere formato, codec, duração, medidas, cores dos quadros e faixas do resultado.
// Vídeos de teste (tests/fixtures/videos): "segundos" troca de cor a cada segundo (vermelho, verde, azul,
// amarelo), com quadros-chave em 0, 1, 2 e 3 s no MP4 e em 0 e 2 s no WEBM; "quadrantes" tem uma cor por quadrante.
const client = createVideoWorkerClient()
afterAll(() => client.dispose())

const SLOW = { timeout: 30_000 }

describe('Worker de vídeo: abrir', () => {
  it('MP4 com som: formato, duração, medidas, codec e o que o navegador consegue fazer', async () => {
    const { info } = await client.run({ kind: 'inspect', file: await fixtureBlob(segundosMp4Url) })
    expect(info).toMatchObject({
      format: 'mp4',
      width: 320,
      height: 240,
      codec: 'avc',
      hasAudio: true,
      canTranscodeVideo: true,
      canTranscodeAudio: true,
      extraTracks: false,
    })
    expect(info.duration).toBeCloseTo(4, 1)
  })

  it('WEBM e MOV são reconhecidos pelo conteúdo', async () => {
    const webm = await client.run({ kind: 'inspect', file: await fixtureBlob(segundosWebmUrl) })
    expect(webm.info).toMatchObject({ format: 'webm', codec: 'vp9', hasAudio: true })
    const mov = await client.run({ kind: 'inspect', file: await fixtureBlob(quadrantesUrl) })
    expect(mov.info).toMatchObject({ format: 'mov', codec: 'avc', hasAudio: false, width: 320, height: 240 })
  })

  it('vídeo girado: medidas do quadro como ele aparece', async () => {
    const { info } = await client.run({ kind: 'inspect', file: await fixtureBlob(giradoUrl) })
    expect(info).toMatchObject({ width: 240, height: 320 })
  })

  it('arquivo só de áudio, incompleto ou que não é vídeo: erro com código, sem travar', async () => {
    await expect(client.run({ kind: 'inspect', file: await fixtureBlob(soAudioUrl) })).rejects.toEqual(new VideoJobError('no-video'))
    await expect(client.run({ kind: 'inspect', file: await fixtureBlob(cortadoUrl) })).rejects.toEqual(new VideoJobError('read-failed'))
    await expect(client.run({ kind: 'inspect', file: await fixtureBlob(textoUrl) })).rejects.toEqual(new VideoJobError('read-failed'))
  })
})

describe('Worker de vídeo: cortar trecho', () => {
  it('exato, começando no meio de um grupo de quadros: recodifica e começa no quadro pedido, com som', SLOW, async () => {
    const progress: number[] = []
    const result = await client.run(
      { kind: 'trim', file: await fixtureBlob(segundosMp4Url), start: 1.5, end: 3, mode: 'exact' },
      { onProgress: (value) => progress.push(value) },
    )
    expect(result.copied).toBe(false)
    expect(result.blob.type).toBe('video/mp4')
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'MP4', videoCodec: 'avc', audioCodec: 'aac', width: 320, height: 240 })
      expect(video.duration).toBeCloseTo(1.5, 1)
      expect(video.firstTimestamp).toBeGreaterThanOrEqual(0) // nada escondido antes do início
      expect(await video.colorAt(0, 160, 120)).toBe('green') // 1,5 s do original
      expect(await video.colorAt(0.45, 160, 120)).toBe('green')
      expect(await video.colorAt(0.55, 160, 120)).toBe('blue') // 2,05 s do original
      expect(await video.colorAt(1.45, 160, 120)).toBe('blue')
    } finally {
      video.dispose()
    }
    expect(progress.length).toBeGreaterThan(0)
    expect(progress.every((value, index) => value >= 0 && value <= 1 && value >= (progress[index - 1] ?? 0))).toBe(true)
  })

  it('exato, começando num quadro-chave: copia sem recodificar', SLOW, async () => {
    const result = await client.run({ kind: 'trim', file: await fixtureBlob(segundosMp4Url), start: 2, end: 3, mode: 'exact' })
    expect(result.copied).toBe(true)
    const video = await readVideo(result.blob)
    try {
      expect(video.duration).toBeCloseTo(1, 1)
      expect(video.firstTimestamp).toBeCloseTo(0, 3)
      expect(await video.colorAt(0, 160, 120)).toBe('blue')
      expect(video.audioCodec).toBe('aac')
    } finally {
      video.dispose()
    }
  })

  it('só o fim cortado: o vídeo é copiado do começo, sem recodificar', SLOW, async () => {
    const result = await client.run({ kind: 'trim', file: await fixtureBlob(segundosMp4Url), start: 0, end: 2.5, mode: 'exact' })
    expect(result.copied).toBe(true)
    const video = await readVideo(result.blob)
    try {
      expect(video.duration).toBeCloseTo(2.5, 1)
      expect(await video.colorAt(0, 160, 120)).toBe('red')
      expect(await video.colorAt(2.4, 160, 120)).toBe('blue')
    } finally {
      video.dispose()
    }
  })

  it('rápido: copia a partir do quadro-chave anterior, que fica escondido antes do início', SLOW, async () => {
    const result = await client.run({ kind: 'trim', file: await fixtureBlob(segundosMp4Url), start: 1.5, end: 3, mode: 'fast' })
    expect(result.copied).toBe(true)
    const video = await readVideo(result.blob)
    try {
      expect(video.videoCodec).toBe('avc')
      expect(video.firstTimestamp).toBeCloseTo(-0.5, 2) // quadro-chave de 1 s, meio segundo antes do início
      expect(video.duration).toBeCloseTo(1.5, 1)
      expect(await video.colorAt(1.45, 160, 120)).toBe('blue')
    } finally {
      video.dispose()
    }
  })

  it('WEBM: sempre exato (o formato não guarda quadros antes do zero), com som em Opus', SLOW, async () => {
    for (const mode of ['exact', 'fast'] as const) {
      const result = await client.run({ kind: 'trim', file: await fixtureBlob(segundosWebmUrl), start: 1.5, end: 3, mode })
      expect(result.blob.type).toBe('video/webm')
      const video = await readVideo(result.blob)
      try {
        expect(video).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus' })
        expect(video.firstTimestamp).toBeGreaterThanOrEqual(0)
        expect(video.duration).toBeCloseTo(1.5, 1)
        expect(await video.colorAt(0, 160, 120)).toBe('green')
        expect(await video.colorAt(1.45, 160, 120)).toBe('blue')
      } finally {
        video.dispose()
      }
    }
  })

  it('trecho fora do vídeo é recusado', async () => {
    const file = await fixtureBlob(segundosMp4Url)
    await expect(client.run({ kind: 'trim', file, start: 5, end: 6, mode: 'exact' })).rejects.toEqual(new VideoJobError('unexpected'))
    await expect(client.run({ kind: 'trim', file, start: 2, end: 1, mode: 'exact' })).rejects.toEqual(new VideoJobError('unexpected'))
  })
})

describe('Worker de vídeo: recortar', () => {
  it('MOV: mantém só o quadrante pedido, no mesmo formato e sem metadados (título, localização)', SLOW, async () => {
    const file = await fixtureBlob(quadrantesUrl)
    const original = await readVideo(file)
    expect(original.tags).toMatchObject({ title: 'Viagem de teste', raw: { '©xyz': '+12.3456-045.6789/' } })
    original.dispose()

    const result = await client.run({ kind: 'crop', file, crop: { x: 160, y: 0, width: 160, height: 120 } })
    expect(result).toMatchObject({ width: 160, height: 120 })
    expect(result.blob.type).toBe('video/quicktime')
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'QuickTime File Format', videoCodec: 'avc', width: 160, height: 120 })
      for (const [x, y] of [
        [4, 4],
        [155, 4],
        [80, 60],
        [4, 115],
        [155, 115],
      ] as const) {
        expect(await video.colorAt(0.5, x, y), `${x},${y}`).toBe('green')
      }
      expect(video.tags).not.toHaveProperty('title')
      expect(video.tags).not.toHaveProperty('comment')
      expect(JSON.stringify(video.tags)).not.toContain('12.3456')
    } finally {
      video.dispose()
    }
  })

  it('largura e altura ímpares perdem 1 px: o vídeo sai em H.264, que exige medidas pares', SLOW, async () => {
    const result = await client.run({ kind: 'crop', file: await fixtureBlob(quadrantesUrl), crop: { x: 161, y: 0, width: 159, height: 121 } })
    expect(result).toMatchObject({ width: 158, height: 120 })
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ videoCodec: 'avc', width: 158, height: 120 })
      expect(await video.colorAt(0.5, 79, 60)).toBe('green')
    } finally {
      video.dispose()
    }
  })

  it('vídeo girado: a área vale para o quadro como ele aparece', SLOW, async () => {
    const result = await client.run({ kind: 'crop', file: await fixtureBlob(giradoUrl), crop: { x: 0, y: 0, width: 240, height: 160 } })
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ width: 240, height: 160 })
      expect(await video.colorAt(0.5, 120, 20)).toBe('red')
      expect(await video.colorAt(0.5, 120, 140)).toBe('red')
    } finally {
      video.dispose()
    }
  })

  it('WEBM com som: o som é mantido e a duração não muda', SLOW, async () => {
    const result = await client.run({ kind: 'crop', file: await fixtureBlob(segundosWebmUrl), crop: { x: 80, y: 60, width: 160, height: 120 } })
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus', width: 160, height: 120 })
      expect(video.duration).toBeCloseTo(4, 1)
      expect(await video.colorAt(2.5, 80, 60)).toBe('blue')
    } finally {
      video.dispose()
    }
  })

  it('área fora do vídeo ou menor que o mínimo é recusada', async () => {
    const file = await fixtureBlob(quadrantesUrl)
    await expect(client.run({ kind: 'crop', file, crop: { x: 200, y: 0, width: 160, height: 120 } })).rejects.toEqual(new VideoJobError('unexpected'))
    await expect(client.run({ kind: 'crop', file, crop: { x: 0, y: 0, width: 8, height: 8 } })).rejects.toEqual(new VideoJobError('unexpected'))
  })

  it('cancelar no meio encerra a recodificação, e a próxima tarefa funciona', SLOW, async () => {
    const controller = new AbortController()
    let reported = false
    const job = client.run(
      { kind: 'crop', file: await fixtureBlob(longoUrl), crop: { x: 0, y: 0, width: 320, height: 180 } },
      {
        signal: controller.signal,
        onProgress: (value) => {
          // Cancela no primeiro progresso real, com a recodificação já em andamento.
          if (value > 0 && !reported) {
            reported = true
            controller.abort()
          }
        },
      },
    )
    await expect(job).rejects.toSatisfy(isAbortError)
    expect(reported).toBe(true)
    const { info } = await client.run({ kind: 'inspect', file: await fixtureBlob(segundosMp4Url) })
    expect(info.format).toBe('mp4')
  })
})
