import { unzipSync } from 'fflate'
import { afterAll, describe, expect, it } from 'vitest'
import { detectImageType } from '../core/image/signature'
import { readIco, readPdf, readTiff } from '../test/format-readers'
import { withExifOrientation } from '../test/image-bytes'
import { createImageWorkerClient } from './image-client'

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

describe('Formatos escritos pelo app (Chromium real)', () => {
  const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())
  const convertQuadrants = async (target: 'gif' | 'bmp' | 'tiff' | 'ico' | 'pdf', background = '#ffffff') =>
    client.run({ kind: 'convert', file: await makeImage(64, 64, quadrants), target, quality: 0.92, background })

  it('PNG → GIF: o navegador lê, com as cores exatas e a transparência', async () => {
    const result = await convertQuadrants('gif')
    expect(result.blob.type).toBe('image/gif')
    const output = await inspect(result.blob)
    expect([output.width, output.height]).toEqual([64, 64])
    expect(output.pixel(16, 16)).toEqual([255, 0, 0, 255])
    expect(output.pixel(48, 16)).toEqual([0, 255, 0, 255])
    expect(output.pixel(16, 48)).toEqual([0, 0, 255, 255])
    expect(output.pixel(48, 48)[3]).toBe(0)
  })

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
