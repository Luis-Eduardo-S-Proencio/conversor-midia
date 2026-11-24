import { expect, test } from '@playwright/test'
import { button, expectNoAxeViolations, fileInput, fixture } from './image-tool.ts'
import { OPEN_TIMEOUT, horizontalOverflow, trackOutgoingRequests, videoFixture } from './video-tool.ts'

// O "Abrir foto ou vídeo" do início reconhece o arquivo pelo conteúdo, pergunta o que fazer
// e entrega o arquivo à ferramenta escolhida, que já abre com ele (sem escolher de novo).

const question = (name: string) => `O que fazer com ${name}?`

test.describe('Início: abrir foto ou vídeo', () => {
  test('uma foto vai para a ferramenta escolhida já aberta, sem enviar nada', async ({ page, baseURL }) => {
    const outgoing = trackOutgoingRequests(page, baseURL)
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))

    const heading = page.getByRole('heading', { name: question('foto.jpg') })
    await expect(heading).toBeFocused() // o leitor de tela ouve logo qual arquivo abriu
    await expect(page.getByText(/^Imagem · /)).toBeVisible()
    const tools = page.getByRole('list', { name: question('foto.jpg') }).getByRole('link')
    await expect(tools).toHaveText(['Converter imagem', 'Comprimir imagem', 'Redimensionar imagem', 'Recortar imagem', 'Girar e espelhar'])

    await tools.filter({ hasText: 'Converter imagem' }).click()
    await expect(page).toHaveURL(/\/imagens\/converter$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()
    await expect(button(page, 'Converter')).toBeEnabled()
    expect(outgoing).toEqual([])
  })

  test('várias fotos vão juntas', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('heading', { name: question('as 2 imagens') })).toBeFocused()
    await expect(page.getByText('Recortar imagem trabalha com uma imagem de cada vez: abre só a primeira.')).toBeVisible()

    await page.getByRole('list', { name: question('as 2 imagens') }).getByRole('link', { name: 'Comprimir imagem' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('quadrantes.png', { exact: true }).first()).toBeVisible()
  })

  test('um vídeo vai para as ferramentas de vídeo e abre no editor', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    await expect(page.getByRole('heading', { name: question('segundos.mp4') })).toBeFocused()
    const tools = page.getByRole('list', { name: question('segundos.mp4') }).getByRole('link')
    await expect(tools).toHaveCount(7)

    await tools.filter({ hasText: 'Editar vídeo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Editar vídeo' })).toBeVisible()
    await expect(page.getByLabel('Vídeo segundos.mp4, como está ficando')).toBeVisible({ timeout: OPEN_TIMEOUT })
  })

  test('voltar ao início não reabre o arquivo na próxima ferramenta', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await page.getByRole('list', { name: question('foto.jpg') }).getByRole('link', { name: 'Girar e espelhar' }).click()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()

    await page.goto('/imagens/comprimir')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true })).toHaveCount(0)
  })

  test('com a foto aberta, a lista de todas as ferramentas também a leva (só às de imagem)', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByRole('heading', { name: question('foto.jpg') })).toBeFocused()
    await page.getByRole('region', { name: 'Todas as ferramentas' }).getByRole('link', { name: 'Converter imagem' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true }).first()).toBeVisible()

    await page.goBack()
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await page.getByRole('region', { name: 'Todas as ferramentas' }).getByRole('link', { name: 'Converter vídeo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Converter vídeo' })).toBeVisible()
    await expect(page.getByText('foto.jpg', { exact: true })).toHaveCount(0)
  })

  test('arquivo que não é imagem nem vídeo: explica e continua no início', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('texto.png'))
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('"texto.png" não é uma imagem nem um vídeo que o Media Tools abre')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: 'Abrir foto ou vídeo' })).toBeVisible()
  })

  test('foto e vídeo juntos: pede um tipo só', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), videoFixture('segundos.mp4')])
    await expect(page.getByRole('alert')).toContainText('Escolha só imagens ou só um vídeo')
  })

  test('com o arquivo aberto: sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }) => {
    await page.goto('/')
    await fileInput(page).setInputFiles(fixture('foto.jpg'))
    await expect(page.getByRole('heading', { name: question('foto.jpg') })).toBeFocused()
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)

    await expect(page.getByRole('button', { name: 'Escolher outro arquivo' })).toBeVisible()
    await fileInput(page).setInputFiles(videoFixture('segundos.webm'))
    await expect(page.getByRole('heading', { name: question('segundos.webm') })).toBeFocused()
  })
})
