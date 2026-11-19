import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import {
  button,
  download,
  expectColor,
  expectImage,
  expectNoAxeViolations,
  fileInput,
  fixture,
  hasOffscreenCanvas,
  openImageTool,
  pixelAt,
} from './image-tool.ts'

const openTool = (page: Page) => openImageTool(page, '/imagens/redimensionar', 'Redimensionar imagem')

const KEPT_ORIGINAL = 'Já cabe no tamanho pedido: mantida a original, com os metadados.'
const RANGE_ERROR = 'Use um valor de 1 a 16384 px.'

const widthField = (page: Page) => page.getByRole('textbox', { name: 'Largura' })
const heightField = (page: Page) => page.getByRole('textbox', { name: 'Altura' })
const ratioLock = (page: Page) => page.getByRole('button', { name: 'Manter proporção' })
const usePixels = (page: Page) => page.getByRole('radio', { name: 'Pixels' }).click()

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('Redimensionar imagem', () => {
  test('sem os recursos necessários, a página explica que o navegador não é compatível', async ({ page }) => {
    await page.goto('/imagens/redimensionar')
    test.skip(await hasOffscreenCanvas(page), 'este motor tem os recursos necessários')
    await expect(page.getByText(/não tem os recursos necessários para processar imagens/)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('um arquivo a 50%: metade das medidas, cores e transparência no lugar, nome com o tamanho', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))

    await expect(page.getByText(/^PNG · 64 × 64/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Porcentagem' })).toBeChecked()
    await expect(page.getByRole('slider', { name: 'Novo tamanho' })).toHaveAttribute('aria-valuetext', '50%')
    await expect(page.getByText('32 × 32', { exact: true })).toBeVisible() // tamanho final, antes de processar
    await button(page, 'Redimensionar').click()

    await expect(page.getByRole('heading', { name: 'Imagem redimensionada' })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Imagem redimensionada. Pronta para baixar.')
    await expect(page.getByText('Novo tamanho: 32 × 32')).toBeVisible() // na lista, ao lado das medidas originais
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('quadrantes-32x32.png')
    expectImage(result.bytes, 'png', 32, 32)
    expectColor(await pixelAt(page, result.bytes, 8, 8), [255, 0, 0])
    expectColor(await pixelAt(page, result.bytes, 24, 8), [0, 255, 0])
    expectColor(await pixelAt(page, result.bytes, 8, 24), [0, 0, 255])
    expect((await pixelAt(page, result.bytes, 24, 24))[3]).toBe(0) // continua transparente
  })

  test('lote em pixels: cabe na largura sem deformar, a que já cabe volta intacta, ZIP conferido sem enviar nada', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('blob:') || url.startsWith('data:')) return
      if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
    })
    await openTool(page)
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png'), fixture('transparente.webp')])
    await expect(page.getByRole('status')).toHaveText('3 arquivos prontos para redimensionar.')

    await usePixels(page)
    await widthField(page).fill('48')
    await button(page, 'Redimensionar 3 imagens').click()

    await expect(page.getByRole('heading', { name: '3 imagens redimensionadas' })).toBeFocused()
    await expect(page.getByText('Novo tamanho: 48 × 36')).toBeVisible()
    await expect(page.getByText('Novo tamanho: 48 × 48')).toBeVisible()
    await expect(page.getByText(KEPT_ORIGINAL)).toBeVisible()
    const zip = await download(page, button(page, 'Baixar todas (.zip)'))
    expect(zip.name).toBe('imagens-redimensionadas.zip')
    const files = unzipSync(zip.bytes)
    expect(Object.keys(files).sort()).toEqual(['foto-48x36.jpg', 'quadrantes-48x48.png', 'transparente.webp'])
    expectImage(files['foto-48x36.jpg']!, 'jpeg', 48, 36)
    expectImage(files['quadrantes-48x48.png']!, 'png', 48, 48)
    // Já tinha 48 px de largura: volta byte a byte, com os metadados que tivesse.
    expect(Buffer.from(files['transparente.webp']!).equals(await readFile(fixture('transparente.webp')))).toBe(true)
    expect(requests).toEqual([])
  })

  test('sem manter a proporção: medidas exatas, mesmo deformando e ampliando', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await usePixels(page)
    await ratioLock(page).click()
    await expect(ratioLock(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('A imagem fica exatamente com essas medidas e pode deformar.')).toBeVisible()

    await widthField(page).fill('100')
    await heightField(page).fill('20')
    await expect(page.getByText('100 × 20', { exact: true })).toBeVisible()
    await button(page, 'Redimensionar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto-100x20.jpg')
    expectImage(result.bytes, 'jpeg', 100, 20)
  })

  test('campos inválidos: o erro aparece, o foco vai para o campo e nada é processado', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await usePixels(page)
    // Campos vazios só viram erro ao tentar: enquanto a pessoa ainda vai preencher, aparece a explicação.
    await expect(page.getByText('Preencha a largura, a altura ou as duas.')).toHaveCount(0)

    await button(page, 'Redimensionar').click()
    await expect(page.getByText('Preencha a largura, a altura ou as duas.')).toBeVisible()
    await expect(widthField(page)).toBeFocused()
    await expect(widthField(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible() // continua nas opções

    await widthField(page).fill('12px')
    await expect(widthField(page)).toHaveValue('12') // só algarismos
    await widthField(page).fill('0')
    await expect(page.getByText(RANGE_ERROR)).toBeVisible() // fora da faixa: avisa já ao digitar
    await widthField(page).fill('20000')
    await expect(page.getByText(RANGE_ERROR)).toBeVisible()
    await widthField(page).fill('32')
    await expect(page.getByText(RANGE_ERROR)).toHaveCount(0)
    await expect(widthField(page)).not.toHaveAttribute('aria-invalid')
    await expect(page.getByText('32 × 24', { exact: true })).toBeVisible()

    // Sem a proporção, as duas medidas são obrigatórias, e o resultado tem o limite de 50 megapixels.
    await ratioLock(page).click()
    await button(page, 'Redimensionar').click()
    await expect(page.getByText('Sem manter a proporção, preencha a largura e a altura.')).toBeVisible()
    await expect(heightField(page)).toBeFocused()
    await widthField(page).fill('16000')
    await heightField(page).fill('16000')
    await expect(page.getByText('O resultado teria 256 megapixels; o limite é 50.')).toBeVisible()
  })

  test('foto com orientação EXIF: redimensiona na posição em que aparece', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto-girada.jpg'))
    await expect(page.getByText(/^JPG · 32 × 64/)).toBeVisible()
    await expect(page.getByText('16 × 32', { exact: true })).toBeVisible()
    await button(page, 'Redimensionar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto-girada-16x32.jpg')
    expectImage(result.bytes, 'jpeg', 16, 32)
    expectColor(await pixelAt(page, result.bytes, 8, 6), [255, 0, 0]) // a metade esquerda foi para cima
    expectColor(await pixelAt(page, result.bytes, 8, 26), [0, 0, 255])
  })

  test('cancelar no meio devolve o arquivo, com o anúncio certo, e a tentativa seguinte funciona', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'precisa de um processamento longo e previsível: conferido no Chromium desktop')
    await openTool(page)
    // Foto de 48 MP gerada no navegador: reduzir para 90% leva tempo de sobra para cancelar.
    await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(8000, 6000)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      const gradient = context.createLinearGradient(0, 0, 8000, 6000)
      gradient.addColorStop(0, '#2a3a52')
      gradient.addColorStop(1, '#d7b072')
      context.fillStyle = gradient
      context.fillRect(0, 0, 8000, 6000)
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
      const transfer = new DataTransfer()
      transfer.items.add(new File([blob], 'grande.jpg', { type: 'image/jpeg' }))
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (!input) throw new Error('input ausente')
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText(/^JPG · 8000 × 6000/)).toBeVisible({ timeout: 15_000 })
    const slider = page.getByRole('slider', { name: 'Novo tamanho' })
    await slider.focus()
    await page.keyboard.press('End')
    await expect(slider).toHaveAttribute('aria-valuetext', '90%')

    await button(page, 'Redimensionar').click()
    await button(page, 'Cancelar').click()
    await expect(button(page, 'Redimensionar')).toBeEnabled()
    await expect(page.getByRole('status')).toHaveText('Mudança de tamanho cancelada.')

    await slider.focus()
    await page.keyboard.press('Home')
    await button(page, 'Redimensionar').click()
    await expect(page.getByRole('heading', { name: 'Imagem redimensionada' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Novo tamanho: 800 × 600')).toBeVisible()
  })

  test('redução forte sem listras falsas (moiré), inclusive no Firefox', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox'].includes(testInfo.project.name), 'filtro da redução: conferido nos dois motores que processam aqui')
    await openTool(page)
    // Listras verticais de 1 px, pretas e brancas: reduzidas quase 8 vezes, devem virar cinza uniforme.
    const stripes = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(800, 40)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.fillStyle = '#000000'
      context.fillRect(0, 0, 800, 40)
      context.fillStyle = '#ffffff'
      for (let x = 1; x < 800; x += 2) context.fillRect(x, 0, 1, 40)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    })
    await fileInput(page).setInputFiles({ name: 'listras.png', mimeType: 'image/png', buffer: Buffer.from(stripes) })
    await usePixels(page)
    await widthField(page).fill('103')
    await button(page, 'Redimensionar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('listras-103x5.png')
    const row = await page.evaluate(async (data) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]))
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.drawImage(bitmap, 0, 0)
      const pixels = context.getImageData(0, 2, bitmap.width, 1).data
      return Array.from({ length: bitmap.width }, (_, x) => pixels[x * 4] ?? -1)
    }, Array.from(result.bytes))
    expect(Math.min(...row)).toBeGreaterThanOrEqual(115)
    expect(Math.max(...row)).toBeLessThanOrEqual(140)
  })

  test('estados da ferramenta sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByText('32 × 24', { exact: true })).toBeVisible()
    await expectNoAxeViolations(page) // porcentagem, com o tamanho final

    await usePixels(page)
    await button(page, 'Redimensionar').click()
    await expect(page.getByText('Preencha a largura, a altura ou as duas.')).toBeVisible()
    await expectNoAxeViolations(page) // campos com erro
    expect(await horizontalOverflow(page)).toBe(0)

    await widthField(page).fill('32')
    await button(page, 'Redimensionar').click()
    await expect(page.getByRole('heading', { name: 'Imagem redimensionada' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('a 320 px, os campos de medida cabem sem rolagem lateral e os alvos de toque têm 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await usePixels(page)
    await expect(ratioLock(page)).toBeVisible()
    expect(await horizontalOverflow(page)).toBe(0)

    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, [role="radio"]')]
        .filter((element) => !element.closest('p') && element.getClientRects().length > 0)
        .map((element) => ({ text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', height: element.getBoundingClientRect().height }))
        .filter(({ height }) => height > 1 && height < 44),
    )
    expect(small).toEqual([])
  })

  test('fluxo completo só com o teclado', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox'].includes(testInfo.project.name), 'Tab segue a configuração do sistema no WebKit e não existe no celular')
    const tabTo = async (target: Locator) => {
      for (let presses = 0; presses < 40; presses += 1) {
        if (await target.evaluate((element) => element === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error('O elemento não foi alcançado com Tab')
    }

    await openTool(page)
    await tabTo(button(page, 'Selecionar imagens'))
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')])
    await chooser.setFiles(fixture('foto.jpg'))
    await expect(button(page, 'Redimensionar')).toBeEnabled()

    await tabTo(page.getByRole('radio', { name: 'Porcentagem' }))
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Pixels' })).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(widthField(page)).toBeFocused()
    await page.keyboard.type('32')
    await page.keyboard.press('Tab')
    await expect(ratioLock(page)).toBeFocused()

    await tabTo(button(page, 'Redimensionar'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Imagem redimensionada' })).toBeFocused()
    await tabTo(button(page, 'Baixar imagem'))
    const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
    expect(file.suggestedFilename()).toBe('foto-32x24.jpg')
  })
})
