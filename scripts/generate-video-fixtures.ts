/**
 * Gera os vídeos de teste em tests/fixtures/videos/ (pequenos, sem gravações reais).
 * Uso: npm run fixtures. Codifica com o Mediabunny no Chromium do Playwright, que tem os codificadores
 * do WebCodecs (H.264, VP9, AAC, Opus). A página e o pacote são servidos pelo próprio Playwright:
 * nada é baixado da internet.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium, type Page } from '@playwright/test'
import { concat } from '../src/test/image-bytes.ts'

const OUTPUT_DIR = new URL('../tests/fixtures/videos/', import.meta.url)
const BUNDLE = new URL('../node_modules/mediabunny/dist/bundles/mediabunny.min.mjs', import.meta.url)
// localhost é contexto seguro, exigido pelo WebCodecs. Nenhum servidor escuta aqui: o Playwright responde.
const ORIGIN = 'http://localhost:4999'

/**
 * seconds: uma cor por segundo (vermelho, verde, azul, amarelo, e repete).
 * quadrants: vermelho, verde, azul e amarelo nos quadrantes (em leitura: esquerda→direita, cima→baixo).
 * halves: metade esquerda vermelha, direita azul.
 * textured: os quadrantes com ruído que muda a cada quadro (textura que pesa como um vídeo real, para comprimir).
 */
type Drawing = 'seconds' | 'quadrants' | 'halves' | 'textured'

interface Recipe {
  container: 'mp4' | 'mov' | 'webm' | 'mkv'
  duration: number
  video?: {
    codec: 'avc' | 'vp9'
    width: number
    height: number
    drawing: Drawing
    rotation?: 0 | 90
    /** Quadros por segundo; o padrão é 30. */
    fps?: number
    /** Taxa fixa do vídeo, em bits por segundo; sem ela, qualidade alta. */
    bitrate?: number
    /** Lado dos blocos de ruído da textura, em pixels (padrão 8); blocos maiores pesam menos. */
    noiseBlock?: number
  }
  audio?: { codec: 'aac' | 'opus' }
  /** `false`: índice (moov) no fim do arquivo, para gerar um MP4 truncado ilegível. */
  fastStart?: false
  /** Título, comentário e localização, para conferir que o resultado sai sem metadados. */
  tags?: boolean
}

/**
 * Roda na página: desenha cada quadro, codifica e devolve os bytes do arquivo. Só usa o que recebe
 * e o que declara dentro de si: o Playwright envia o texto da função, sem o resto do módulo.
 */
async function encode(recipe: Recipe): Promise<number[]> {
  const M: typeof import('mediabunny') = await import('/mediabunny.js' as string)
  const FPS = recipe.video?.fps ?? 30
  const KEY_FRAME_INTERVAL = 2 // segundos: quadros-chave em 0, 2, 4...
  const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
  const formats = {
    mp4: () => new M.Mp4OutputFormat(recipe.fastStart === false ? { fastStart: false } : {}),
    mov: () => new M.MovOutputFormat(),
    webm: () => new M.WebMOutputFormat(),
    mkv: () => new M.MkvOutputFormat(),
  }
  const output = new M.Output({ format: formats[recipe.container](), target: new M.BufferTarget() })

  let draw: ((time: number) => void) | undefined
  let videoSource: InstanceType<typeof M.CanvasSource> | undefined
  if (recipe.video) {
    const { width, height, drawing, codec, rotation = 0, bitrate, noiseBlock = 8 } = recipe.video
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponível')
    const fill = (color: string, x: number, y: number, w: number, h: number) => {
      context.fillStyle = color
      context.fillRect(x, y, w, h)
    }
    // Ruído reproduzível: o mesmo gerador (mulberry32) com a mesma semente a cada execução.
    let seed = 20261121
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
    draw = (time) => {
      if (drawing === 'seconds') fill(COLORS[Math.floor(time) % 4] ?? '#000', 0, 0, width, height)
      else if (drawing === 'quadrants' || drawing === 'textured') {
        const [w, h] = [width / 2, height / 2]
        ;[
          [0, 0],
          [w, 0],
          [0, h],
          [w, h],
        ].forEach(([x = 0, y = 0], index) => fill(COLORS[index] ?? '#000', x, y, w, h))
        if (drawing === 'textured') {
          // Blocos com até 40 de variação: pesa como um vídeo real, e a cor de cada quadrante continua
          // reconhecível pelo canal dominante.
          const BLOCK = noiseBlock
          for (let y = 0; y < height; y += BLOCK) {
            for (let x = 0; x < width; x += BLOCK) {
              const shade = Math.round((random() - 0.5) * 80)
              context.fillStyle = shade >= 0 ? `rgba(255, 255, 255, ${shade / 255})` : `rgba(0, 0, 0, ${-shade / 255})`
              context.fillRect(x, y, BLOCK, BLOCK)
            }
          }
        }
      } else {
        fill('#ff0000', 0, 0, width / 2, height)
        fill('#0000ff', width / 2, 0, width / 2, height)
      }
    }
    const quality = bitrate ? new M.Quality({ bitrate }) : new M.Quality('high')
    videoSource = new M.CanvasSource(canvas, { codec, quality, keyFrameInterval: KEY_FRAME_INTERVAL })
    output.addVideoTrack(videoSource, { frameRate: FPS, rotation })
  }

  let audioSource: InstanceType<typeof M.AudioBufferSource> | undefined
  if (recipe.audio) {
    // Taxa baixa (a menor que o AAC do Chromium aceita): só importa haver som, e os arquivos ficam pequenos.
    const bitrate = recipe.audio.codec === 'aac' ? 96_000 : 32_000
    audioSource = new M.AudioBufferSource({ codec: recipe.audio.codec, quality: new M.Quality({ bitrate }) })
    output.addAudioTrack(audioSource)
  }
  if (recipe.tags) {
    output.setMetadataTags({ title: 'Viagem de teste', comment: 'Gravado em casa', raw: { '©xyz': '+12.3456-045.6789/' } })
  }

  await output.start()
  if (audioSource) {
    const sampleRate = 48_000
    const length = Math.round(recipe.duration * sampleRate)
    const buffer = new AudioBuffer({ length, numberOfChannels: 2, sampleRate })
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel)
      for (let index = 0; index < length; index += 1) data[index] = 0.2 * Math.sin((2 * Math.PI * 440 * index) / sampleRate)
    }
    await audioSource.add(buffer)
    audioSource.close()
  }
  if (videoSource && draw) {
    const frames = Math.round(recipe.duration * FPS)
    for (let frame = 0; frame < frames; frame += 1) {
      draw(frame / FPS)
      await videoSource.add(frame / FPS, 1 / FPS)
    }
    videoSource.close()
  }
  await output.finalize()
  const { buffer } = output.target
  if (!buffer) throw new Error('vídeo não gerado')
  return Array.from(new Uint8Array(buffer))
}

async function render(page: Page, recipe: Recipe): Promise<Uint8Array> {
  return Uint8Array.from(await page.evaluate(encode, recipe))
}

const SECONDS = { width: 320, height: 240, drawing: 'seconds' } as const

const RECIPES: Record<string, Recipe> = {
  // 4 s com som; quadros-chave em 0 e 2 s: cortar em 1,5 s recodifica, em 2 s copia.
  'segundos.mp4': { container: 'mp4', duration: 4, video: { codec: 'avc', ...SECONDS }, audio: { codec: 'aac' } },
  'segundos.webm': { container: 'webm', duration: 4, video: { codec: 'vp9', ...SECONDS }, audio: { codec: 'opus' } },
  'quadrantes.mov': { container: 'mov', duration: 1, video: { codec: 'avc', width: 320, height: 240, drawing: 'quadrants' }, tags: true },
  // Gravado deitado (320 × 240) com rotação de 90°: aparece em pé (240 × 320), vermelho em cima.
  'girado.mp4': { container: 'mp4', duration: 1, video: { codec: 'avc', width: 320, height: 240, drawing: 'halves', rotation: 90 } },
  // Longo o bastante para cancelar no meio da recodificação (sem som: ele não muda o tempo de recodificar).
  'longo.mp4': { container: 'mp4', duration: 30, video: { codec: 'avc', width: 640, height: 360, drawing: 'seconds' } },
  'so-audio.mp4': { container: 'mp4', duration: 1, audio: { codec: 'aac' } },
  'video.mkv': { container: 'mkv', duration: 1, video: { codec: 'vp9', width: 160, height: 120, drawing: 'quadrants' } },
  // Com textura e em qualidade alta: comprimir reduz bastante; o lado menor (736) passa de 720 (nível Forte).
  'detalhado.mp4': {
    container: 'mp4',
    duration: 1,
    video: { codec: 'avc', width: 976, height: 736, drawing: 'textured', fps: 6 },
    audio: { codec: 'aac' },
  },
  // Com textura, mas já numa taxa baixa: comprimir no nível Leve não diminui, e o original é mantido.
  'ja-comprimido.mp4': {
    container: 'mp4',
    duration: 1,
    video: { codec: 'avc', width: 640, height: 360, drawing: 'textured', fps: 15, bitrate: 60_000, noiseBlock: 40 },
  },
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const bundle = await readFile(BUNDLE)
  await page.route(`${ORIGIN}/**`, (route) =>
    new URL(route.request().url()).pathname === '/mediabunny.js'
      ? route.fulfill({ body: bundle, contentType: 'text/javascript' })
      : route.fulfill({ body: '<!doctype html><title>Vídeos de teste</title>', contentType: 'text/html' }),
  )
  await page.goto(`${ORIGIN}/`)

  const fixtures: Record<string, Uint8Array> = {}
  for (const [name, recipe] of Object.entries(RECIPES)) fixtures[name] = await render(page, recipe)

  // Índice no fim e só a primeira metade dos bytes: o arquivo não pode ser lido.
  const unindexed = await render(page, { ...RECIPES['segundos.mp4']!, fastStart: false })
  fixtures['cortado.mp4'] = unindexed.slice(0, Math.floor(unindexed.length / 2))
  fixtures['texto.mp4'] = concat('Isto é um texto com extensão de vídeo, não um vídeo.\n')
  fixtures['vazio.mp4'] = new Uint8Array()

  await mkdir(OUTPUT_DIR, { recursive: true })
  for (const [name, bytes] of Object.entries(fixtures)) {
    await writeFile(new URL(name, OUTPUT_DIR), bytes)
    console.log(`tests/fixtures/videos/${name} (${bytes.length} bytes)`)
  }
} finally {
  await browser.close()
}
