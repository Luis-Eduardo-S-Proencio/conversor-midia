import { readFile, writeFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { readIco, readPdf, readTiff } from '../../src/test/format-readers'
import { pngBytes } from '../../src/test/image-bytes'
import {
  button,
  download,
  expectColor,
  expectImage,
  expectNoAxeViolations,
  expectUniformGray,
  fileInput,
  fixture,
  hasOffscreenCanvas,
  openImageTool,
  pixelAt,
  redRowAt,
  stripesPng,
} from './image-tool.ts'

const openTool = (page: Page) => openImageTool(page, '/imagens/converter', 'Converter imagem')

test.describe('Converter imagem', () => {
  test('sem os recursos necessários, a página explica que o navegador não é compatível', async ({ page }) => {
    await page.goto('/imagens/converter')
    test.skip(await hasOffscreenCanvas(page), 'este motor tem os recursos necessários')
    await expect(page.getByText(/não tem os recursos necessários para processar imagens/)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('um arquivo: PNG transparente vira JPG com o fundo escolhido, conferido pixel a pixel', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))

    await expect(page.getByText(/^PNG · 64 × 64/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'JPG' })).toBeChecked() // sugestão para PNG
    await page.getByRole('radio', { name: 'Preto' }).click()
    await button(page, 'Converter').click()

    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeFocused()
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('quadrantes.jpg')
    expectImage(result.bytes, 'jpeg', 64, 64)
    expectColor(await pixelAt(page, result.bytes, 16, 16), [255, 0, 0])
    expectColor(await pixelAt(page, result.bytes, 48, 48), [0, 0, 0]) // era transparente
  })

  test('lote misto: inválidos recusados com motivo; válidos convertidos e entregues num ZIP conferido', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles([
      fixture('foto.jpg'),
      fixture('quadrantes.png'),
      fixture('transparente.webp'),
      fixture('texto.png'),
      fixture('vazio.png'),
      fixture('animacao.gif'),
    ])

    await expect(page.getByText('O arquivo está vazio.')).toBeVisible()
    await expect(page.getByText('Formato não suportado. Use JPG, PNG ou WEBP.')).toBeVisible()
    await expect(page.getByText('GIF não é aceito. Use JPG, PNG ou WEBP.')).toBeVisible()
    // Quem usa leitor de tela também fica sabendo das recusas.
    await expect(page.getByRole('status')).toHaveText(
      '3 arquivos prontos para converter. 3 arquivos recusados; os motivos estão na lista.',
    )

    await page.getByRole('radio', { name: 'PNG' }).click()
    await button(page, 'Converter 3 imagens').click()
    await expect(page.getByRole('heading', { name: '3 imagens convertidas' })).toBeFocused()

    const zip = await download(page, button(page, 'Baixar todas (.zip)'))
    expect(zip.name).toBe('imagens-convertidas.zip')
    const files = unzipSync(zip.bytes)
    expect(Object.keys(files).sort()).toEqual(['foto.png', 'quadrantes.png', 'transparente.png'])
    expectImage(files['foto.png']!, 'png', 64, 48)
    expectImage(files['quadrantes.png']!, 'png', 64, 64)
    expectImage(files['transparente.png']!, 'png', 48, 48)
  })

  test('estados da ferramenta sem violações automáticas de acessibilidade', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)

    await fileInput(page).setInputFiles(fixture('quadrantes.png'))
    await expect(page.getByRole('img', { name: 'Pré-visualização de quadrantes.png' })).toBeVisible()
    await expectNoAxeViolations(page) // arquivo único: prévia e opção de fundo

    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('vazio.png')])
    await expect(page.getByText('O arquivo está vazio.')).toBeVisible()
    await expect(button(page, 'Converter 2 imagens')).toBeEnabled()
    await expectNoAxeViolations(page) // lista com arquivo recusado

    await button(page, 'Converter 2 imagens').click()
    await expect(page.getByRole('heading', { name: '2 imagens convertidas' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
  })

  test('foto com orientação EXIF sai na posição em que aparece', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto-girada.jpg'))
    await expect(page.getByText(/^JPG · 32 × 64/)).toBeVisible()

    await page.getByRole('radio', { name: 'PNG' }).click()
    await button(page, 'Converter').click()
    const result = await download(page, button(page, 'Baixar imagem'))

    expectImage(result.bytes, 'png', 32, 64)
    expectColor(await pixelAt(page, result.bytes, 16, 12), [255, 0, 0]) // a metade esquerda foi para cima
    expectColor(await pixelAt(page, result.bytes, 16, 52), [0, 0, 255])
  })

  test('WEBP: gera WEBP de verdade ou fica indisponível com explicação', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(button(page, 'Converter')).toBeEnabled()

    const webp = page.getByRole('radio', { name: 'WEBP' })
    if (await webp.isDisabled()) {
      await expect(page.getByText('Este navegador não consegue gerar WEBP. Escolha JPG ou PNG.')).toBeVisible()
      await expect(page.getByRole('radio', { name: 'PNG' })).toBeChecked()
      return
    }
    await expect(webp).toBeChecked() // sugestão quando tudo já é JPG
    await button(page, 'Converter').click()
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto.webp')
    expectImage(result.bytes, 'webp', 64, 48)
  })

  test('arquivo acima de 50 MB e bomba de pixels são recusados antes de processar', async ({ page }, testInfo) => {
    // A regra de limite é lógica pura, coberta por testes unitários; aqui basta um motor.
    // (Enviar 50 MB a vários navegadores em paralelo sobrecarrega a máquina sem testar nada novo.)
    test.skip(testInfo.project.name !== 'desktop', 'fluxo de limites conferido uma vez, no Chromium')
    // Arquivos em disco: o Playwright não envia conteúdo acima de 50 MB direto da memória.
    const bigPath = testInfo.outputPath('enorme.png')
    const bombPath = testInfo.outputPath('bomba.png')
    await writeFile(bigPath, Buffer.alloc(50 * 1024 * 1024 + 1))
    await writeFile(bombPath, pngBytes({ width: 20_000, height: 20_000 }))
    await openTool(page)
    await fileInput(page).setInputFiles([bigPath, bombPath])

    await expect(page.getByText('O arquivo tem mais de 50 MB, o limite por arquivo.')).toBeVisible()
    await expect(page.getByText('A imagem tem 400 megapixels; o limite é 50.')).toBeVisible()
    await expect(button(page, 'Converter')).toBeDisabled()
  })

  test('acima de 20 arquivos, os excedentes ficam de fora com aviso', async ({ page }) => {
    const photo = await readFile(fixture('foto.jpg'))
    await openTool(page)
    await fileInput(page).setInputFiles(
      Array.from({ length: 21 }, (_, index) => ({ name: `foto-${index + 1}.jpg`, mimeType: 'image/jpeg', buffer: photo })),
    )
    await expect(page.getByText('1 arquivo ficou de fora: o limite é de 20 arquivos por vez.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '20 arquivos' })).toBeVisible()
  })

  test('alterar opções refaz a conversão; "Converter outras" recomeça', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await button(page, 'Converter').click()
    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeVisible()

    await button(page, 'Alterar opções').click()
    await expect(button(page, 'Converter')).toBeEnabled()
    await page.getByRole('radio', { name: 'JPG' }).click()
    await button(page, 'Converter').click()
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto.jpg')
    expectImage(result.bytes, 'jpeg', 64, 48)

    await button(page, 'Converter outras').click()
    // O botão clicado some: o foco vai para o próximo passo, não para o topo da página.
    await expect(button(page, 'Selecionar imagens')).toBeFocused()
  })

  test('cancelar no meio devolve o arquivo para conversão, e a seguinte funciona', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'precisa de uma conversão longa e previsível: conferido no Chromium desktop')
    await openTool(page)
    // Foto de 48 MP gerada no navegador: converter para PNG leva segundos, tempo de sobra para cancelar.
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
    await page.getByRole('radio', { name: 'PNG' }).click()

    await button(page, 'Converter').click()
    await button(page, 'Cancelar').click()
    await expect(button(page, 'Converter')).toBeEnabled()
    await expect(page.getByRole('status')).toHaveText('Conversão cancelada.')

    await page.getByRole('radio', { name: 'JPG' }).click()
    await button(page, 'Converter').click()
    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeVisible({ timeout: 20_000 })
  })

  test('a prévia de uma imagem grande sai sem listras falsas (moiré), inclusive no Firefox', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox'].includes(testInfo.project.name), 'filtro da redução: conferido nos dois motores que processam aqui')
    await openTool(page)
    // Listras de 1 px com 4000 px de largura: a prévia, de 1024 px, reduz quase 4 vezes.
    await fileInput(page).setInputFiles({ name: 'listras.png', mimeType: 'image/png', buffer: await stripesPng(page, 4000, 200) })
    const preview = page.getByRole('img', { name: 'Pré-visualização de listras.png' })
    await expect(preview).toBeVisible()

    // A imagem na tela é a prévia gerada pelo Worker: lida no tamanho em que foi gerada.
    const row = await preview.evaluate(async (element) => {
      const image = element as HTMLImageElement
      await image.decode()
      const canvas = new OffscreenCanvas(image.naturalWidth, image.naturalHeight)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, Math.floor(image.naturalHeight / 2), image.naturalWidth, 1).data
      return Array.from({ length: image.naturalWidth }, (_, x) => pixels[x * 4] ?? -1)
    })
    expect(row).toHaveLength(1024)
    expectUniformGray(row)
  })

  test('remover o último arquivo devolve o foco à seleção', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await button(page, 'Remover foto.jpg').click()
    await expect(button(page, 'Selecionar imagens')).toBeFocused()
  })

  test('nenhuma requisição leva arquivos: tudo acontece no navegador', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('blob:') || url.startsWith('data:')) return
      if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
    })
    await openTool(page)
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await button(page, 'Converter 2 imagens').click()
    await download(page, button(page, 'Baixar todas (.zip)'))
    expect(requests).toEqual([])
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

    const convertButton = button(page, 'Converter')
    await expect(convertButton).toBeEnabled()
    await tabTo(convertButton)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeFocused()

    await tabTo(button(page, 'Baixar imagem'))
    await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
  })

  test('celular: ação principal fixa ao alcance do polegar e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'só no celular')
    await openTool(page)
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])

    const convertButton = button(page, 'Converter 2 imagens')
    await expect(convertButton).toBeEnabled()
    await expect(convertButton).toBeInViewport()

    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, [role="radio"]')]
        .filter((element) => !element.closest('p') && element.getClientRects().length > 0)
        .map((element) => ({ text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', height: element.getBoundingClientRect().height }))
        .filter(({ height }) => height > 1 && height < 44),
    )
    expect(small).toEqual([])
  })
})

test.describe('Converter imagem para formatos escritos pelo app', () => {
  // Os codificadores próprios rodam no Worker: conferidos nos dois motores que os executam aqui.
  const skipOtherProjects = (project: string) =>
    test.skip(!['desktop', 'firefox'].includes(project), 'codificadores próprios: conferidos no Chromium e no Firefox')

  async function convertQuadrantsTo(page: Page, label: string) {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))
    await page.getByRole('radio', { name: label, exact: true }).click()
    await button(page, 'Converter').click()
    await expect(page.getByRole('heading', { name: 'Imagem convertida' })).toBeFocused()
    return download(page, button(page, 'Baixar imagem'))
  }

  test('BMP: o navegador lê; a transparência vira o fundo branco', async ({ page }, testInfo) => {
    skipOtherProjects(testInfo.project.name)
    const result = await convertQuadrantsTo(page, 'BMP')
    expect(result.name).toBe('quadrantes.bmp')
    expect(String.fromCharCode(result.bytes[0] ?? 0, result.bytes[1] ?? 0)).toBe('BM')
    expectColor(await pixelAt(page, result.bytes, 16, 16), [255, 0, 0])
    expectColor(await pixelAt(page, result.bytes, 48, 48), [255, 255, 255])
  })

  test('TIFF: RGBA sem perdas, pixel a pixel', async ({ page }, testInfo) => {
    skipOtherProjects(testInfo.project.name)
    const result = await convertQuadrantsTo(page, 'TIFF')
    expect(result.name).toBe('quadrantes.tiff')
    const tiff = readTiff(result.bytes)
    expect([tiff.width, tiff.height, tiff.samplesPerPixel]).toEqual([64, 64, 4])
    const pixel = (x: number, y: number) => Array.from(tiff.pixels.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4))
    expect(pixel(16, 16)).toEqual([255, 0, 0, 255])
    expect(pixel(48, 48)[3]).toBe(0)
  })

  test('ICO: tamanhos de 16, 32 e 48 px, legíveis pelo navegador', async ({ page }, testInfo) => {
    skipOtherProjects(testInfo.project.name)
    const result = await convertQuadrantsTo(page, 'ICO')
    expect(result.name).toBe('quadrantes.ico')
    const entries = readIco(result.bytes)
    expect(entries.map((entry) => entry.width)).toEqual([16, 32, 48])
    const largest = entries[2]?.data ?? new Uint8Array()
    expectColor(await pixelAt(page, largest, 12, 12), [255, 0, 0])
    expect((await pixelAt(page, largest, 36, 36))[3]).toBe(0)
  })

  test('ICO de imagem grande: os tamanhos pequenos saem sem listras falsas (moiré)', async ({ page }, testInfo) => {
    skipOtherProjects(testInfo.project.name)
    await openTool(page)
    // 250 px: nenhum tamanho do ícone é divisor exato, o caso em que a redução de um passo só mais erra.
    await fileInput(page).setInputFiles({ name: 'listras.png', mimeType: 'image/png', buffer: await stripesPng(page, 250, 250) })
    await page.getByRole('radio', { name: 'ICO', exact: true }).click()
    await button(page, 'Converter').click()
    const result = await download(page, button(page, 'Baixar imagem'))

    const entries = readIco(result.bytes)
    expect(entries.map((entry) => entry.width)).toEqual([16, 32, 48])
    for (const entry of entries) expectUniformGray(await redRowAt(page, entry.data, Math.floor(entry.width / 2)))
  })

  test('PDF: uma página do tamanho da imagem, com a imagem legível dentro', async ({ page }, testInfo) => {
    skipOtherProjects(testInfo.project.name)
    const result = await convertQuadrantsTo(page, 'PDF')
    expect(result.name).toBe('quadrantes.pdf')
    const pdf = readPdf(result.bytes)
    expect(pdf.image).toMatchObject({ width: 64, height: 64, filter: 'DCTDecode' })
    expect(pdf.mediaBox).toEqual([0, 0, 48, 48])
    expectColor(await pixelAt(page, pdf.image.bytes, 16, 16), [255, 0, 0])
    expectColor(await pixelAt(page, pdf.image.bytes, 48, 48), [255, 255, 255])
  })

  test('a 320 px, os sete formatos cabem sem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow conferido no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByRole('radio', { name: 'PDF' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })
})
