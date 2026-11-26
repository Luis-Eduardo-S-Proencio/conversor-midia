import { unzipSync } from 'fflate'
import { afterAll, describe, expect, it } from 'vitest'
import { DEFAULT_FRAMING, FREE_FRAME_COLOR, planCollage, type CollagePhoto, type CollagePlan } from '../core/image/collage'
import { detectImageType } from '../core/image/signature'
import { readIco, readPdf, readTiff } from '../test/format-readers'
import { withExifOrientation } from '../test/image-bytes'
import { createImageWorkerClient } from './image-client'
import type { CollageJob } from './image-protocol'

// Worker real, no Chromium: confere bytes, dimensões e pixels do resultado, não só "gerou algo".
const client = createImageWorkerClient()
afterAll(() => client.dispose())

type Draw = (context: OffscreenCanvasRenderingContext2D, width: number, height: number) => void

async function makeImage(width: number, height: number, draw: Draw, type = 'image/png', quality?: number) {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponível')
  draw(context, width, height)
  return canvas.convertToBlob({ type, quality })
}

/** Vermelho, verde e azul em três quadrantes; o quarto (inferior direito) transparente. */
const quadrants: Draw = (context, width, height) => {
  const [w, h] = [width / 2, height / 2]
  context.fillStyle = '#ff0000'
  context.fillRect(0, 0, w, h)
  context.fillStyle = '#00ff00'
  context.fillRect(w, 0, w, h)
  context.fillStyle = '#0000ff'
  context.fillRect(0, h, w, h)
}

async function inspect(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponível')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data)
  return { width: canvas.width, height: canvas.height, pixel }
}

async function formatOf(blob: Blob) {
  return detectImageType(new Uint8Array(await blob.arrayBuffer()))
}

/** Cor aproximada: JPEG altera levemente os valores. */
function expectColor(actual: number[], expected: [number, number, number]) {
  expected.forEach((channel, index) => expect(Math.abs((actual[index] ?? -1) - channel)).toBeLessThanOrEqual(12))
}

describe('Worker de imagens (Chromium real)', () => {
  it('PNG → JPG: gera JPEG de verdade, mantém dimensões e cores e pinta a transparência de branco', async () => {
    const png = await makeImage(64, 64, quadrants)
    const result = await client.run({ kind: 'convert', file: png, target: 'jpeg', quality: 0.92, background: '#ffffff' })

    expect(result.blob.type).toBe('image/jpeg')
    expect(await formatOf(result.blob)).toEqual({ kind: 'supported', format: 'jpeg' })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([64, 64])
    expectColor(output.pixel(16, 16), [255, 0, 0])
    expectColor(output.pixel(48, 16), [0, 255, 0])
    expectColor(output.pixel(16, 48), [0, 0, 255])
    expectColor(output.pixel(48, 48), [255, 255, 255])
  })

  it('usa o fundo escolhido onde a imagem era transparente', async () => {
    const png = await makeImage(64, 64, quadrants)
    const result = await client.run({ kind: 'convert', file: png, target: 'jpeg', quality: 0.92, background: '#000000' })
    expectColor((await inspect(result.blob)).pixel(48, 48), [0, 0, 0])
  })

  it('JPG → PNG gera PNG com as mesmas dimensões', async () => {
    const jpeg = await makeImage(40, 30, quadrants, 'image/jpeg', 0.9)
    const png = await client.run({ kind: 'convert', file: jpeg, target: 'png', quality: 0.85, background: '#ffffff' })
    expect(await formatOf(png.blob)).toEqual({ kind: 'supported', format: 'png' })
    expect([png.width, png.height]).toEqual([40, 30])
  })

  it('PNG → WEBP gera WEBP e preserva a transparência', async () => {
    const png = await makeImage(40, 30, quadrants)
    const webp = await client.run({ kind: 'convert', file: png, target: 'webp', quality: 0.85, background: '#ffffff' })
    expect(await formatOf(webp.blob)).toEqual({ kind: 'supported', format: 'webp' })
    expect((await inspect(webp.blob)).pixel(30, 25)[3]).toBeLessThan(10)
  })

  it('qualidade menor gera arquivo menor', async () => {
    const noise = await makeImage(256, 256, (context, width, height) => {
      const image = context.createImageData(width, height)
      for (let index = 0; index < image.data.length; index += 1) image.data[index] = (index * 7919) % 256
      context.putImageData(image, 0, 0)
    })
    const low = await client.run({ kind: 'convert', file: noise, target: 'jpeg', quality: 0.3, background: '#ffffff' })
    const high = await client.run({ kind: 'convert', file: noise, target: 'jpeg', quality: 0.9, background: '#ffffff' })
    expect(low.blob.size).toBeLessThan(high.blob.size)
  })

  it('aplica a orientação EXIF: foto girada sai com largura e altura trocadas', async () => {
    const halves: Draw = (context, width, height) => {
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, width / 2, height)
      context.fillStyle = '#0000ff'
      context.fillRect(width / 2, 0, width / 2, height)
    }
    const jpeg = await makeImage(64, 32, halves, 'image/jpeg', 0.95)
    const rotated = new Blob([withExifOrientation(new Uint8Array(await jpeg.arrayBuffer()), 6)], { type: 'image/jpeg' })

    const result = await client.run({ kind: 'convert', file: rotated, target: 'png', quality: 0.85, background: '#ffffff' })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([32, 64])
    expectColor(output.pixel(16, 12), [255, 0, 0]) // a metade esquerda foi para cima
    expectColor(output.pixel(16, 52), [0, 0, 255])
  })

  it('arquivo corrompido falha com o código decode-failed', async () => {
    const broken = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])])
    await expect(client.run({ kind: 'convert', file: broken, target: 'jpeg', quality: 0.85, background: '#ffffff' })).rejects.toMatchObject({
      code: 'decode-failed',
    })
  })

  it('prévia e miniatura respeitam o tamanho máximo e mantêm a proporção', async () => {
    const png = await makeImage(400, 200, quadrants)
    const result = await client.run({ kind: 'preview', file: png, previewSize: 100, thumbnailSize: 48 })

    expect([result.width, result.height]).toEqual([400, 200])
    const preview = await inspect(result.preview)
    expect([preview.width, preview.height]).toEqual([100, 50])
    const thumbnail = await inspect(result.thumbnail)
    expect([thumbnail.width, thumbnail.height]).toEqual([48, 24])
  })

  it('sonda: o Chromium gera WEBP pelo canvas', async () => {
    await expect(client.run({ kind: 'probe' })).resolves.toEqual({ kind: 'probe', webpEncoding: true })
  })

  it('ZIP: guarda os arquivos com os nomes pedidos, sem alterar o conteúdo', async () => {
    const first = await makeImage(10, 10, quadrants)
    const second = await makeImage(20, 20, quadrants, 'image/jpeg', 0.9)
    const result = await client.run({
      kind: 'zip',
      entries: [
        { name: 'praia.png', blob: first },
        { name: 'café da manhã.jpg', blob: second },
      ],
    })

    expect(result.blob.type).toBe('application/zip')
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
    expect(Object.keys(files)).toEqual(['praia.png', 'café da manhã.jpg'])
    expect(files['praia.png']).toEqual(new Uint8Array(await first.arrayBuffer()))
    expect(files['café da manhã.jpg']).toEqual(new Uint8Array(await second.arrayBuffer()))
  })
})

describe('Redimensionar (Chromium real)', () => {
  it('desenha nas medidas pedidas antes de codificar, com as cores no lugar e a transparência mantida', async () => {
    const png = await makeImage(64, 64, quadrants)
    const result = await client.run({
      kind: 'convert',
      file: png,
      target: 'png',
      quality: 0.92,
      background: '#ffffff',
      resize: { width: 32, height: 32 },
    })

    expect([result.width, result.height]).toEqual([32, 32])
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([32, 32])
    expectColor(output.pixel(8, 8), [255, 0, 0])
    expectColor(output.pixel(24, 8), [0, 255, 0])
    expectColor(output.pixel(8, 24), [0, 0, 255])
    expect(output.pixel(24, 24)[3]).toBe(0)
  })

  it('foto com orientação EXIF: as medidas pedidas valem para a imagem em pé', async () => {
    const halves: Draw = (context, width, height) => {
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, width / 2, height)
      context.fillStyle = '#0000ff'
      context.fillRect(width / 2, 0, width / 2, height)
    }
    const jpeg = await makeImage(64, 32, halves, 'image/jpeg', 0.95)
    const rotated = new Blob([withExifOrientation(new Uint8Array(await jpeg.arrayBuffer()), 6)], { type: 'image/jpeg' })

    const result = await client.run({
      kind: 'convert',
      file: rotated,
      target: 'png',
      quality: 0.92,
      background: '#ffffff',
      resize: { width: 16, height: 32 },
    })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([16, 32])
    expectColor(output.pixel(8, 6), [255, 0, 0]) // a metade esquerda foi para cima
    expectColor(output.pixel(8, 26), [0, 0, 255])
  })

  it('redução forte sem listras falsas (moiré): listras de 1 px viram cinza uniforme', async () => {
    const stripes = await makeImage(800, 40, (context, width, height) => {
      context.fillStyle = '#000000'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#ffffff'
      for (let x = 1; x < width; x += 2) context.fillRect(x, 0, 1, height)
    })
    const result = await client.run({
      kind: 'convert',
      file: stripes,
      target: 'png',
      quality: 0.92,
      background: '#ffffff',
      resize: { width: 103, height: 5 },
    })

    const output = await inspect(result.blob)
    const row = Array.from({ length: output.width }, (_, x) => output.pixel(x, 2)[0] ?? -1)
    expect(Math.min(...row)).toBeGreaterThanOrEqual(115)
    expect(Math.max(...row)).toBeLessThanOrEqual(140)
  })

  it('medidas exatas podem ampliar e deformar', async () => {
    const png = await makeImage(32, 32, quadrants)
    const result = await client.run({
      kind: 'convert',
      file: png,
      target: 'jpeg',
      quality: 0.92,
      background: '#ffffff',
      resize: { width: 64, height: 48 },
    })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([64, 48])
    expectColor(output.pixel(16, 12), [255, 0, 0])
    expectColor(output.pixel(48, 36), [255, 255, 255]) // o quadrante transparente, no fundo escolhido
  })
})

describe('Girar e espelhar (Chromium real)', () => {
  const RED = [255, 0, 0] as const
  const GREEN = [0, 255, 0] as const
  const BLUE = [0, 0, 255] as const
  type Expected = readonly [number, number, number] | 'transparente'

  /** Confere a cor no centro de cada quadrante do resultado (64 × 32 de origem, com o inferior direito transparente). */
  async function expectQuadrants(orientation: { quarterTurns: 0 | 1 | 2 | 3; mirrored: boolean }, expected: Record<'tl' | 'tr' | 'bl' | 'br', Expected>) {
    const png = await makeImage(64, 32, quadrants)
    const result = await client.run({ kind: 'convert', file: png, target: 'png', quality: 0.92, background: '#ffffff', orientation })
    const output = await inspect(result.blob)
    const [w, h] = [output.width, output.height]
    expect([result.width, result.height]).toEqual([w, h])
    const centers = { tl: [w / 4, h / 4], tr: [(w * 3) / 4, h / 4], bl: [w / 4, (h * 3) / 4], br: [(w * 3) / 4, (h * 3) / 4] } as const
    for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
      const [x, y] = centers[corner]
      const color = output.pixel(x, y)
      const want = expected[corner]
      if (want === 'transparente') expect(color[3], corner).toBe(0)
      else expect(color, corner).toEqual([...want, 255])
    }
    return [w, h]
  }

  it('girar à direita: medidas trocadas, cada pixel no lugar exato', async () => {
    const size = await expectQuadrants({ quarterTurns: 1, mirrored: false }, { tl: BLUE, tr: RED, bl: 'transparente', br: GREEN })
    expect(size).toEqual([32, 64])
  })

  it('girar à esquerda', async () => {
    const size = await expectQuadrants({ quarterTurns: 3, mirrored: false }, { tl: GREEN, tr: 'transparente', bl: RED, br: BLUE })
    expect(size).toEqual([32, 64])
  })

  it('espelhar na horizontal e na vertical mantêm as medidas', async () => {
    expect(await expectQuadrants({ quarterTurns: 0, mirrored: true }, { tl: GREEN, tr: RED, bl: 'transparente', br: BLUE })).toEqual([64, 32])
    expect(await expectQuadrants({ quarterTurns: 2, mirrored: true }, { tl: BLUE, tr: 'transparente', bl: RED, br: GREEN })).toEqual([64, 32])
  })

  it('foto com orientação EXIF: o giro vale para a imagem como ela aparece', async () => {
    const halves: Draw = (context, width, height) => {
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, width / 2, height)
      context.fillStyle = '#0000ff'
      context.fillRect(width / 2, 0, width / 2, height)
    }
    // Gravada deitada com EXIF 6: aparece em pé, vermelho em cima. Girada à direita, o vermelho vai para a direita.
    const jpeg = await makeImage(64, 32, halves, 'image/jpeg', 0.95)
    const upright = new Blob([withExifOrientation(new Uint8Array(await jpeg.arrayBuffer()), 6)], { type: 'image/jpeg' })
    const result = await client.run({
      kind: 'convert',
      file: upright,
      target: 'png',
      quality: 0.92,
      background: '#ffffff',
      orientation: { quarterTurns: 1, mirrored: false },
    })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([64, 32])
    expectColor(output.pixel(48, 16), [255, 0, 0])
    expectColor(output.pixel(16, 16), [0, 0, 255])
  })
})

describe('Recortar (Chromium real)', () => {
  const cropPng = async (file: Blob, crop: { x: number; y: number; width: number; height: number }) =>
    client.run({ kind: 'convert', file, target: 'png', quality: 0.92, background: '#ffffff', crop })

  it('recorta exatamente a área pedida, pixel a pixel', async () => {
    const result = await cropPng(await makeImage(64, 64, quadrants), { x: 32, y: 0, width: 32, height: 32 })
    expect([result.width, result.height]).toEqual([32, 32])
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([32, 32])
    for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31]] as const) expect(output.pixel(x, y)).toEqual([0, 255, 0, 255])
  })

  it('área que atravessa os quadrantes mantém cada cor e a transparência no lugar', async () => {
    const output = await inspect((await cropPng(await makeImage(64, 64, quadrants), { x: 16, y: 16, width: 32, height: 32 })).blob)
    expect(output.pixel(8, 8)).toEqual([255, 0, 0, 255])
    expect(output.pixel(24, 8)).toEqual([0, 255, 0, 255])
    expect(output.pixel(8, 24)).toEqual([0, 0, 255, 255])
    expect(output.pixel(24, 24)[3]).toBe(0)
  })

  it('foto com orientação EXIF: a área vale para a imagem como ela aparece', async () => {
    const halves: Draw = (context, width, height) => {
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, width / 2, height)
      context.fillStyle = '#0000ff'
      context.fillRect(width / 2, 0, width / 2, height)
    }
    // Aparece em pé (32 × 64), com o vermelho em cima e o azul embaixo.
    const jpeg = await makeImage(64, 32, halves, 'image/jpeg', 0.95)
    const upright = new Blob([withExifOrientation(new Uint8Array(await jpeg.arrayBuffer()), 6)], { type: 'image/jpeg' })

    const top = await inspect((await cropPng(upright, { x: 0, y: 0, width: 32, height: 28 })).blob)
    expect([top.width, top.height]).toEqual([32, 28])
    expectColor(top.pixel(16, 14), [255, 0, 0])
    const bottom = await inspect((await cropPng(upright, { x: 0, y: 36, width: 32, height: 28 })).blob)
    expectColor(bottom.pixel(16, 14), [0, 0, 255])
  })

  it('área fora da imagem é recusada, sem gerar arquivo', async () => {
    await expect(cropPng(await makeImage(64, 64, quadrants), { x: 60, y: 0, width: 10, height: 10 })).rejects.toMatchObject({ code: 'unexpected' })
  })
})

describe('Formatos escritos pelo app (Chromium real)', () => {
  const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())
  const convertQuadrants = async (target: 'png' | 'bmp' | 'tiff' | 'ico' | 'pdf', background = '#ffffff') =>
    client.run({ kind: 'convert', file: await makeImage(64, 64, quadrants), target, quality: 0.92, background })

  it('PNG → BMP: o navegador lê; a transparência vira o fundo escolhido', async () => {
    const result = await convertQuadrants('bmp', '#000000')
    expect(result.blob.type).toBe('image/bmp')
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([64, 64])
    expect(output.pixel(16, 16)).toEqual([255, 0, 0, 255])
    expect(output.pixel(48, 48)).toEqual([0, 0, 0, 255])
  })

  it('PNG → TIFF: RGBA com os pixels exatos; JPG → TIFF: RGB', async () => {
    const tiff = readTiff(await bytesOf((await convertQuadrants('tiff')).blob))
    const pixel = (x: number, y: number) => Array.from(tiff.pixels.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4))
    expect([tiff.width, tiff.height, tiff.samplesPerPixel]).toEqual([64, 64, 4])
    expect(pixel(16, 16)).toEqual([255, 0, 0, 255])
    expect(pixel(48, 48)[3]).toBe(0)

    const jpeg = await makeImage(40, 30, quadrants, 'image/jpeg', 0.9)
    const opaque = await client.run({ kind: 'convert', file: jpeg, target: 'tiff', quality: 0.85, background: '#ffffff' })
    expect(opaque.blob.type).toBe('image/tiff')
    expect(readTiff(await bytesOf(opaque.blob)).samplesPerPixel).toBe(3)
  })

  it('PNG → ICO: tamanhos de 16, 32 e 48 em PNG, legíveis pelo navegador', async () => {
    const result = await convertQuadrants('ico')
    expect(result.blob.type).toBe('image/x-icon')
    const entries = readIco(await bytesOf(result.blob))
    expect(entries.map(({ width, height }) => [width, height])).toEqual([
      [16, 16],
      [32, 32],
      [48, 48],
    ])
    for (const entry of entries) expect(detectImageType(entry.data)).toEqual({ kind: 'supported', format: 'png' })
    const largest = await inspect(new Blob([entries[2]?.data.slice() ?? new Uint8Array()]))
    expectColor(largest.pixel(12, 12), [255, 0, 0])
    expect(largest.pixel(36, 36)[3]).toBe(0)
    await expect(createImageBitmap(result.blob)).resolves.toBeDefined() // o próprio .ico também abre
  })

  it('ICO de imagem retangular: centralizada, com margens transparentes', async () => {
    const wide = await makeImage(64, 32, (context, width, height) => {
      context.fillStyle = '#0000ff'
      context.fillRect(0, 0, width, height)
    })
    const result = await client.run({ kind: 'convert', file: wide, target: 'ico', quality: 0.85, background: '#ffffff' })
    const [, , icon48] = readIco(await bytesOf(result.blob))
    const output = await inspect(new Blob([icon48?.data.slice() ?? new Uint8Array()]))
    expect(output.pixel(24, 4)[3]).toBe(0) // margem de cima
    expectColor(output.pixel(24, 24), [0, 0, 255])
  })

  /** Tipo de cor gravado no IHDR do PNG: 2 (RGB), 3 (paleta), 6 (RGBA). */
  const pngColorType = async (blob: Blob) => (await bytesOf(blob))[25]

  it('PNG próprio: poucas cores viram paleta, com cada pixel e a transparência exatos', async () => {
    const result = await convertQuadrants('png')
    expect(result.blob.type).toBe('image/png')
    expect(await pngColorType(result.blob)).toBe(3)
    const output = await inspect(result.blob)
    expect(output.pixel(16, 16)).toEqual([255, 0, 0, 255])
    expect(output.pixel(48, 16)).toEqual([0, 255, 0, 255])
    expect(output.pixel(16, 48)).toEqual([0, 0, 255, 255])
    expect(output.pixel(48, 48)).toEqual([0, 0, 0, 0])
  })

  it('PNG próprio: foto opaca sai em RGB, bem menor que o PNG do navegador, com os pixels exatos', async () => {
    let seed = 3
    const photo = new OffscreenCanvas(200, 150)
    const context = photo.getContext('2d') as OffscreenCanvasRenderingContext2D
    const data = context.createImageData(200, 150)
    for (let index = 0; index < data.data.length; index += 4) {
      seed = (seed * 16807) % 2147483647
      const x = (index / 4) % 200
      data.data.set([x, 255 - x, seed % 64, 255], index)
    }
    context.putImageData(data, 0, 0)
    const browserPng = await photo.convertToBlob({ type: 'image/png' })
    const result = await client.run({ kind: 'convert', file: browserPng, target: 'png', quality: 0.92, background: '#ffffff' })
    expect(await pngColorType(result.blob)).toBe(2)
    expect(result.blob.size).toBeLessThan(browserPng.size * 0.85)
    const output = await inspect(result.blob)
    for (const [x, y] of [
      [0, 0],
      [123, 45],
      [199, 149],
    ] as const) {
      expect(output.pixel(x, y)).toEqual(Array.from(data.data.subarray((y * 200 + x) * 4, (y * 200 + x) * 4 + 4)))
    }
  })

  it('PNG próprio dentro do ICO: sempre RGBA (o que o Windows garante ler)', async () => {
    const entries = readIco(await bytesOf((await convertQuadrants('ico')).blob))
    for (const entry of entries) expect(entry.data[25]).toBe(6)
  })

  it('PNG → PDF: página do tamanho da imagem, com o JPEG legível dentro e o fundo aplicado', async () => {
    const result = await convertQuadrants('pdf')
    expect(result.blob.type).toBe('application/pdf')
    const pdf = readPdf(await bytesOf(result.blob))
    expect(pdf.image).toMatchObject({ width: 64, height: 64, filter: 'DCTDecode' })
    expect(pdf.mediaBox).toEqual([0, 0, 48, 48])

    const embedded = await inspect(new Blob([pdf.image.bytes.slice()]))
    expectColor(embedded.pixel(16, 16), [255, 0, 0])
    expectColor(embedded.pixel(48, 48), [255, 255, 255])
  })
})

describe('Colagem no Worker (Chromium real)', () => {
  const solid =
    (color: string): Draw =>
    (context, width, height) => {
      context.fillStyle = color
      context.fillRect(0, 0, width, height)
    }

  const collagePhoto = (width: number, height: number, placement = { x: 0.5, y: 0.5, width: 0.4, rotation: 0 }): CollagePhoto => ({
    width,
    height,
    framing: DEFAULT_FRAMING,
    placement,
  })

  function jobFor(plan: CollagePlan, files: Blob[]): CollageJob {
    return {
      kind: 'collage',
      width: plan.width,
      height: plan.height,
      background: plan.background,
      quality: 0.9,
      shadow: plan.shadow,
      pieces: plan.pieces.map((piece) => ({
        file: files[piece.index] ?? new Blob(),
        box: piece.box,
        radius: piece.radius,
        border: piece.border,
        borderColor: FREE_FRAME_COLOR,
        source: piece.source,
      })),
    }
  }

  it('grade: cada foto no seu espaço, a borda na cor escolhida e um JPG com as medidas do plano', async () => {
    const red = await makeImage(300, 300, solid('#ff0000'))
    const blue = await makeImage(400, 200, solid('#0000ff'))
    const plan = planCollage(
      {
        mode: 'grid',
        ratio: '16:9',
        layoutId: '2-lado',
        photos: [collagePhoto(300, 300), collagePhoto(400, 200)],
        style: { spacing: 50, radius: 0, color: '#00ff00', shadow: false },
      },
      1080,
    )
    const result = await client.run(jobFor(plan, [red, blue]))

    expect(result.blob.type).toBe('image/jpeg')
    expect(await formatOf(result.blob)).toEqual({ kind: 'supported', format: 'jpeg' })
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([1080, 608])
    const [left, right] = plan.pieces
    if (!left || !right) throw new Error('plano incompleto')
    expectColor(output.pixel(Math.round(left.box.cx), Math.round(left.box.cy)), [255, 0, 0])
    expectColor(output.pixel(Math.round(right.box.cx), Math.round(right.box.cy)), [0, 0, 255])
    expectColor(output.pixel(4, 4), [0, 255, 0]) // borda de fora
    expectColor(output.pixel(540, 304), [0, 255, 0]) // borda entre as fotos
  })

  it('grade: só a parte enquadrada da foto aparece no espaço', async () => {
    // Metade esquerda vermelha, direita azul; enquadrada à direita num espaço quadrado, só o azul aparece.
    const halves = await makeImage(400, 200, (context) => {
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, 200, 200)
      context.fillStyle = '#0000ff'
      context.fillRect(200, 0, 200, 200)
    })
    const photos = [{ ...collagePhoto(400, 200), framing: { focusX: 1, focusY: 0.5, zoom: 1 } }, collagePhoto(400, 200)]
    const plan = planCollage(
      { mode: 'grid', ratio: '16:9', layoutId: '2-lado', photos, style: { spacing: 0, radius: 0, color: '#ffffff', shadow: false } },
      1080,
    )
    const output = await inspect((await client.run(jobFor(plan, [halves, halves]))).blob)
    // O espaço da esquerda (540 × 608, quase quadrado) mostra a metade azul inteira.
    expectColor(output.pixel(40, 300), [0, 0, 255])
    expectColor(output.pixel(500, 300), [0, 0, 255])
  })

  it('livre: moldura branca em volta da foto, a de cima cobre a de baixo, e o fundo fica com a cor escolhida', async () => {
    const red = await makeImage(400, 400, solid('#ff0000'))
    const blue = await makeImage(400, 400, solid('#0000ff'))
    const plan = planCollage(
      {
        mode: 'free',
        ratio: '1:1',
        photos: [collagePhoto(400, 400, { x: 0.4, y: 0.5, width: 0.4, rotation: 0 }), collagePhoto(400, 400, { x: 0.6, y: 0.5, width: 0.4, rotation: 0 })],
        style: { spacing: 100, radius: 0, color: '#000000', shadow: false },
      },
      1080,
    )
    const output = await inspect((await client.run(jobFor(plan, [red, blue]))).blob)
    expect([output.width, output.height]).toEqual([1080, 1080])
    expectColor(output.pixel(540, 540), [0, 0, 255]) // onde as duas se cruzam, a de cima (azul)
    expectColor(output.pixel(260, 540), [255, 0, 0]) // só a de baixo
    const border = plan.pieces[0]?.border ?? 0
    expect(border).toBeGreaterThan(20)
    expectColor(output.pixel(Math.round(0.4 * 1080 - 0.2 * 1080 - border / 2), 540), [255, 255, 255]) // moldura
    expectColor(output.pixel(20, 20), [0, 0, 0]) // fundo
  })

  it('livre: foto girada fica girada no arquivo', async () => {
    // Faixa vermelha horizontal sobre fundo azul; girada 90°, a faixa fica em pé.
    const stripe = await makeImage(400, 400, (context) => {
      context.fillStyle = '#0000ff'
      context.fillRect(0, 0, 400, 400)
      context.fillStyle = '#ff0000'
      context.fillRect(0, 160, 400, 80)
    })
    const plan = planCollage(
      {
        mode: 'free',
        ratio: '1:1',
        photos: [collagePhoto(400, 400, { x: 0.5, y: 0.5, width: 0.8, rotation: 90 }), collagePhoto(10, 10, { x: 0.02, y: 0.02, width: 0.01, rotation: 0 })],
        style: { spacing: 0, radius: 0, color: '#ffffff', shadow: false },
      },
      1080,
    )
    const output = await inspect((await client.run(jobFor(plan, [stripe, stripe]))).blob)
    expectColor(output.pixel(540, 300), [255, 0, 0]) // acima do centro, na faixa em pé
    expectColor(output.pixel(300, 540), [0, 0, 255]) // à esquerda do centro, fora da faixa
  })

  it('uma foto ilegível faz a colagem falhar com erro de leitura, sem resposta pendente', async () => {
    const red = await makeImage(100, 100, solid('#ff0000'))
    const plan = planCollage(
      { mode: 'grid', ratio: '1:1', photos: [collagePhoto(100, 100), collagePhoto(100, 100)], style: { spacing: 0, radius: 0, color: '#ffffff', shadow: false } },
      1080,
    )
    await expect(client.run(jobFor(plan, [red, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })]))).rejects.toMatchObject({ code: 'decode-failed' })
  })
})
