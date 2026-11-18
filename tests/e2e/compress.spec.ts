import { expect, test, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { button, download, expectImage, expectNoAxeViolations, fileInput, hasOffscreenCanvas, openImageTool, pixelAt } from './image-tool.ts'

const openTool = (page: Page) => openImageTool(page, '/imagens/comprimir', 'Comprimir imagem')

const KEPT_ORIGINAL = 'Já estava otimizada: mantida a original, com os metadados.'

const WIDTH = 320
const HEIGHT = 240

interface Recipe {
  name: string
  type: 'image/jpeg' | 'image/png'
  quality?: number
  /** Metade direita transparente. */
  transparentHalf?: boolean
}

const PHOTO: Recipe = { name: 'foto.jpg', type: 'image/jpeg', quality: 0.95 }
const SCREENSHOT: Recipe = { name: 'tela.png', type: 'image/png', transparentHalf: true }
/** Já comprimida ao extremo: recomprimir com mais qualidade só aumentaria o arquivo. */
const LOW_QUALITY: Recipe = { name: 'baixa.jpg', type: 'image/jpeg', quality: 0.3 }

/**
 * Gera no navegador imagens com textura de foto (degradê com ruído determinístico): cores
 * chapadas já ocupam quase nada e não exercitam a compressão.
 */
async function generateImages(page: Page, recipes: Recipe[]) {
  const encoded = await page.evaluate(
    async ({ recipes, width, height }) => {
      // xorshift32: o mesmo ruído em todo motor e a cada execução.
      let state = 2_463_534_242
      const noise = () => {
        state ^= state << 13
        state >>>= 0
        state ^= state >>> 17
        state ^= state << 5
        state >>>= 0
        return (state / 4_294_967_296 - 0.5) * 48
      }
      const results: number[][] = []
      for (const recipe of recipes) {
        const canvas = new OffscreenCanvas(width, height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas indisponível')
        const pixels = context.createImageData(width, height)
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * 4
            pixels.data[offset] = 40 + (x / width) * 180 + noise()
            pixels.data[offset + 1] = 60 + (y / height) * 140 + noise()
            pixels.data[offset + 2] = 120 + noise()
            pixels.data[offset + 3] = recipe.transparentHalf && x >= width / 2 ? 0 : 255
          }
        }
        context.putImageData(pixels, 0, 0)
        const blob = await canvas.convertToBlob({ type: recipe.type, quality: recipe.quality })
        results.push(Array.from(new Uint8Array(await blob.arrayBuffer())))
      }
      return results
    },
    { recipes, width: WIDTH, height: HEIGHT },
  )
  return recipes.map((recipe, index) => ({ name: recipe.name, mimeType: recipe.type, buffer: Buffer.from(encoded[index] ?? []) }))
}

const canEncodeWebp = (page: Page) =>
  page.evaluate(async () => {
    const canvas = new OffscreenCanvas(1, 1)
    canvas.getContext('2d')
    return (await canvas.convertToBlob({ type: 'image/webp' })).type === 'image/webp'
  })

test.describe('Comprimir imagem', () => {
  test('sem os recursos necessários, a página explica que o navegador não é compatível', async ({ page }) => {
    await page.goto('/imagens/comprimir')
    test.skip(await hasOffscreenCanvas(page), 'este motor tem os recursos necessários')
    await expect(page.getByText(/não tem os recursos necessários para processar imagens/)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('lote: JPG fica menor, PNG vira WEBP com transparência e a já otimizada volta intacta, sem enviar nada', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('blob:') || url.startsWith('data:')) return
      if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
    })
    await openTool(page)
    test.skip(!(await canEncodeWebp(page)), 'motor sem codificador WEBP: o destino do PNG é conferido nos testes unitários')
    const originals = await generateImages(page, [PHOTO, SCREENSHOT, LOW_QUALITY])
    await fileInput(page).setInputFiles(originals)

    await expect(page.getByRole('status')).toHaveText('3 arquivos prontos para comprimir.')
    await expect(page.getByRole('radio', { name: 'Média' })).toBeChecked()
    await expect(page.getByText(/PNG sai em WEBP/)).toBeVisible()
    await page.getByRole('radio', { name: 'Leve' }).click()
    await button(page, 'Comprimir 3 imagens').click()

    await expect(page.getByRole('heading', { name: '3 imagens comprimidas' })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('3 imagens comprimidas. Prontas para baixar.')
    await expect(page.getByText(KEPT_ORIGINAL)).toBeVisible()

    const zip = await download(page, button(page, 'Baixar todas (.zip)'))
    expect(zip.name).toBe('imagens-comprimidas.zip')
    const files = unzipSync(zip.bytes)
    expect(Object.keys(files).sort()).toEqual(['baixa.jpg', 'foto.jpg', 'tela.webp'])
    const [photo, screenshot, lowQuality] = originals

    expectImage(files['foto.jpg']!, 'jpeg', WIDTH, HEIGHT)
    expect(files['foto.jpg']!.length).toBeLessThan(photo!.buffer.length)

    const webp = files['tela.webp']!
    expectImage(webp, 'webp', WIDTH, HEIGHT)
    expect(webp.length).toBeLessThan(screenshot!.buffer.length)
    expect((await pixelAt(page, webp, WIDTH / 4, HEIGHT / 2))[3]).toBeGreaterThanOrEqual(247)
    expect((await pixelAt(page, webp, (WIDTH * 3) / 4, HEIGHT / 2))[3]).toBeLessThanOrEqual(8) // continua transparente

    // Sem ganho, a original volta byte a byte (com os metadados que tivesse).
    expect(Buffer.from(files['baixa.jpg']!).equals(lowQuality!.buffer)).toBe(true)
    expect(requests).toEqual([])
  })

  test('o nível muda o resultado: Forte gera arquivo menor que Leve', async ({ page }) => {
    await openTool(page)
    const [photo] = await generateImages(page, [PHOTO])
    await fileInput(page).setInputFiles(photo!)

    await page.getByRole('radio', { name: 'Leve' }).click()
    await button(page, 'Comprimir').click()
    await expect(page.getByRole('heading', { name: 'Imagem comprimida' })).toBeFocused()
    const light = await download(page, button(page, 'Baixar imagem'))

    await button(page, 'Alterar opções').click()
    await page.getByRole('radio', { name: 'Forte' }).click()
    await button(page, 'Comprimir').click()
    const strong = await download(page, button(page, 'Baixar imagem'))

    expect(light.name).toBe('foto.jpg')
    expect(strong.name).toBe('foto.jpg')
    expectImage(strong.bytes, 'jpeg', WIDTH, HEIGHT)
    expect(light.bytes.length).toBeLessThan(photo!.buffer.length)
    expect(strong.bytes.length).toBeLessThan(light.bytes.length)
  })

  test('estados da ferramenta sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    const expectNoHorizontalScroll = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
    await openTool(page)
    await fileInput(page).setInputFiles(await generateImages(page, [PHOTO, LOW_QUALITY]))

    await expect(button(page, 'Comprimir 2 imagens')).toBeEnabled()
    await expectNoAxeViolations(page) // lista e opções
    await expectNoHorizontalScroll()

    await button(page, 'Comprimir 2 imagens').click()
    await expect(page.getByRole('heading', { name: '2 imagens comprimidas' })).toBeFocused()
    await expect(page.getByText(KEPT_ORIGINAL)).toBeVisible()
    await expectNoAxeViolations(page) // resultado com a nota de original mantida
    await expectNoHorizontalScroll()
  })
})
