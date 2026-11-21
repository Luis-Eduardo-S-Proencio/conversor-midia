import { expect, test, type Page } from '@playwright/test'
import { button, download, expectNoAxeViolations, fileInput } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  UNSUPPORTED_DECODING,
  canDecodeVideo,
  expectVideoFormat,
  frameColors,
  horizontalOverflow,
  playerTime,
  probeVideo,
  smallTouchTargets,
  trackOutgoingRequests,
  videoFixture,
  waitForPlayer,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "quadrantes.mov" (320 × 240) tem vermelho, verde, azul e amarelo nos
// quadrantes e metadados com título e localização; "girado.mp4" foi gravado deitado e aparece em pé (240 × 320),
// vermelho em cima e azul embaixo.
const NOTHING_CROPPED = 'Ajuste a área de recorte antes: arraste os cantos sobre o vídeo ou digite as medidas.'

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const cropArea = (page: Page) => page.getByRole('group', { name: /Área de recorte/ })

async function openTool(page: Page) {
  await page.goto('/videos/recortar')
  await expect(page.getByRole('heading', { level: 1, name: 'Recortar vídeo' })).toBeVisible()
}

/** Recortar sempre recodifica: onde não há decodificador de vídeo, o teste se pula com o motivo. */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(cropArea(page)).toBeVisible({ timeout: OPEN_TIMEOUT })
}

test.describe('Recortar vídeo', () => {
  test('MOV: fica só a área digitada, no mesmo formato, sem metadados e sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await load(page, 'quadrantes.mov')
    await expect(page.getByRole('img', { name: /Vídeo quadrantes.mov/ }).or(page.getByLabel('Vídeo quadrantes.mov'))).toBeVisible()
    await expect(field(page, 'Largura')).toHaveValue('320')
    await expect(field(page, 'Altura')).toHaveValue('240')

    await page.getByRole('radio', { name: '1:1' }).click()
    await expect(field(page, 'Margem esquerda')).toHaveValue('40')
    await expect(field(page, 'Largura')).toHaveValue('240')
    await page.getByRole('radio', { name: 'Livre' }).click()
    await field(page, 'Largura').fill('160')
    await field(page, 'Altura').fill('120')
    await field(page, 'Margem esquerda').fill('160')
    await field(page, 'Margem superior').fill('0')
    await expect(page.getByText('160 × 120', { exact: true })).toBeVisible()
    await button(page, 'Recortar').click()

    await expect(page.getByRole('heading', { name: 'Vídeo recortado' })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Vídeo recortado. Pronto para baixar.')
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('quadrantes-recortado.mov')
    expectVideoFormat(result.bytes, 'mov')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ format: 'QuickTime File Format', videoCodec: 'avc', width: 160, height: 120 })
    expect(probe.tags).not.toHaveProperty('title')
    expect(JSON.stringify(probe.tags)).not.toContain('12.3456') // a localização do original não vai junto
    expect(requests).toEqual([])
  })

  test('vídeo girado: a área vale para o quadro como ele aparece; medida ímpar perde 1 px', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'girado.mp4')
    await expect(field(page, 'Largura')).toHaveValue('240')
    await expect(field(page, 'Altura')).toHaveValue('320')
    await field(page, 'Altura').fill('161')
    await expect(page.getByText('240 × 160', { exact: true })).toBeVisible() // tamanho final, com lados pares
    await expect(page.getByText(/Vídeos saem com largura e altura pares/)).toBeVisible()
    await button(page, 'Recortar').click()

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('girado-recortado.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    expect(await probeVideo(result.bytes)).toMatchObject({ videoCodec: 'avc', width: 240, height: 160 })
    const colors = await frameColors(page, result.bytes, 0.5, [
      [120, 10],
      [120, 150],
      [5, 80],
      [234, 80],
    ])
    expect(colors).toEqual(['red', 'red', 'red', 'red']) // só a metade de cima, vermelha
  })

  test('sem recortar nada, avisa e leva o foco à largura; "Usar o vídeo inteiro" desfaz', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'quadrantes.mov')
    await button(page, 'Recortar').click()
    await expect(page.getByText(NOTHING_CROPPED)).toBeVisible()
    await expect(field(page, 'Largura')).toBeFocused()

    await page.getByRole('radio', { name: '16:9' }).click()
    await expect(page.getByText(NOTHING_CROPPED)).toHaveCount(0)
    await expect(field(page, 'Altura')).toHaveValue('180')
    await button(page, 'Usar o vídeo inteiro').click()
    await expect(field(page, 'Altura')).toHaveValue('240')
    await expect(page.getByRole('radio', { name: 'Livre' })).toBeChecked()
  })

  test('área menor que o mínimo: erro na hora, ligado ao campo', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'quadrantes.mov')
    await field(page, 'Largura').fill('8')
    await expect(page.getByRole('alert')).toHaveText('Use um valor de 16 a 320 px.')
    await expect(field(page, 'Largura')).toHaveAttribute('aria-invalid', 'true')
    await button(page, 'Recortar').click()
    await expect(field(page, 'Largura')).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible() // nada foi processado
  })

  test('teclado: as setas movem a área sobre o vídeo e os campos acompanham', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado físico')
    await openWithDecoding(page)
    await load(page, 'girado.mp4')
    await page.getByRole('radio', { name: '1:1' }).click() // quadrado de 240 no meio: sobra espaço em cima e embaixo
    await expect(field(page, 'Margem superior')).toHaveValue('40')
    await cropArea(page).focus()
    await page.keyboard.press('ArrowDown')
    await expect.poll(async () => Number(await field(page, 'Margem superior').inputValue())).toBeGreaterThan(40)
  })

  test('reproduzir, pausar e escolher o momento do vídeo sob a área', async ({ page }) => {
    await openWithDecoding(page)
    // Vídeo de 30 s: um curto acabaria de tocar (e o botão voltaria a "Reproduzir") antes da conferência.
    await load(page, 'longo.mp4')
    await waitForPlayer(page)
    await page.getByRole('slider', { name: 'Momento do vídeo' }).fill('2')
    await expect.poll(() => playerTime(page)).toBeCloseTo(2, 1)
    await button(page, 'Reproduzir').click()
    await expect(button(page, 'Pausar')).toBeVisible()
    await button(page, 'Pausar').click()
    await expect(button(page, 'Reproduzir')).toBeVisible()
  })

  test('cancelar no meio volta às opções, sem resultado', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'longo.mp4')
    await page.getByRole('radio', { name: '1:1' }).click()
    await button(page, 'Recortar').click()
    await expect(page.getByRole('progressbar', { name: 'Recortando o vídeo' })).toBeVisible()
    await button(page, 'Cancelar').click()

    await expect(page.getByRole('status')).toHaveText('Recorte cancelado.')
    await expect(button(page, 'Recortar')).toBeEnabled()
    await expect(page.getByRole('heading', { name: 'Vídeo recortado' })).toHaveCount(0)
  })

  test('sem decodificador de vídeo, a página explica que não dá para recortar neste navegador', async ({ page }) => {
    await openTool(page)
    test.skip(await canDecodeVideo(page), 'este motor decodifica vídeo')
    await fileInput(page).setInputFiles(videoFixture('quadrantes.mov'))
    await expect(page.getByText(/Recortar exige recodificar o vídeo, e este navegador não consegue recodificar vídeos H\.264/)).toBeVisible()
    await expect(button(page, 'Recortar')).toBeDisabled()
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'quadrantes.mov')
    await expectNoAxeViolations(page) // área de recorte, controles e opções
    expect(await horizontalOverflow(page)).toBe(0)

    await page.getByRole('radio', { name: '1:1' }).click()
    await button(page, 'Recortar').click()
    await expect(page.getByRole('heading', { name: 'Vídeo recortado' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'quadrantes.mov')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
