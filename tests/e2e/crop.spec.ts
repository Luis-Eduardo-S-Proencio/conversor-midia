import { expect, test, type Locator, type Page } from '@playwright/test'
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

const openTool = (page: Page) => openImageTool(page, '/imagens/recortar', 'Recortar imagem')

const NOTHING_CROPPED = 'Ajuste a área de recorte antes: arraste os cantos sobre a imagem ou digite as medidas.'

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const cropArea = (page: Page) => page.getByRole('group', { name: /Área de recorte/ })

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/** PNG de 400 × 300 com quadrantes vermelho, verde, azul e amarelo, gerado no navegador (bom para arrastar). */
async function colorQuadrants(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const bytes = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(400, 300)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponível')
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
    colors.forEach((color, index) => {
      context.fillStyle = color
      context.fillRect((index % 2) * 200, Math.floor(index / 2) * 150, 200, 150)
    })
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return { name: 'cores.png', mimeType: 'image/png', buffer: Buffer.from(bytes) }
}

async function tabTo(page: Page, target: Locator) {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('O elemento não foi alcançado com Tab')
}

test.describe('Recortar imagem', () => {
  test('sem os recursos necessários, a página explica que o navegador não é compatível', async ({ page }) => {
    await page.goto('/imagens/recortar')
    test.skip(await hasOffscreenCanvas(page), 'este motor tem os recursos necessários')
    await expect(page.getByText(/não tem os recursos necessários para processar imagens/)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('proporção 1:1: quadrado centralizado, tamanho final antes de processar, mesmo nome, sem enviar nada', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('blob:') || url.startsWith('data:')) return
      if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
    })
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg')) // 64 × 48
    await expect(cropArea(page)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()

    await page.getByRole('radio', { name: '1:1' }).click()
    await expect(field(page, 'Margem esquerda')).toHaveValue('8')
    await expect(field(page, 'Largura')).toHaveValue('48')
    await expect(field(page, 'Altura')).toHaveValue('48')
    await expect(page.getByText('48 × 48', { exact: true })).toBeVisible()
    await button(page, 'Recortar').click()

    await expect(page.getByRole('heading', { name: 'Imagem recortada' })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Imagem recortada. Pronta para baixar.')
    await expect(page.getByText('Recortada para 48 × 48')).toBeVisible()
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto.jpg')
    expectImage(result.bytes, 'jpeg', 48, 48)
    expect(requests).toEqual([])
  })

  test('medidas digitadas: recorta exatamente o quadrante pedido, com a cor certa', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png')) // 64 × 64
    await field(page, 'Largura').fill('32')
    await field(page, 'Altura').fill('32')
    await field(page, 'Margem esquerda').fill('32')
    await expect(page.getByText('32 × 32', { exact: true })).toBeVisible()
    await button(page, 'Recortar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('quadrantes.png')
    expectImage(result.bytes, 'png', 32, 32)
    expectColor(await pixelAt(page, result.bytes, 16, 16), [0, 255, 0]) // o quadrante verde, de cima à direita
  })

  test('arrastar o canto com o mouse ajusta a área, e o arquivo sai com a área arrastada', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox'].includes(testInfo.project.name), 'arrasto com mouse: conferido no Chromium e no Firefox')
    await openTool(page)
    await fileInput(page).setInputFiles(await colorQuadrants(page))
    await expect(field(page, 'Largura')).toHaveValue('400')

    const corner = await page.getByRole('button', { name: /Canto inferior direito/ }).boundingBox()
    if (!corner) throw new Error('canto ausente')
    const [x, y] = [corner.x + corner.width / 2, corner.y + corner.height / 2]
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 200, y - 150, { steps: 8 })
    await page.mouse.up()

    await expect(field(page, 'Largura')).toHaveValue('200')
    await expect(field(page, 'Altura')).toHaveValue('150')
    await button(page, 'Recortar').click()
    const result = await download(page, button(page, 'Baixar imagem'))
    expectImage(result.bytes, 'png', 200, 150)
    expectColor(await pixelAt(page, result.bytes, 100, 75), [255, 0, 0])
    expectColor(await pixelAt(page, result.bytes, 199, 149), [255, 0, 0]) // nada do verde nem do azul ao lado
  })

  test('teclado: Tab chega à área, as setas a movem e o recorte sai sem mouse', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'firefox'].includes(testInfo.project.name), 'Tab segue a configuração do sistema no WebKit e não existe no celular')
    await openTool(page)
    await tabTo(page, button(page, 'Selecionar imagem'))
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')])
    await chooser.setFiles(fixture('foto.jpg'))
    await expect(cropArea(page)).toBeVisible()

    await page.getByRole('radio', { name: '1:1' }).click()
    await expect(field(page, 'Margem esquerda')).toHaveValue('8')
    // A área vem logo depois de "Trocar imagem" na ordem do Tab.
    await button(page, 'Trocar imagem').focus()
    await tabTo(page, cropArea(page))
    for (let press = 0; press < 3; press += 1) await page.keyboard.press('ArrowLeft')
    await expect(field(page, 'Margem esquerda')).toHaveValue('5')
    await page.keyboard.press('Shift+ArrowRight') // 10 px de uma vez, até a borda
    await expect(field(page, 'Margem esquerda')).toHaveValue('15')

    await tabTo(page, button(page, 'Recortar'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Imagem recortada' })).toBeFocused()
    await tabTo(page, button(page, 'Baixar imagem'))
    const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
    expect(file.suggestedFilename()).toBe('foto.jpg')
  })

  test('medida errada: o erro aparece na hora; Recortar leva o foco ao campo e não processa', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))
    await field(page, 'Margem esquerda').fill('40') // com 64 px de largura, passa da borda
    await expect(page.getByRole('alert')).toHaveText(
      'A área passa da borda direita da imagem, que tem 64 px de largura. Diminua a margem esquerda ou a largura.',
    )
    await expect(field(page, 'Largura')).toHaveAttribute('aria-invalid', 'true')

    await button(page, 'Recortar').click()
    await expect(field(page, 'Largura')).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible() // nada foi processado

    await field(page, 'Largura').fill('24')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('24 × 64', { exact: true })).toBeVisible()
    await button(page, 'Recortar').click()
    await expect(page.getByRole('heading', { name: 'Imagem recortada' })).toBeFocused()
  })

  test('sem recortar nada, avisa e leva o foco à largura; "Usar a imagem inteira" desfaz o recorte', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await button(page, 'Recortar').click()
    await expect(page.getByText(NOTHING_CROPPED)).toBeVisible()
    await expect(field(page, 'Largura')).toBeFocused()

    await page.getByRole('radio', { name: '4:3' }).click() // a foto já é 4:3: a área continua inteira
    await expect(field(page, 'Largura')).toHaveValue('64')
    await page.getByRole('radio', { name: '16:9' }).click()
    await expect(page.getByText(NOTHING_CROPPED)).toHaveCount(0)
    await expect(field(page, 'Altura')).toHaveValue('36')

    await button(page, 'Usar a imagem inteira').click()
    await expect(field(page, 'Altura')).toHaveValue('48')
    await expect(page.getByRole('radio', { name: 'Livre' })).toBeChecked()
  })

  test('uma imagem por vez: só a primeira abre, com aviso; "Trocar imagem" substitui', async ({ page }) => {
    await openTool(page)
    // Duas imagens soltas na página de uma vez.
    await page.evaluate(async () => {
      const image = async (name: string, color: string) => {
        const canvas = new OffscreenCanvas(40, 30)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas indisponível')
        context.fillStyle = color
        context.fillRect(0, 0, 40, 30)
        return new File([await canvas.convertToBlob({ type: 'image/png' })], name, { type: 'image/png' })
      }
      const transfer = new DataTransfer()
      transfer.items.add(await image('primeira.png', '#ff0000'))
      transfer.items.add(await image('segunda.png', '#0000ff'))
      document.body.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
    })
    await expect(page.getByRole('heading', { name: '1 arquivo' })).toBeVisible()
    await expect(page.getByText('primeira.png', { exact: true })).toBeVisible()
    await expect(page.getByText('segunda.png', { exact: true })).toHaveCount(0)
    // Texto exato: o anúncio para leitor de tela repete o aviso dentro de uma frase maior.
    await expect(page.getByText('1 arquivo ficou de fora: esta ferramenta trabalha com uma imagem por vez.', { exact: true })).toBeVisible()

    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), button(page, 'Trocar imagem').click()])
    await chooser.setFiles(fixture('quadrantes.png'))
    await expect(page.getByText('quadrantes.png', { exact: true })).toBeVisible()
    await expect(page.getByText('primeira.png', { exact: true })).toHaveCount(0)
    await expect(field(page, 'Largura')).toHaveValue('64') // a área recomeça na imagem nova
  })

  test('foto com orientação EXIF: a área vale para a foto como ela aparece', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto-girada.jpg')) // aparece em pé: 32 × 64, vermelho em cima
    await expect(field(page, 'Altura')).toHaveValue('64')
    await field(page, 'Altura').fill('28')
    await button(page, 'Recortar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expectImage(result.bytes, 'jpeg', 32, 28)
    expectColor(await pixelAt(page, result.bytes, 16, 14), [255, 0, 0])
  })

  test('estados da ferramenta sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção de uma imagem
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(cropArea(page)).toBeVisible()
    await expectNoAxeViolations(page) // área de recorte e opções
    expect(await horizontalOverflow(page)).toBe(0)

    await button(page, 'Recortar').click()
    await expect(page.getByText(NOTHING_CROPPED)).toBeVisible()
    await field(page, 'Margem esquerda').fill('60')
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoAxeViolations(page) // avisos e campos com erro

    await field(page, 'Margem esquerda').fill('0')
    await page.getByRole('radio', { name: '1:1' }).click()
    await button(page, 'Recortar').click()
    await expect(page.getByRole('heading', { name: 'Imagem recortada' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral, alvos de 44 px e cantos com área de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await fileInput(page).setInputFiles(await colorQuadrants(page))
    await expect(cropArea(page)).toBeVisible()
    expect(await horizontalOverflow(page)).toBe(0)

    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, [role="radio"]')]
        .filter((element) => !element.closest('p') && element.getClientRects().length > 0)
        .map((element) => ({ text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', height: element.getBoundingClientRect().height }))
        .filter(({ height }) => height > 1 && height < 44),
    )
    expect(small).toEqual([])

    // Os cantos são pequenos na tela, mas o toque vale num quadrado de 44 px em volta de cada um.
    // A área vai para o meio da tela: embaixo, a barra de ação fixa cobre o conteúdo até a pessoa rolar.
    await cropArea(page).evaluate((element) => element.closest('.crop-area')?.scrollIntoView({ block: 'center' }))
    const missed = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.ReactCrop__drag-handle')]
        .filter((handle) => handle.getClientRects().length > 0)
        .flatMap((handle) => {
          const box = handle.getBoundingClientRect()
          const [cx, cy] = [box.left + box.width / 2, box.top + box.height / 2]
          const points: Array<[number, number]> = [
            [cx - 20, cy - 20],
            [cx + 20, cy + 20],
            [cx - 20, cy + 20],
            [cx + 20, cy - 20],
          ]
          return points
            .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight)
            .filter(([x, y]) => document.elementFromPoint(x, y) !== handle)
            .map(() => handle.getAttribute('aria-label'))
        }),
    )
    expect(missed).toEqual([])
  })
})
