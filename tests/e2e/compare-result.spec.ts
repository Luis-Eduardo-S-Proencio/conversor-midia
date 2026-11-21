import { expect, test, type Page } from '@playwright/test'
import { button, fileInput, fixture, openImageTool } from './image-tool.ts'
import { OPEN_TIMEOUT, UNSUPPORTED_DECODING, canDecodeVideo, timeField, videoFixture } from './video-tool.ts'

// Depois de processar, a pessoa vê como ficou (e o original, para comparar) antes de baixar.

const naturalSize = (page: Page, name: string) =>
  page.getByRole('img', { name, exact: true }).evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])

const PROCESS_TIMEOUT = 30_000

test.describe('Ver como ficou', () => {
  test('imagem única: o resultado aparece no lugar da prévia; dá para ver o original e voltar', async ({ page }) => {
    await openImageTool(page, '/imagens/girar', 'Girar e espelhar')
    await fileInput(page).setInputFiles(fixture('foto.jpg')) // 64 × 48, deitada
    await button(page, 'Girar à direita').click()
    await button(page, 'Ajustar').click()
    await expect(page.getByRole('heading', { name: 'Imagem ajustada' })).toBeFocused()

    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    // É o arquivo gerado, já em pé, e não a prévia girada por CSS.
    await expect.poll(() => naturalSize(page, 'Como ficou: foto.jpg')).toEqual([48, 64])
    await page.getByRole('radio', { name: 'Original' }).click()
    await expect.poll(() => naturalSize(page, 'Pré-visualização de foto.jpg')).toEqual([64, 48])
    await expect(page.getByRole('img', { name: 'Como ficou: foto.jpg' })).toHaveCount(0)

    // "Ver como ficou", no painel do resultado, volta ao resultado e leva o foco até a escolha.
    await button(page, 'Ver como ficou').click()
    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeFocused()
    await expect(page.getByRole('img', { name: 'Como ficou: foto.jpg' })).toBeVisible()

    // Mudar as opções descarta o resultado: a comparação some e a prévia volta a ser a de antes de processar.
    await button(page, 'Alterar opções').click()
    await expect(page.getByRole('radiogroup', { name: 'Mostrar' })).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()
  })

  test('lote: cada imagem pronta tem "Ver como ficou", que abre a comparação acima da lista', async ({ page }) => {
    await openImageTool(page, '/imagens/converter', 'Converter imagem')
    await fileInput(page).setInputFiles([fixture('quadrantes.png'), fixture('foto.jpg')])
    await page.getByRole('radio', { name: 'PNG' }).click()
    await button(page, 'Converter 2 imagens').click()
    await expect(page.getByRole('heading', { name: '2 imagens convertidas' })).toBeFocused()

    await button(page, 'Ver como ficou foto.png').click()
    await expect(page.getByRole('heading', { name: 'Como ficou: foto.png' })).toBeFocused()
    await expect.poll(() => naturalSize(page, 'Como ficou: foto.png')).toEqual([64, 48])
    await page.getByRole('radio', { name: 'Original' }).click()
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()

    await button(page, 'Fechar a comparação').click()
    await expect(page.getByRole('heading', { name: 'Como ficou: foto.png' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '2 arquivos' })).toBeFocused()
  })

  test('formato que o navegador não mostra (TIFF): avisa para baixar, em vez de imagem quebrada', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'o Safari mostra TIFF')
    await openImageTool(page, '/imagens/converter', 'Converter imagem')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await page.getByRole('radio', { name: 'TIFF' }).click()
    await button(page, 'Converter').click()
    await expect(page.getByText('Este navegador não mostra este formato de arquivo. Baixe para ver como ficou.')).toBeVisible()
    await expect(button(page, 'Baixar imagem')).toBeVisible()
  })

  test('vídeo: depois de cortar, o player mostra o resultado; dá para ver o original e voltar', async ({ page }) => {
    await page.goto('/videos/cortar')
    test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4')) // 4 s
    await expect(timeField(page, 'Início')).toBeVisible({ timeout: OPEN_TIMEOUT })
    await timeField(page, 'Início').fill('0:01,50')
    await timeField(page, 'Fim').fill('0:03,00')
    await button(page, 'Cortar').click()
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })

    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    const result = page.getByLabel('Como ficou: segundos-trecho.mp4')
    // O player toca o arquivo gerado: 1,5 s, e não os 4 s do original.
    await expect.poll(() => result.evaluate((video: HTMLVideoElement) => video.duration)).toBeCloseTo(1.5, 1)

    await page.getByRole('radio', { name: 'Original' }).click()
    await expect(page.getByLabel('Vídeo segundos.mp4')).toBeVisible()
    await expect(result).toHaveCount(0)

    await button(page, 'Ver como ficou').click()
    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeFocused()
    await expect(page.getByLabel('Como ficou: segundos-trecho.mp4')).toBeVisible()
  })
})
