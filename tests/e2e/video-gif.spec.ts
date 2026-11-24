import { expect, test, type Page } from '@playwright/test'
import { decodeGif } from '../../src/test/format-readers'
import { button, download, expectNoAxeViolations, fileInput } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  UNSUPPORTED_DECODING,
  canDecodeVideo,
  classify,
  horizontalOverflow,
  smallTouchTargets,
  tabTo,
  timeField,
  trackOutgoingRequests,
  videoFixture,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "segundos.mp4" (320 × 240, 4 s: vermelho, verde, azul e amarelo, um
// por segundo), "detalhado.mp4" (976 × 736, 1 s), "com-som.mov" (160 × 120) e "longo.mp4" (30 s). O GIF baixado
// é lido por um leitor independente (src/test/format-readers.ts), quadro a quadro.

/** Criar o GIF lê o vídeo quadro a quadro: com vários navegadores testando ao mesmo tempo, passa dos 5 s padrão. */
const PROCESS_TIMEOUT = 30_000

async function openTool(page: Page) {
  await page.goto('/videos/gif')
  await expect(page.getByRole('heading', { level: 1, name: 'Criar GIF' })).toBeVisible()
}

/** Criar GIF exige ler o vídeo: onde não há decodificador, o teste se pula com o motivo. */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

const detail = (page: Page, term: string) =>
  page
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${term}$`) })
    .first()
    .locator('xpath=following-sibling::dd')
const radio = (page: Page, label: string) => page.getByRole('radio', { name: label, exact: true })

async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(timeField(page, 'Início').or(page.getByRole('alert'))).toBeVisible({ timeout: OPEN_TIMEOUT })
}

async function setRange(page: Page, start: string, end: string) {
  await timeField(page, 'Início').fill(start)
  await timeField(page, 'Fim').fill(end)
}

async function create(page: Page) {
  await button(page, 'Criar GIF').click()
  await expect(page.getByRole('heading', { name: 'GIF criado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
}

test.describe('Criar GIF', () => {
  test('trecho de 2 s vira GIF animado, com as cores de cada momento, que dá para pausar, sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    // Vídeo de 4 s: já vem inteiro marcado; 320 × 240, então 480 e 640 ficam desligados.
    await expect(timeField(page, 'Fim')).toHaveValue('0:04,01')
    await expect(radio(page, '320 px')).toBeChecked()
    await expect(radio(page, '480 px')).toBeDisabled()
    await setRange(page, '0:00,50', '0:02,50')
    await expect(detail(page, 'Duração')).toHaveText('0:02,00')
    await expect(detail(page, 'Medidas')).toHaveText('320 × 240')
    await expect(detail(page, 'Quadros')).toHaveText('20')
    await create(page)

    await expect(page.getByRole('status')).toHaveText('GIF criado. Pronto para baixar.')
    await expect(page.getByRole('img', { name: 'Como ficou: segundos.gif' })).toBeVisible()
    await button(page, 'Pausar animação').click()
    await expect(page.getByRole('img', { name: 'Como ficou (parado): segundos.gif' })).toBeVisible()
    await expect(button(page, 'Reproduzir animação')).toBeVisible()

    const result = await download(page, button(page, 'Baixar GIF'))
    expect(result.name).toBe('segundos.gif')
    const gif = decodeGif(result.bytes)
    expect(gif).toMatchObject({ width: 320, height: 240, loops: 0 })
    expect(gif.frames).toHaveLength(20)
    const colorOf = (frame: number) => {
      const at = (120 * 320 + 160) * 4
      return classify(Array.from(gif.frames[frame]?.rgba.subarray(at, at + 4) ?? []))
    }
    expect([colorOf(0), colorOf(6), colorOf(16)]).toEqual(['red', 'green', 'blue']) // 0,5 s, 1,1 s e 2,1 s
    expect(requests).toEqual([])
  })

  test('mais de 15 segundos: aviso ligado ao campo e nada é criado', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'longo.mp4') // 30 s: já vem marcado só o começo
    await expect(timeField(page, 'Fim')).toHaveValue('0:05,00')
    await timeField(page, 'Fim').fill('0:20,00')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('O GIF pode ter no máximo 15 segundos, para não ficar pesado demais. O trecho marcado tem 0:20.')
    await expect(timeField(page, 'Fim')).toHaveAttribute('aria-invalid', 'true')
    await button(page, 'Criar GIF').click()
    await expect(timeField(page, 'Fim')).toBeFocused()
    await expect(page.getByRole('heading', { name: 'GIF criado' })).toHaveCount(0)
  })

  test('tamanho pelo lado maior, sem aumentar, e a fluidez muda os quadros', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'detalhado.mp4') // 976 × 736, 1 s
    await expect(radio(page, '480 px')).toBeChecked()
    await expect(detail(page, 'Medidas')).toHaveText('480 × 362')
    await radio(page, '640 px').click()
    await expect(detail(page, 'Medidas')).toHaveText('640 × 483')
    await expect(detail(page, 'Quadros')).toHaveText('10')
    await radio(page, 'Suave').click()
    await expect(detail(page, 'Quadros')).toHaveText('15')
    await create(page)
    const gif = decodeGif((await download(page, button(page, 'Baixar GIF'))).bytes)
    expect([gif.width, gif.height, gif.frames.length]).toEqual([640, 483, 15])
  })

  test('vídeo menor que todos os tamanhos: o GIF fica do tamanho dele', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'com-som.mov') // 160 × 120
    await expect(page.getByText('O vídeo é pequeno: o GIF fica do tamanho dele, 160 × 120.')).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Tamanho' })).toHaveCount(0)
  })

  test('com "reduzir movimento" ligado, o GIF aparece parado, e dá para reproduzir', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await setRange(page, '0:00,00', '0:01,00')
    await create(page)
    await expect(page.getByRole('img', { name: 'Como ficou (parado): segundos.gif' })).toBeVisible()
    await button(page, 'Reproduzir animação').click()
    await expect(page.getByRole('img', { name: 'Como ficou: segundos.gif' })).toBeVisible()
  })

  test('teclado: as setas escolhem a fluidez e Enter cria o GIF', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'teclado conferido no computador')
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await setRange(page, '0:00,00', '0:01,00')
    await tabTo(page, radio(page, 'Normal'))
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 'Suave')).toBeChecked()
    await tabTo(page, button(page, 'Criar GIF'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'GIF criado' })).toBeFocused({ timeout: PROCESS_TIMEOUT })
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'segundos.mp4')
    await expectNoAxeViolations(page) // player, trecho, tamanho, fluidez e quadros
    expect(await horizontalOverflow(page)).toBe(0)

    await timeField(page, 'Fim').fill('0:30,00')
    await expectNoAxeViolations(page) // aviso no campo
    await setRange(page, '0:00,00', '0:01,00')
    await create(page)
    await expectNoAxeViolations(page) // resultado, com o GIF e o botão de pausar
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'detalhado.mp4')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
