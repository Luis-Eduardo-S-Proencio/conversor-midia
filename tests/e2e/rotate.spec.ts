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

const openTool = (page: Page) => openImageTool(page, '/imagens/girar', 'Girar e espelhar')

const NOTHING_CHOSEN = 'Gire ou espelhe a imagem antes.'

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('Girar e espelhar', () => {
  test('sem os recursos necessários, a página explica que o navegador não é compatível', async ({ page }) => {
    await page.goto('/imagens/girar')
    test.skip(await hasOffscreenCanvas(page), 'este motor tem os recursos necessários')
    await expect(page.getByText(/não tem os recursos necessários para processar imagens/)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('um arquivo girado à direita: a prévia gira na hora e o arquivo sai com cada quadrante no lugar', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg')) // 64 × 48, deitada
    const preview = page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })
    await expect(preview).toBeVisible()

    await button(page, 'Girar à direita').click()
    await expect(page.getByText('Girada 90° para a direita.')).toBeVisible()
    // A prévia fica em pé: mais alta que larga.
    await expect.poll(async () => {
      const box = await preview.boundingBox()
      return box ? box.height > box.width : false
    }).toBe(true)
    await button(page, 'Ajustar').click()

    await expect(page.getByRole('heading', { name: 'Imagem ajustada' })).toBeFocused()
    await expect(page.getByText('Girada 90° para a direita', { exact: true })).toBeVisible() // nota na lista
    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('foto.jpg')
    expectImage(result.bytes, 'jpeg', 48, 64)
  })

  test('PNG: girar à direita põe cada quadrante no lugar certo e mantém a transparência', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('quadrantes.png'))
    await button(page, 'Girar à direita').click()
    await button(page, 'Ajustar').click()

    const result = await download(page, button(page, 'Baixar imagem'))
    expect(result.name).toBe('quadrantes.png')
    expectImage(result.bytes, 'png', 64, 64)
    expectColor(await pixelAt(page, result.bytes, 16, 16), [0, 0, 255]) // o azul, que estava embaixo à esquerda
    expectColor(await pixelAt(page, result.bytes, 48, 16), [255, 0, 0])
    expectColor(await pixelAt(page, result.bytes, 48, 48), [0, 255, 0])
    expect((await pixelAt(page, result.bytes, 16, 48))[3]).toBe(0)
  })

  test('lote: a mesma operação em todas, nomes mantidos, ZIP conferido sem enviar nada', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('blob:') || url.startsWith('data:')) return
      if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
    })
    await openTool(page)
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('foto-girada.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('status')).toHaveText('3 arquivos prontos para ajustar.')

    await button(page, 'Girar à esquerda').click()
    await button(page, 'Ajustar 3 imagens').click()
    await expect(page.getByRole('heading', { name: '3 imagens ajustadas' })).toBeFocused()

    const zip = await download(page, button(page, 'Baixar todas (.zip)'))
    expect(zip.name).toBe('imagens-ajustadas.zip')
    const files = unzipSync(zip.bytes)
    expect(Object.keys(files).sort()).toEqual(['foto-girada.jpg', 'foto.jpg', 'quadrantes.png'])
    expectImage(files['foto.jpg']!, 'jpeg', 48, 64)
    // Aparece em pé (32 × 64) pela orientação EXIF: girada à esquerda, deita com o vermelho, que estava em cima, à esquerda.
    expectImage(files['foto-girada.jpg']!, 'jpeg', 64, 32)
    expectColor(await pixelAt(page, files['foto-girada.jpg']!, 16, 16), [255, 0, 0])
    expectColor(await pixelAt(page, files['foto-girada.jpg']!, 48, 16), [0, 0, 255])
    expect(requests).toEqual([])
  })

  test('sem escolher nada, avisa e leva o foco aos botões; "Desfazer tudo" volta à posição original', async ({ page }) => {
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByText('Escolha como girar ou espelhar.')).toBeVisible()

    await button(page, 'Ajustar').click()
    await expect(page.getByText(NOTHING_CHOSEN)).toBeVisible()
    await expect(button(page, 'Girar à esquerda')).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible() // nada foi processado

    await button(page, 'Espelhar na vertical').click()
    await expect(page.getByText(NOTHING_CHOSEN)).toHaveCount(0)
    await expect(page.getByText('Espelhada na vertical.')).toBeVisible()
    await button(page, 'Desfazer tudo').click()
    await expect(page.getByText('Escolha como girar ou espelhar.')).toBeVisible()
    await expect(button(page, 'Girar à esquerda')).toBeFocused()
  })

  test('estados da ferramenta sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(button(page, 'Ajustar 2 imagens')).toBeEnabled()
    await button(page, 'Ajustar 2 imagens').click()
    await expect(page.getByText(NOTHING_CHOSEN)).toBeVisible()
    await expectNoAxeViolations(page) // lista com miniaturas e o aviso
    expect(await horizontalOverflow(page)).toBe(0)

    await button(page, 'Girar à direita').click()
    await button(page, 'Ajustar 2 imagens').click()
    await expect(page.getByRole('heading', { name: '2 imagens ajustadas' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('a 320 px os botões cabem sem rolagem lateral e os alvos de toque têm 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await button(page, 'Girar à direita').click()
    await expect(button(page, 'Desfazer tudo')).toBeVisible()
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
    await expect(button(page, 'Ajustar')).toBeEnabled()

    await tabTo(button(page, 'Espelhar na horizontal'))
    await page.keyboard.press('Enter')
    await expect(page.getByText('Espelhada na horizontal.')).toBeVisible()
    await tabTo(button(page, 'Ajustar'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Imagem ajustada' })).toBeFocused()
    await tabTo(button(page, 'Baixar imagem'))
    const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
    expect(file.suggestedFilename()).toBe('foto.jpg')
    // Espelhar não muda as medidas.
    expectImage(new Uint8Array(await readFile(await file.path())), 'jpeg', 64, 48)
  })
})
