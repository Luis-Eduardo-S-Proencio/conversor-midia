import { unzipSync } from 'fflate'
import { afterAll, describe, expect, it } from 'vitest'
import { detectImageType } from '../core/image/signature'
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
