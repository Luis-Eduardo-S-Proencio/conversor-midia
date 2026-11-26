import { expect, test, type Page } from '@playwright/test'
import { button, fileInput, fixture, openImageTool } from './image-tool.ts'
import { OPEN_TIMEOUT, UNSUPPORTED_DECODING, canDecodeVideo, videoFixture } from './video-tool.ts'

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

  test('vídeo: depois de editar, o player mostra o resultado; dá para ver o original e voltar', async ({ page }) => {
    await page.goto('/videos/editar')
    test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4')) // 4 s
    // Marca do 1 s até o fim pela alça do começo e exclui: fica de 0 a 1 s.
    const timeline = page.getByRole('group', { name: /^Linha do tempo do vídeo editado/ })
    await expect(timeline).toBeVisible({ timeout: OPEN_TIMEOUT })
    await timeline.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
    await page.getByRole('button', { name: /^Pedaço 1 de 1/ }).click()
    await page.getByRole('slider', { name: 'Começo da parte marcada' }).focus()
    await page.keyboard.press('Shift+ArrowRight')
    await button(page, 'Excluir').click()
    await button(page, 'Salvar vídeo').click()
    await expect(page.getByRole('heading', { name: 'Vídeo editado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })

    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    const result = page.getByLabel('Como ficou: segundos-editado.mp4')
    // O player toca o arquivo gerado: 1 s, e não os 4 s do original.
    await expect.poll(() => result.evaluate((video: HTMLVideoElement) => video.duration)).toBeCloseTo(1, 1)

    await page.getByRole('radio', { name: 'Original' }).click()
    await expect(page.getByLabel('Vídeo segundos.mp4, como está ficando')).toBeVisible()
    await expect(result).toHaveCount(0)

    await button(page, 'Ver como ficou').click()
    await expect(page.getByRole('radio', { name: 'Como ficou' })).toBeFocused()
    await expect(page.getByLabel('Como ficou: segundos-editado.mp4')).toBeVisible()
  })
})
