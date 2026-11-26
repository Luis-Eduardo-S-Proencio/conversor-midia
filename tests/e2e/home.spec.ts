import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { button, expectNoAxeViolations, fileInput, fixture } from './image-tool.ts'
import { OPEN_TIMEOUT, canDecodeVideo, horizontalOverflow, trackOutgoingRequests, videoFixture } from './video-tool.ts'

// O Início: "Abrir foto ou vídeo" (e, no computador, a área de soltar e o Colar), o painel "O que fazer
// com este arquivo?", a ferramenta escolhida já aberta com o arquivo e as listas de ferramentas.

const ONE_FILE = 'O que fazer com este arquivo?'
const MANY_FILES = 'O que fazer com estas imagens?'
const HOME_TITLE = 'Edite fotos e vídeos'

const sheet = (page: Page, name = ONE_FILE) => page.getByRole('dialog', { name })
/** Seletor de "Abrir foto ou vídeo", que aceita várias fotos de uma vez. */
const multipleInput = (page: Page) => page.locator('input[type="file"][multiple]').first()
const sheetInput = (page: Page) => page.getByRole('dialog').locator('input[type="file"]')

/** Arquivos de teste dentro da página, para soltar ou colar como se viessem do aparelho. */
async function pageFiles(page: Page, paths: readonly { path: string; name: string; type: string }[]) {
  const files = await Promise.all(paths.map(async ({ path, name, type }) => ({ name, type, data: Array.from(await readFile(path)) })))
  return page.evaluateHandle((list) => {
    const transfer = new DataTransfer()
    for (const { name, type, data } of list) transfer.items.add(new File([new Uint8Array(data)], name, { type }))
    return transfer
  }, files)
}

test.describe('Início: abrir foto ou vídeo', () => {
  test('uma foto vai para a ferramenta escolhida já aberta, sem enviar nada', async ({ page, baseURL }) => {
    const outgoing = trackOutgoingRequests(page, baseURL)
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))

    const dialog = sheet(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('foto.jpg')).toBeVisible()
    await expect(dialog.getByText('JPG', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/^\d+ × \d+$/)).toBeVisible() // medidas lidas da miniatura
    const tools = dialog.getByRole('link')
    await expect(tools).toHaveText([/^Converter imagem/, /^Comprimir imagem/, /^Redimensionar imagem/, /^Recortar imagem/, /^Girar e espelhar/])

    await tools.filter({ hasText: 'Converter imagem' }).click()
    await expect(page).toHaveURL(/\/imagens\/converter$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()
    await expect(button(page, 'Converter')).toBeEnabled()
    expect(outgoing).toEqual([])

    // A ferramenta tomou o lugar do painel no histórico: voltar leva ao início, sem o painel.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: HOME_TITLE })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('várias fotos vão juntas, só para as ferramentas de lote', async ({ page }) => {
    await page.goto('/')
    await multipleInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    const dialog = sheet(page, MANY_FILES)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('2 imagens')).toBeVisible()
    await expect(dialog.getByRole('link', { name: /Recortar imagem/ })).toHaveCount(0)
    await expect(dialog.getByText('Para recortar, abra uma imagem de cada vez.')).toBeVisible()

    await dialog.getByRole('link', { name: /^Comprimir imagem/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('quadrantes.png', { exact: true }).first()).toBeVisible()
  })

  test('um vídeo: o editor vem recomendado e abre com ele', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    const dialog = sheet(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('MP4', { exact: true })).toBeVisible()
    const tools = dialog.getByRole('link')
    await expect(tools).toHaveCount(7)
    await expect(tools.first()).toHaveText(/^Editar vídeo\s*Recomendado/)

    await tools.first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Editar vídeo' })).toBeVisible()
    await expect(page.getByLabel('Vídeo segundos.mp4, como está ficando')).toBeVisible({ timeout: OPEN_TIMEOUT })
  })

  test('voltar ao início não reabre o arquivo na próxima ferramenta', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await sheet(page).getByRole('link', { name: /^Girar e espelhar/ }).click()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()

    await page.goto('/imagens/comprimir')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true })).toHaveCount(0)
  })

  test('fechar o painel cancela: nenhuma ferramenta recebe o arquivo', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await sheet(page).getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('main').getByRole('link', { name: /Converter imagem/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true })).toHaveCount(0)
  })

  test('arquivo que não é imagem nem vídeo: explica e continua no início', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('texto.png'))
    await expect(page.getByRole('alert')).toContainText('"texto.png" não é uma imagem nem um vídeo que o Media Tools abre')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('foto e vídeo juntos: pede um tipo só', async ({ page }) => {
    await page.goto('/')
    await multipleInput(page).setInputFiles([fixture('foto.jpg'), videoFixture('segundos.mp4')])
    await expect(page.getByRole('alert')).toContainText('Escolha só imagens ou só um vídeo')
  })

  test('com o painel aberto: sem violações de acessibilidade nem rolagem lateral; dá para escolher outro', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(sheet(page)).toBeVisible()
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)

    await sheetInput(page).setInputFiles(videoFixture('segundos.webm'))
    await expect(sheet(page).getByText('segundos.webm')).toBeVisible()
    await expect(sheet(page).getByText('WEBM', { exact: true })).toBeVisible()
  })

  test('soltar um arquivo em qualquer ponto mostra "Solte para abrir" e abre o painel', async ({ page }) => {
    await page.goto('/')
    const transfer = await pageFiles(page, [{ path: fixture('foto.jpg'), name: 'foto.jpg', type: 'image/jpeg' }])
    await page.dispatchEvent('main', 'dragenter', { dataTransfer: transfer })
    await expect(page.locator('[data-dragover]').filter({ hasText: 'Solte para abrir' })).toBeVisible()

    await page.dispatchEvent('main', 'drop', { dataTransfer: transfer })
    await expect(sheet(page)).toBeVisible()
    await expect(page.locator('div[data-dragover]')).toHaveCount(0)
  })

  test('colar uma imagem (Ctrl+V) abre o painel', async ({ page }) => {
    await page.goto('/')
    const transfer = await pageFiles(page, [{ path: fixture('quadrantes.png'), name: 'image.png', type: 'image/png' }])
    await page.evaluate((data) => {
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    }, transfer)
    await expect(sheet(page)).toBeVisible()
    await expect(sheet(page).getByText('PNG', { exact: true })).toBeVisible()
  })
})

test.describe('Início: ferramentas', () => {
  test('todas as ferramentas em duas listas, Vídeo e Imagem, sem atalhos rápidos', async ({ page }, testInfo) => {
    await page.goto('/')
    const video = page.getByRole('region', { name: 'Vídeo', exact: true })
    const image = page.getByRole('region', { name: 'Imagem', exact: true })
    await expect(video.getByRole('link')).toHaveCount(7)
    await expect(image.getByRole('link')).toHaveCount(5)
    await expect(video.getByRole('link').first()).toHaveText(/^Editar vídeo/)
    await expect(page.getByText('Atalhos rápidos')).toHaveCount(0)
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)

    const videoBox = await video.boundingBox()
    const imageBox = await image.boundingBox()
    if (!videoBox || !imageBox) throw new Error('listas ausentes')
    if (testInfo.project.name === 'desktop') {
      // Lado a lado no computador.
      expect(Math.round(imageBox.y)).toBe(Math.round(videoBox.y))
    } else {
      expect(imageBox.y).toBeGreaterThan(videoBox.y + videoBox.height - 1)
    }
  })

  test('cada item leva à ferramenta', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('region', { name: 'Imagem', exact: true }).getByRole('link', { name: /^Comprimir imagem/ }).click()
    await expect(page).toHaveURL(/\/imagens\/comprimir$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
  })
})

// Endereços com a ferramenta já ajustada continuam valendo (links salvos ou compartilhados).
test.describe('ferramenta já ajustada pelo endereço', () => {
  test('?destino=whatsapp abre o Comprimir vídeo ajustado para até 64 MB', async ({ page }) => {
    await page.goto('/videos/comprimir?destino=whatsapp')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
    test.skip(!(await canDecodeVideo(page)), 'o navegador de teste não lê vídeo')
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    await expect(page.getByText('Ajustado para WhatsApp')).toBeVisible({ timeout: OPEN_TIMEOUT })
    await expect(page.getByText('64 MB', { exact: true })).toBeVisible()
  })

  test('?formato=pdf abre o Converter com PDF escolhido', async ({ page }) => {
    await page.goto('/imagens/converter?formato=pdf')
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByRole('radio', { name: 'PDF' })).toBeChecked()
  })

  test('?formato=mp3 abre o Extrair áudio com MP3 escolhido', async ({ page }) => {
    await page.goto('/videos/extrair-audio?formato=mp3')
    await expect(page.getByRole('heading', { level: 1, name: 'Extrair áudio' })).toBeVisible()
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    const mp3 = page.getByRole('radio', { name: 'MP3' })
    await expect(mp3).toBeVisible({ timeout: OPEN_TIMEOUT })
    test.skip(await mp3.isDisabled(), 'este navegador não gera MP3')
    await expect(mp3).toBeChecked()
  })

  test('?proporcao=9:16 abre o Recortar vídeo em 9:16, mesmo com o vídeo deitado', async ({ page }) => {
    await page.goto('/videos/recortar?proporcao=9:16')
    await expect(page.getByRole('heading', { level: 1, name: 'Recortar vídeo' })).toBeVisible()
    test.skip(!(await canDecodeVideo(page)), 'o navegador de teste não lê vídeo')
    await fileInput(page).setInputFiles(videoFixture('quadrantes.mov'))
    await expect(page.getByRole('radio', { name: '9:16' })).toBeChecked({ timeout: OPEN_TIMEOUT })
    // 320 × 240 deitado: a área em pé de 9:16 tem a altura inteira.
    await expect(page.getByRole('textbox', { name: 'Altura' })).toHaveValue('240')
  })
})
