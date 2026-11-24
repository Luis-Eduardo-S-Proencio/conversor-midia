import { expect, test, type Page } from '@playwright/test'
import { button, download, expectNoAxeViolations, fileInput } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  UNSUPPORTED_DECODING,
  canDecodeVideo,
  expectVideoFormat,
  frameColors,
  horizontalOverflow,
  probeVideo,
  smallTouchTargets,
  tabTo,
  trackOutgoingRequests,
  videoFixture,
} from './video-tool.ts'

// "segundos.mp4" (tests/fixtures/videos): 320 × 240, 4,01 s, vermelho, verde, azul e amarelo, um por segundo, com som.
// Os tempos são levados à linha pelo teclado (Shift + seta: 1 s), o mesmo caminho de quem não usa o mouse.

/** Salvar vários pedaços refaz o vídeo: com vários navegadores testando ao mesmo tempo, passa dos 5 s padrão. */
const PROCESS_TIMEOUT = 30_000

async function openTool(page: Page, path = '/videos/editar') {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: 'Editar vídeo' })).toBeVisible()
}

async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

const timeline = (page: Page) => page.getByRole('group', { name: /^Linha do tempo do vídeo editado/ })
const piece = (page: Page, index: number, total: number) => page.getByRole('button', { name: new RegExp(`^Pedaço ${index} de ${total}:`) })
const player = (page: Page) => page.getByLabel(/^Vídeo segundos\.mp4, como está ficando$/)
const detail = (page: Page, term: string) =>
  page
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${term}$`) })
    .first()
    .locator('xpath=following-sibling::dd')

async function load(page: Page, name = 'segundos.mp4') {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(timeline(page)).toBeVisible({ timeout: OPEN_TIMEOUT })
}

/** Leva a linha a um ponto do vídeo editado, em segundos inteiros. */
async function lineAt(page: Page, seconds: number) {
  await timeline(page).focus()
  await page.keyboard.press('Home')
  for (let second = 0; second < seconds; second += 1) await page.keyboard.press('Shift+ArrowRight')
}

async function splitAt(page: Page, seconds: number) {
  await lineAt(page, seconds)
  await button(page, 'Dividir').click()
}

/**
 * Toca num pedaço como uma pessoa: com a barra à vista. No celular, a barra fixa de "Salvar vídeo" pode
 * cobri-la; sem trazê-la para o meio da tela, o próprio Playwright rolaria a barra de lado para achar onde tocar.
 */
async function selectPiece(page: Page, index: number, total: number) {
  await timeline(page).evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await piece(page, index, total).click()
}

async function save(page: Page) {
  await button(page, 'Salvar vídeo').click()
  await expect(page.getByRole('heading', { name: 'Vídeo editado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
}

test.describe('Editar vídeo', () => {
  test('o endereço antigo do Cortar trecho abre o editor', async ({ page }) => {
    await openTool(page, '/videos/cortar')
    await expect(page).toHaveURL(/\/videos\/editar$/)
  })

  test('dividir, excluir o meio e ver na hora; o arquivo salvo não tem a parte excluída, e nada é enviado', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await load(page)
    await expect(detail(page, 'Vídeo final')).toHaveText('0:04,01')
    await expect(button(page, 'Salvar vídeo')).toBeDisabled() // nada cortado ainda
    await expect(page.getByText(/^Divida o vídeo e exclua partes/)).toBeVisible()

    await splitAt(page, 1)
    await splitAt(page, 2)
    await expect(detail(page, 'Pedaços')).toHaveText('3')
    await selectPiece(page, 2, 3)
    await expect(piece(page, 2, 3)).toHaveAttribute('aria-pressed', 'true')
    await button(page, 'Excluir').click()

    // Na hora, sem processar: o vídeo encurta, e o player, na linha (2 s do editado), já mostra 3 s do original.
    await expect(detail(page, 'Vídeo final')).toHaveText('0:03,01')
    await expect(detail(page, 'Pedaços')).toHaveText('2')
    await expect.poll(() => player(page).evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(3, 1)
    await expect(page.getByText(/^Para juntar os pedaços, o vídeo é refeito/)).toBeVisible()
    await save(page)

    await expect(page.getByRole('status')).toHaveText('Vídeo editado. Pronto para baixar.')
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-editado.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 320, height: 240 })
    expect(probe.duration).toBeCloseTo(3, 1)
    // Fica 0–1 s (vermelho) e 2–4 s (azul, amarelo): no resultado, vermelho, azul e amarelo.
    expect(await frameColors(page, result.bytes, 0.5, [[160, 120]])).toEqual(['red'])
    expect(await frameColors(page, result.bytes, 1.5, [[160, 120]])).toEqual(['blue'])
    expect(await frameColors(page, result.bytes, 2.5, [[160, 120]])).toEqual(['yellow'])
    expect(requests).toEqual([])
  })

  test('tirar só o começo: um trecho só, salvo como corte', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await splitAt(page, 1)
    await selectPiece(page, 1, 2)
    await button(page, 'Excluir').click()
    await expect(page.getByText(/^Sobrou um trecho só/)).toBeVisible()
    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    const probe = await probeVideo(result.bytes)
    expect(probe.duration).toBeCloseTo(3, 1)
    expect(await frameColors(page, result.bytes, 0.2, [[160, 120]])).toEqual(['green'])
  })

  test('desfazer e refazer voltam e avançam pelas mudanças', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await expect(button(page, 'Desfazer')).toBeDisabled()
    await splitAt(page, 2)
    await selectPiece(page, 2, 2)
    await button(page, 'Excluir').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:02,00')
    await button(page, 'Desfazer').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:04,01')
    await expect(detail(page, 'Pedaços')).toHaveText('2')
    await button(page, 'Desfazer').click()
    await expect(detail(page, 'Pedaços')).toHaveText('1')
    await button(page, 'Refazer').click()
    await button(page, 'Refazer').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:02,00')
  })

  test('a ponta do pedaço selecionado anda pelas setas (alça) e pelo ajuste fino', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await selectPiece(page, 1, 1)
    const end = page.getByRole('slider', { name: 'Fim do pedaço 1' })
    await end.focus()
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')
    await expect(detail(page, 'Vídeo final')).toHaveText('0:02,01')
    await expect(end).toHaveAttribute('aria-valuetext', '0:02,01 do vídeo original')

    await page.getByText('Ajuste fino', { exact: true }).click()
    await page.getByRole('textbox', { name: 'Início', exact: true }).fill('0:00,50')
    await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('0:01,50')
    await button(page, 'Aplicar').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:01,00')
    await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('0:09,00')
    await button(page, 'Aplicar').click()
    await expect(page.getByRole('alert')).toContainText('O vídeo tem 0:04,01: o fim não pode passar disso.')

    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect((await probeVideo(result.bytes)).duration).toBeCloseTo(1, 1)
  })

  test('a barra mostra miniaturas do vídeo', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    const tile = piece(page, 1, 1).locator('span[aria-hidden="true"]').first()
    await expect(tile).toHaveAttribute('style', /background-image: url\("?blob:/, { timeout: OPEN_TIMEOUT })
  })

  test('só pelo teclado: linha, Dividir, pedaço, Excluir e Salvar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openWithDecoding(page)
    await load(page)
    await tabTo(page, timeline(page))
    await page.keyboard.press('Shift+ArrowRight')
    await tabTo(page, button(page, 'Dividir'))
    await page.keyboard.press('Enter')
    await tabTo(page, piece(page, 1, 2))
    await page.keyboard.press('Enter')
    await tabTo(page, button(page, 'Excluir'))
    await page.keyboard.press('Enter')
    await expect(detail(page, 'Vídeo final')).toHaveText('0:03,01')
    await tabTo(page, button(page, 'Salvar vídeo'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Vídeo editado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page)
    await expectNoAxeViolations(page) // player, botões e barra
    expect(await horizontalOverflow(page)).toBe(0)

    await splitAt(page, 1)
    await selectPiece(page, 1, 2)
    // Selecionar e salvar rolam a página; no topo, o cabeçalho fixo não cobre o link de voltar (falso alarme do axe).
    await page.evaluate(() => window.scrollTo(0, 0))
    await expectNoAxeViolations(page) // pedaço selecionado, com as alças
    await button(page, 'Excluir').click()
    await save(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page)
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
