import { canEncodeAudio } from 'mediabunny'
import { afterAll, describe, expect, it } from 'vitest'
import comSomUrl from '../../tests/fixtures/videos/com-som.mov?url'
import cortadoUrl from '../../tests/fixtures/videos/cortado.mp4?url'
import detalhadoUrl from '../../tests/fixtures/videos/detalhado.mp4?url'
import giradoUrl from '../../tests/fixtures/videos/girado.mp4?url'
import longoUrl from '../../tests/fixtures/videos/longo.mp4?url'
import quadrantesUrl from '../../tests/fixtures/videos/quadrantes.mov?url'
import quadrantesWebmUrl from '../../tests/fixtures/videos/quadrantes.webm?url'
import segundosMp4Url from '../../tests/fixtures/videos/segundos.mp4?url'
import segundosWebmUrl from '../../tests/fixtures/videos/segundos.webm?url'
import soAudioUrl from '../../tests/fixtures/videos/so-audio.mp4?url'
import somPcmUrl from '../../tests/fixtures/videos/som-pcm.mov?url'
import textoUrl from '../../tests/fixtures/videos/texto.mp4?url'
import { audioPackets, measureTone, readAudio } from '../test/audio-reader'
import { fixtureBlob, readVideo } from '../test/video-reader'
import { VideoJobError, createVideoWorkerClient, isAbortError } from './video-client'
import type { ExtractAudioJob } from './video-protocol'

// Worker real, no Chromium: confere formato, codec, duração, medidas, cores dos quadros e faixas do resultado.
// Vídeos de teste (tests/fixtures/videos): "segundos" troca de cor a cada segundo (vermelho, verde, azul,
// amarelo), com quadros-chave em 0, 1, 2 e 3 s no MP4 e em 0 e 2 s no WEBM; "quadrantes" tem uma cor por quadrante.
const client = createVideoWorkerClient()
afterAll(() => client.dispose())

const SLOW = { timeout: 30_000 }

const canEncodeAac = () => canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48_000 })

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
      // Som do MP4 recodificado sai em AAC: o Firefox não codifica AAC.
      canTranscodeAudio: await canEncodeAac(),
      extraTracks: false,
    })
    expect(info.duration).toBeCloseTo(4, 1)
    // Som de 96 kbit/s nos vídeos de teste: a taxa medida entra na estimativa de tamanho ao comprimir.
    expect(info.audioBitrate).toBeGreaterThan(80_000)
    expect(info.audioBitrate).toBeLessThan(115_000)
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

describe('Worker de vídeo: remover partes (juntar trechos)', () => {
  it('MP4 sem 1,5–2,5 s: o resto se junta, sem quadros da parte removida, com som do mesmo tamanho', SLOW, async () => {
    const file = await fixtureBlob(segundosMp4Url)
    const ranges = [
      { start: 0, end: 1.5 },
      { start: 2.5, end: 4 },
    ]
    if (!(await canEncodeAac())) {
      // Sem codificador de AAC (Firefox), o som do MP4 não pode ser refeito: erro claro, nada pela metade.
      await expect(client.run({ kind: 'join', file, ranges })).rejects.toEqual(new VideoJobError('encode-unsupported'))
      return
    }
    const progress: number[] = []
    const result = await client.run({ kind: 'join', file, ranges }, { onProgress: (value) => progress.push(value) })
    expect(result.blob.type).toBe('video/mp4')
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'MP4', videoCodec: 'avc', audioCodec: 'aac', width: 320, height: 240 })
      expect(video.duration).toBeCloseTo(3, 1)
      expect(video.audioDuration).toBeCloseTo(3, 1)
      expect(video.firstTimestamp).toBeGreaterThanOrEqual(0)
      expect(await video.colorAt(0.5, 160, 120)).toBe('red')
      expect(await video.colorAt(1.4, 160, 120)).toBe('green') // 1,4 s do original, logo antes da emenda
      expect(await video.colorAt(1.55, 160, 120)).toBe('blue') // 2,55 s do original, logo depois
      expect(await video.colorAt(2.6, 160, 120)).toBe('yellow') // 3,6 s do original
    } finally {
      video.dispose()
    }
    expect(progress.length).toBeGreaterThan(0)
  })

  it('WEBM com várias partes removidas: cada emenda no lugar certo, som em Opus', SLOW, async () => {
    const ranges = [
      { start: 0, end: 0.5 },
      { start: 1, end: 2 },
      { start: 3, end: 4 },
    ]
    const result = await client.run({ kind: 'join', file: await fixtureBlob(segundosWebmUrl), ranges })
    expect(result.blob.type).toBe('video/webm')
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus' })
      expect(video.duration).toBeCloseTo(2.5, 1)
      expect(video.audioDuration).toBeCloseTo(2.5, 1)
      expect(await video.colorAt(0.25, 160, 120)).toBe('red')
      expect(await video.colorAt(0.75, 160, 120)).toBe('green') // 1,25 s do original
      expect(await video.colorAt(1.4, 160, 120)).toBe('green') // 1,9 s do original
      expect(await video.colorAt(1.6, 160, 120)).toBe('yellow') // 3,1 s do original: o azul (2–3 s) saiu
    } finally {
      video.dispose()
    }
  })

  it('trechos fora de ordem, sobrepostos ou fora do vídeo são recusados', async () => {
    const file = await fixtureBlob(segundosWebmUrl)
    const bad = [
      [
        { start: 0, end: 2 },
        { start: 1, end: 3 },
      ],
      [
        { start: 2, end: 3 },
        { start: 0, end: 1 },
      ],
      [{ start: 1, end: 9 }],
      [],
    ]
    for (const ranges of bad) {
      await expect(client.run({ kind: 'join', file, ranges })).rejects.toEqual(new VideoJobError('unexpected'))
    }
  })
})

describe('Worker de vídeo: comprimir', () => {
  it('confere se o codificador respeita a taxa pedida: só quando pedido, e o Chromium respeita', SLOW, async () => {
    const file = await fixtureBlob(detalhadoUrl)
    const plain = await client.run({ kind: 'inspect', file })
    expect(plain.info).not.toHaveProperty('controlsSize')
    const checked = await client.run({ kind: 'inspect', file, checkSizeControl: true })
    // No Firefox do Playwright o H.264 sai do mesmo tamanho em qualquer taxa: lá a resposta é "não".
    expect(checked.info.controlsSize).toBe(!navigator.userAgent.includes('Firefox'))
  })

  it('menos resolução e menos taxa: arquivo bem menor, cores no lugar, som copiado', SLOW, async () => {
    const file = await fixtureBlob(detalhadoUrl) // 976 × 736, com textura e som
    const { info } = await client.run({ kind: 'inspect', file, checkSizeControl: true })
    if (!info.controlsSize) return // a tela não oferece comprimir onde o codificador ignora a taxa
    const progress: number[] = []
    const result = await client.run(
      { kind: 'compress', file, width: 954, height: 720, bitrate: 420_000 },
      { onProgress: (value) => progress.push(value) },
    )
    expect(result.blob.type).toBe('video/mp4')
    expect(result.blob.size).toBeLessThan(file.size / 2)
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'MP4', videoCodec: 'avc', audioCodec: 'aac', width: 954, height: 720 })
      expect(video.duration).toBeCloseTo(1, 1)
      expect(await video.colorAt(0.5, 240, 180)).toBe('red')
      expect(await video.colorAt(0.5, 715, 180)).toBe('green')
      expect(await video.colorAt(0.5, 240, 540)).toBe('blue')
      expect(await video.colorAt(0.5, 715, 540)).toBe('yellow')
    } finally {
      video.dispose()
    }
    expect(progress.length).toBeGreaterThan(0)
  })

  it('medidas ímpares, maiores que o vídeo ou taxa inválida são recusadas', async () => {
    const file = await fixtureBlob(detalhadoUrl)
    for (const job of [
      { width: 955, height: 720, bitrate: 420_000 },
      { width: 1200, height: 900, bitrate: 420_000 },
      { width: 954, height: 720, bitrate: 0 },
    ]) {
      await expect(client.run({ kind: 'compress', file, ...job })).rejects.toEqual(new VideoJobError('unexpected'))
    }
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

// A mesma tarefa ("compress": medidas e taxa novas, som copiado) serve ao Comprimir e ao Mudar resolução.
describe('Worker de vídeo: novas medidas', () => {
  it('vídeo girado (gravado em pé): as medidas valem para o quadro como ele aparece, sem distorcer', SLOW, async () => {
    // "girado.mp4": gravado deitado (320 × 240) com rotação de 90°; aparece em pé, vermelho em cima e azul embaixo.
    const result = await client.run({ kind: 'compress', file: await fixtureBlob(giradoUrl), width: 120, height: 160, bitrate: 300_000 })
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ width: 120, height: 160 })
      expect(await video.colorAt(0.5, 60, 20)).toBe('red')
      expect(await video.colorAt(0.5, 60, 140)).toBe('blue')
    } finally {
      video.dispose()
    }
  })

  it('WEBM: as medidas novas saem em VP9, com as cores no lugar e o som Opus mantido', SLOW, async () => {
    const result = await client.run({ kind: 'compress', file: await fixtureBlob(quadrantesWebmUrl), width: 480, height: 360, bitrate: 500_000 })
    expect(result.blob.type).toBe('video/webm')
    const video = await readVideo(result.blob)
    try {
      expect(video).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus', width: 480, height: 360 })
      expect(video.duration).toBeCloseTo(1, 1)
      expect(await video.colorAt(0.5, 120, 90)).toBe('red')
      expect(await video.colorAt(0.5, 360, 90)).toBe('green')
      expect(await video.colorAt(0.5, 120, 270)).toBe('blue')
      expect(await video.colorAt(0.5, 360, 270)).toBe('yellow')
    } finally {
      video.dispose()
    }
  })
})

describe('Worker de vídeo: extrair áudio', () => {
  it('ao abrir: o som do vídeo e o que o navegador consegue gerar a partir dele', async () => {
    const mp4 = await client.run({ kind: 'inspect', file: await fixtureBlob(segundosMp4Url) })
    expect(mp4.info).toMatchObject({ audioCodec: 'aac', canDecodeAudio: true, canEncodeAac: await canEncodeAac(), canEncodeMp3: true })
    const webm = await client.run({ kind: 'inspect', file: await fixtureBlob(segundosWebmUrl) })
    expect(webm.info).toMatchObject({ audioCodec: 'opus', canDecodeAudio: true })
    const silent = await client.run({ kind: 'inspect', file: await fixtureBlob(giradoUrl) })
    expect(silent.info).toMatchObject({ audioCodec: null, canDecodeAudio: false, canEncodeAac: false, canEncodeMp3: false })
  })

  it('MP4 para M4A: o som é copiado byte a byte, sem a imagem', SLOW, async () => {
    const file = await fixtureBlob(segundosMp4Url)
    const result = await client.run({ kind: 'extract-audio', file, format: 'm4a' })
    expect(result.copied).toBe(true)
    expect(result.blob.type).toBe('audio/mp4')
    const audio = await readAudio(result.blob)
    expect(audio).toMatchObject({ format: 'MP4', videoTracks: 0, audioTracks: 1, codec: 'aac', numberOfChannels: 2, sampleRate: 48_000 })
    expect(audio.duration).toBeCloseTo(4, 1)
    expect(await audioPackets(result.blob)).toEqual(await audioPackets(file))
  })

  it('WEBM para WEBM: o som Opus é copiado byte a byte', SLOW, async () => {
    const file = await fixtureBlob(segundosWebmUrl)
    const result = await client.run({ kind: 'extract-audio', file, format: 'webm' })
    expect(result.copied).toBe(true)
    expect(result.blob.type).toBe('audio/webm')
    const audio = await readAudio(result.blob)
    expect(audio).toMatchObject({ format: 'WebM', videoTracks: 0, audioTracks: 1, codec: 'opus' })
    expect(audio.duration).toBeCloseTo(4, 1)
    expect(await audioPackets(result.blob)).toEqual(await audioPackets(file))
  })

  it('WEBM para M4A: o som é refeito em AAC, com o mesmo tom e a mesma duração', SLOW, async () => {
    const result = await client.run({ kind: 'extract-audio', file: await fixtureBlob(segundosWebmUrl), format: 'm4a' })
    expect(result.copied).toBe(false)
    expect(result.blob.type).toBe('audio/mp4')
    const audio = await readAudio(result.blob)
    expect(audio).toMatchObject({ format: 'MP4', videoTracks: 0, codec: 'aac' })
    expect(audio.duration).toBeCloseTo(4, 1)
    const tone = await measureTone(result.blob, 1, 3)
    expect(tone.frequency).toBeCloseTo(440, -1)
    expect(tone.rms).toBeGreaterThan(0.1)
  })

  it('MP4 para MP3: refeito pelo codificador próprio, a 192 kbit/s, com o mesmo tom', SLOW, async () => {
    const result = await client.run({ kind: 'extract-audio', file: await fixtureBlob(segundosMp4Url), format: 'mp3' })
    expect(result.copied).toBe(false)
    expect(result.blob.type).toBe('audio/mpeg')
    const audio = await readAudio(result.blob)
    expect(audio).toMatchObject({ format: 'MP3', videoTracks: 0, codec: 'mp3', numberOfChannels: 2 })
    expect(audio.duration).toBeCloseTo(4, 1)
    // 192 kbit/s durante 4 s: cerca de 96 KB.
    expect(result.blob.size).toBeGreaterThan(85_000)
    expect(result.blob.size).toBeLessThan(110_000)
    const tone = await measureTone(result.blob, 1, 3)
    expect(tone.frequency).toBeCloseTo(440, -1)
    expect(tone.rms).toBeGreaterThan(0.1)
  })

  it('WEBM para MP3: o som Opus também vira MP3', SLOW, async () => {
    const result = await client.run({ kind: 'extract-audio', file: await fixtureBlob(segundosWebmUrl), format: 'mp3' })
    const audio = await readAudio(result.blob)
    expect(audio).toMatchObject({ format: 'MP3', codec: 'mp3' })
    expect(audio.duration).toBeCloseTo(4, 1)
  })

  it('som PCM (MOV de câmera): não há cópia; M4A e MP3 saem refeitos', SLOW, async () => {
    const file = await fixtureBlob(somPcmUrl)
    const { info } = await client.run({ kind: 'inspect', file })
    expect(info).toMatchObject({ audioCodec: 'pcm-s16', canDecodeAudio: true })
    for (const format of ['m4a', 'mp3'] as const) {
      const result = await client.run({ kind: 'extract-audio', file, format })
      expect(result.copied).toBe(false)
      const audio = await readAudio(result.blob)
      expect(audio.codec).toBe(format === 'm4a' ? 'aac' : 'mp3')
      expect(audio.duration).toBeCloseTo(1, 1)
      expect((await measureTone(result.blob, 0.2, 0.8)).frequency).toBeCloseTo(440, -1)
    }
    await expect(client.run({ kind: 'extract-audio', file, format: 'webm' })).rejects.toEqual(new VideoJobError('unexpected'))
  })

  it('o arquivo de som sai sem metadados (título, localização)', SLOW, async () => {
    const file = await fixtureBlob(comSomUrl)
    const original = await readAudio(file)
    expect(original.tags).toMatchObject({ title: 'Viagem de teste', raw: { '©xyz': '+12.3456-045.6789/' } })
    for (const format of ['m4a', 'mp3'] as const) {
      const result = await client.run({ kind: 'extract-audio', file, format })
      const audio = await readAudio(result.blob)
      expect(audio.tags).not.toHaveProperty('title')
      expect(audio.tags).not.toHaveProperty('comment')
      expect(JSON.stringify(audio.tags)).not.toContain('12.3456')
      expect(new TextDecoder('latin1').decode(new Uint8Array(await result.blob.arrayBuffer()))).not.toContain('Viagem de teste')
    }
  })

  it('vídeo sem som, formato desconhecido ou WEBM sem som Opus são recusados', async () => {
    await expect(client.run({ kind: 'extract-audio', file: await fixtureBlob(giradoUrl), format: 'm4a' })).rejects.toEqual(new VideoJobError('no-audio'))
    const file = await fixtureBlob(segundosMp4Url)
    await expect(client.run({ kind: 'extract-audio', file, format: 'webm' })).rejects.toEqual(new VideoJobError('unexpected'))
    // Pedido malformado: o protocolo é tipado, mas o Worker não confia no que recebe.
    const malformed = { kind: 'extract-audio', file, format: 'wav' } as unknown as ExtractAudioJob
    await expect(client.run(malformed)).rejects.toEqual(new VideoJobError('unexpected'))
  })
})
