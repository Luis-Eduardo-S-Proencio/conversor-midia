import { expect, test, type Page } from '@playwright/test'
import { button, download, expectNoAxeViolations, fileInput, fixture } from './image-tool.ts'
import {
  OPEN_TIMEOUT,
  UNSUPPORTED_DECODING,
  canDecodeVideo,
  dropFiles,
  expectVideoFormat,
  frameColors,
  horizontalOverflow,
  playerTime,
  probeVideo,
  seekPlayer,
  smallTouchTargets,
  tabTo,
  timeField,
  trackOutgoingRequests,
  videoFixture,
  waitForPlayer,
} from './video-tool.ts'

// Vídeos de teste (tests/fixtures/videos): "segundos" troca de cor a cada segundo (vermelho, verde, azul,
// amarelo) e tem som; dura 4,01 s (o som passa alguns milésimos dos 4 s do vídeo).
/** Emendar pedaços refaz o vídeo e o som. */
const JOIN_TIMEOUT = 30_000

const NOTHING_TRIMMED = 'Ajuste o início ou o fim antes: o trecho ainda é o vídeo inteiro.'

async function openTool(page: Page) {
  await page.goto('/videos/cortar')
  await expect(page.getByRole('heading', { level: 1, name: 'Cortar trecho' })).toBeVisible()
}

/** Abre a ferramenta e pula o teste onde não há decodificador de vídeo (corte exato e conferência de quadros). */
async function openWithDecoding(page: Page) {
  await openTool(page)
  test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
}

async function load(page: Page, name: string) {
  await fileInput(page).setInputFiles(videoFixture(name))
  await expect(timeField(page, 'Início')).toBeVisible({ timeout: OPEN_TIMEOUT })
}

/** Campo de uma parte a remover: o rótulo visível é "Início", e o leitor de tela ouve "Início da parte 2". */
const partField = (page: Page, name: 'Início' | 'Fim', part: number) => page.getByRole('textbox', { name: `${name} da parte ${part}`, exact: true })

/** O navegador gera AAC? O Firefox não: lá o som de MP4 não pode ser refeito para emendar. */
const canEncodeAac = (page: Page) =>
  page.evaluate(async () => {
    if (typeof AudioEncoder === 'undefined') return false
    const support = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48_000, numberOfChannels: 2, bitrate: 128_000 })
    return support.supported === true
  })

async function setRange(page: Page, start: string, end: string) {
  await timeField(page, 'Início').fill(start)
  await timeField(page, 'Fim').fill(end)
}

test.describe('Cortar trecho', () => {
  test('exato: fica só com o trecho, com som, no mesmo formato e sem enviar nada', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await expect(page.getByText(/^MP4 · 320 × 240 · 0:04 · /)).toBeVisible()
    await expect(timeField(page, 'Início')).toHaveValue('0:00,00')
    await expect(timeField(page, 'Fim')).toHaveValue('0:04,01')
    await expect(page.getByRole('radio', { name: 'Exato' })).toBeChecked()

    await setRange(page, '0:01,50', '0:03,00')
    await expect(page.getByText('0:01,50', { exact: true })).toBeVisible() // duração do trecho
    await button(page, 'Cortar').click()

    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('Vídeo cortado. Pronto para baixar.')
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-trecho.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 320, height: 240 })
    expect(probe.duration).toBeCloseTo(1.5, 1)
    expect(probe.firstTimestamp).toBeGreaterThanOrEqual(0) // nada escondido antes do início
    expect(await frameColors(page, result.bytes, 0.1, [[160, 120]])).toEqual(['green']) // 1,6 s do original
    expect(await frameColors(page, result.bytes, 1.4, [[160, 120]])).toEqual(['blue']) // 2,9 s do original
    expect(requests).toEqual([])
  })

  test('marcar início e fim no player e ver como fica: toca só o trecho', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await waitForPlayer(page)

    await seekPlayer(page, 2)
    await button(page, 'Marcar início aqui').click()
    await expect(timeField(page, 'Início')).toHaveValue('0:02,00')
    await expect(page.getByRole('status')).toHaveText('Início marcado em 0:02,00.')
    await seekPlayer(page, 3)
    await button(page, 'Marcar fim aqui').click()
    await expect(timeField(page, 'Fim')).toHaveValue('0:03,00')

    await button(page, 'Ver como fica').click()
    const player = page.locator('video')
    await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.paused && video.currentTime >= 2.99), { timeout: 10_000 }).toBe(true)
    expect(await playerTime(page)).toBeLessThan(3.3) // para no fim do trecho, não no fim do vídeo
  })

  test('rápido: copia sem recodificar, guardando escondido o começo do grupo de quadros', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.mp4')
    await page.getByRole('radio', { name: 'Rápido' }).click()
    await expect(page.getByText(/Instantâneo e com a qualidade original/)).toBeVisible()
    await setRange(page, '0:01,50', '0:03,00')
    await button(page, 'Cortar').click()

    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused()
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-trecho.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac' })
    expect(probe.firstTimestamp).toBeCloseTo(-0.5, 2) // quadro-chave de 1 s, meio segundo antes do início
    expect(probe.duration).toBeCloseTo(1.5, 1)
  })

  test('WEBM: só o corte exato, e o resultado continua WEBM com som', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'segundos.webm')
    await expect(page.getByRole('radio', { name: 'Rápido' })).toBeDisabled()
    await expect(page.getByText('Em WEBM, o corte é sempre exato.')).toBeVisible()
    await setRange(page, '0:01,50', '0:03,00')
    await button(page, 'Cortar').click()

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-trecho.webm')
    expectVideoFormat(result.bytes, 'webm')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus' })
    expect(probe.duration).toBeCloseTo(1.5, 1)
    expect(await frameColors(page, result.bytes, 0.1, [[160, 120]])).toEqual(['green'])
  })

  test('remover uma parte do meio: o resto se junta, sem nada da parte removida, com som', async ({ page, baseURL }) => {
    const requests = trackOutgoingRequests(page, baseURL)
    await openWithDecoding(page)
    test.skip(!(await canEncodeAac(page)), 'este motor não gera AAC (Firefox): o MP4 não pode ser emendado; o WEBM é conferido abaixo')
    await load(page, 'segundos.mp4')
    await page.getByRole('radio', { name: 'Remover partes' }).click()
    await expect(page.getByText(/Tira as partes escolhidas e junta o que sobra/)).toBeVisible()
    await partField(page, 'Início', 1).fill('0:01,50')
    await partField(page, 'Fim', 1).fill('0:02,50')
    await expect(page.getByText('0:03,01', { exact: true })).toBeVisible() // vídeo final: 4,01 s menos 1 s
    await button(page, 'Cortar').click()

    // Emendar refaz o vídeo e o som: com vários navegadores ao mesmo tempo, leva mais que o padrão de 5 s.
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused({ timeout: JOIN_TIMEOUT })
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-editado.mp4')
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ videoCodec: 'avc', audioCodec: 'aac', width: 320, height: 240 })
    expect(probe.duration).toBeCloseTo(3, 1)
    expect(await frameColors(page, result.bytes, 1.4, [[160, 120]])).toEqual(['green']) // 1,4 s do original, antes da emenda
    expect(await frameColors(page, result.bytes, 1.6, [[160, 120]])).toEqual(['blue']) // 2,6 s do original, depois dela
    expect(await frameColors(page, result.bytes, 2.6, [[160, 120]])).toEqual(['yellow']) // 3,6 s do original
    expect(requests).toEqual([])
  })

  test('várias partes: o player marca a parte destacada, o erro aponta a parte, e dá para tirar uma da lista', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'segundos.webm')
    await waitForPlayer(page)
    await page.getByRole('radio', { name: 'Remover partes' }).click()

    await seekPlayer(page, 0.5)
    await button(page, 'Marcar início aqui').click()
    await seekPlayer(page, 1)
    await button(page, 'Marcar fim aqui').click()
    await expect(partField(page, 'Início', 1)).toHaveValue('0:00,50')
    await expect(partField(page, 'Fim', 1)).toHaveValue('0:01,00')
    await expect(page.getByRole('status')).toHaveText('Fim da parte 1 marcado em 0:01,00.')

    await button(page, 'Adicionar parte').click()
    await expect(partField(page, 'Início', 2)).toBeFocused() // a parte nova recebe o foco e passa a ser a marcada
    await expect(page.getByText(/os botões marcam a parte 2\./)).toBeVisible()
    await partField(page, 'Início', 2).fill('0:03,00')
    await partField(page, 'Fim', 2).fill('0:02,00')
    await expect(page.getByRole('alert')).toHaveText('Parte 2: o início precisa vir antes do fim.')
    await expect(partField(page, 'Início', 2)).toHaveAttribute('aria-invalid', 'true')
    await expect(partField(page, 'Início', 1)).not.toHaveAttribute('aria-invalid')
    await partField(page, 'Fim', 2).fill('0:04,01') // até o fim do vídeo
    await expect(page.getByRole('alert')).toHaveCount(0)

    await button(page, 'Adicionar parte').click()
    await button(page, 'Tirar a parte 3 da lista').click()
    await expect(partField(page, 'Início', 3)).toHaveCount(0)
    await expect(partField(page, 'Início', 2)).toBeFocused()
    await expect(page.getByText('0:02,50', { exact: true })).toBeVisible() // fica 0–0,5 s e 1–3 s
    await button(page, 'Cortar').click()
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused({ timeout: JOIN_TIMEOUT })

    const result = await download(page, button(page, 'Baixar vídeo'))
    expect(result.name).toBe('segundos-editado.webm')
    expectVideoFormat(result.bytes, 'webm')
    const probe = await probeVideo(result.bytes)
    expect(probe).toMatchObject({ format: 'WebM', videoCodec: 'vp9', audioCodec: 'opus' })
    expect(probe.duration).toBeCloseTo(2.5, 1)
    const colors = [await frameColors(page, result.bytes, 0.25, [[160, 120]]), await frameColors(page, result.bytes, 0.75, [[160, 120]])]
    expect(colors.flat()).toEqual(['red', 'green']) // 0,25 s e 1,25 s do original
    expect(await frameColors(page, result.bytes, 2.4, [[160, 120]])).toEqual(['blue']) // 2,9 s do original
  })

  test('sem codificador de AAC (Firefox): remover partes de MP4 fica indisponível, com explicação', async ({ page }) => {
    await openWithDecoding(page)
    test.skip(await canEncodeAac(page), 'este motor gera AAC')
    await load(page, 'segundos.mp4')
    await expect(page.getByRole('radio', { name: 'Remover partes' })).toBeDisabled()
    await expect(page.getByText(/não consegue refazer o som deste vídeo/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Manter trecho' })).toBeChecked()
  })

  test('sem decodificador de vídeo: só o corte rápido, com aviso; WEBM não pode ser cortado', async ({ page }) => {
    await openTool(page)
    test.skip(await canDecodeVideo(page), 'este motor decodifica vídeo')
    await load(page, 'segundos.mp4')
    await expect(page.getByRole('radio', { name: 'Remover partes' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Exato' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Rápido' })).toBeChecked()
    await expect(page.getByText('Este navegador não consegue refazer vídeos H.264: só o corte rápido está disponível.')).toBeVisible()

    await fileInput(page).setInputFiles(videoFixture('segundos.webm'))
    await expect(page.getByText(/Este navegador não consegue cortar vídeos WEBM VP9/)).toBeVisible()
    await expect(button(page, 'Cortar')).toBeDisabled()
  })

  test('valor errado, campo vazio ou nada cortado: aviso ligado ao campo, foco nele e nada processado', async ({ page }) => {
    await openTool(page)
    await load(page, 'segundos.mp4')
    await button(page, 'Cortar').click()
    await expect(page.getByText(NOTHING_TRIMMED)).toBeVisible()
    await expect(timeField(page, 'Início')).toBeFocused()

    await timeField(page, 'Início').fill('abc')
    await expect(page.getByRole('alert')).toHaveText('Use minutos e segundos, como 1:05,30.')
    await expect(timeField(page, 'Início')).toHaveAttribute('aria-invalid', 'true')
    await expect(timeField(page, 'Fim')).not.toHaveAttribute('aria-invalid')
    await timeField(page, 'Início').fill('0:05,00')
    await expect(page.getByRole('alert')).toHaveText('O vídeo tem 0:04,01: o início precisa vir antes disso.')

    await setRange(page, '0:01,00', '')
    await expect(page.getByRole('alert')).toHaveCount(0) // campo vazio só vira aviso ao tentar
    await button(page, 'Cortar').click()
    await expect(page.getByText('Preencha o fim.')).toBeVisible()
    await expect(timeField(page, 'Fim')).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Opções' })).toBeVisible() // nada foi processado
  })

  test('arquivos recusados: o motivo aparece, é anunciado e não dá para cortar', async ({ page }) => {
    await openTool(page)
    const cases: Array<[string, string]> = [
      [videoFixture('texto.mp4'), 'Formato não suportado. Use MP4, MOV ou WEBM.'],
      [videoFixture('vazio.mp4'), 'O arquivo está vazio.'],
      [videoFixture('video.mkv'), 'MKV não é aceito. Use MP4, MOV ou WEBM.'],
      [fixture('quadrantes.png'), 'Este arquivo é uma imagem (PNG). Escolha um vídeo MP4, MOV ou WEBM.'],
      [videoFixture('so-audio.mp4'), 'Não há vídeo neste arquivo. Escolha um vídeo MP4, MOV ou WEBM.'],
      [videoFixture('cortado.mp4'), 'Não foi possível ler o vídeo. O arquivo pode estar corrompido ou incompleto.'],
    ]
    for (const [path, message] of cases) {
      await fileInput(page).setInputFiles(path)
      await expect(page.getByText(message, { exact: true })).toBeVisible()
      await expect(page.getByRole('status')).toHaveText(`Vídeo recusado. ${message}`)
      await expect(button(page, 'Cortar')).toBeDisabled()
    }
  })

  test('um vídeo por vez: só o primeiro abre, com aviso; "Trocar vídeo" substitui e "Limpar" recomeça', async ({ page }) => {
    await openTool(page)
    await dropFiles(page, ['segundos.mp4', 'segundos.webm'])
    await expect(page.getByText('segundos.mp4', { exact: true })).toBeVisible()
    await expect(page.getByText('segundos.webm', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Só o primeiro arquivo foi aberto: esta ferramenta trabalha com um vídeo por vez.')).toBeVisible()
    await timeField(page, 'Início').fill('0:01,00')

    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), button(page, 'Trocar vídeo').click()])
    await chooser.setFiles(videoFixture('quadrantes.mov'))
    await expect(page.getByText('quadrantes.mov', { exact: true })).toBeVisible()
    await expect(timeField(page, 'Início')).toHaveValue('0:00,00') // o trecho recomeça no vídeo novo
    await expect(timeField(page, 'Fim')).toHaveValue('0:01,00')

    await button(page, 'Limpar').click()
    await expect(page.getByRole('button', { name: 'Selecionar vídeo' })).toBeFocused()
  })

  test('cancelar no meio volta às opções, sem resultado', async ({ page }) => {
    await openWithDecoding(page)
    await load(page, 'longo.mp4')
    await timeField(page, 'Início').fill('0:00,50') // fora do quadro-chave: recodifica os 30 s
    await button(page, 'Cortar').click()
    await expect(page.getByRole('progressbar', { name: 'Cortando o vídeo' })).toBeVisible()
    await button(page, 'Cancelar').click()

    await expect(page.getByRole('status')).toHaveText('Corte cancelado.')
    await expect(button(page, 'Cortar')).toBeEnabled()
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toHaveCount(0)
    await expect(timeField(page, 'Início')).toHaveValue('0:00,50') // as escolhas continuam
  })

  test('só pelo teclado: campos, modo e Cortar, com o foco no resultado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'teclado físico')
    await openWithDecoding(page)
    await load(page, 'segundos.mp4')
    await button(page, 'Trocar vídeo').focus()
    await tabTo(page, timeField(page, 'Início'))
    await page.keyboard.press('Control+A')
    await page.keyboard.type('0:02,00')
    await page.keyboard.press('Tab')
    await expect(timeField(page, 'Fim')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio', { name: 'Exato' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Rápido' })).toBeChecked()
    await tabTo(page, button(page, 'Cortar'))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused()
  })

  test('estados sem violações automáticas de acessibilidade nem rolagem lateral', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'o axe independe do motor: conferido no Chromium em duas larguras')
    await openTool(page)
    await expectNoAxeViolations(page) // seleção do vídeo
    await load(page, 'segundos.mp4')
    await expectNoAxeViolations(page) // player e opções
    expect(await horizontalOverflow(page)).toBe(0)

    await timeField(page, 'Início').fill('abc')
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoAxeViolations(page) // campo com erro

    await page.getByRole('radio', { name: 'Remover partes' }).click()
    await button(page, 'Adicionar parte').click()
    await partField(page, 'Fim', 2).fill('x')
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoAxeViolations(page) // lista de partes, com erro numa delas
    expect(await horizontalOverflow(page)).toBe(0)

    await page.getByRole('radio', { name: 'Manter trecho' }).click()
    await setRange(page, '0:01,00', '0:02,00')
    await button(page, 'Cortar').click()
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeFocused()
    await expectNoAxeViolations(page) // resultado
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('celular a 320 px: sem rolagem lateral e alvos de toque de 44 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'reflow e toque conferidos no celular')
    await page.setViewportSize({ width: 320, height: 700 })
    await openTool(page)
    await load(page, 'segundos.mp4')
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])

    await page.getByRole('radio', { name: 'Remover partes' }).click()
    await button(page, 'Adicionar parte').click()
    expect(await horizontalOverflow(page)).toBe(0)
    expect(await smallTouchTargets(page)).toEqual([])
  })
})
