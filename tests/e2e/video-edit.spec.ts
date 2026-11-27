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

/**
 * Sem AAC (Firefox), salvar vários pedaços refaria o som num codec que o navegador não gera: a tela explica
 * e o botão fica desligado. Confere isso e diz se o teste para aqui.
 */
async function joinBlocked(page: Page): Promise<boolean> {
  const note = page.getByText(/^Para salvar mais de um pedaço, o som também é refeito/)
  if (!(await note.isVisible())) return false
  await expect(button(page, 'Salvar vídeo')).toBeDisabled()
  return true
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
    await expect(page.getByText(/^Marque na barra a parte que quer tirar/)).toBeVisible()

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
    if (await joinBlocked(page)) return
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

  test('marcar uma parte no meio com as alças e excluir, sem dividir', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await selectPiece(page, 1, 1) // marca o vídeo inteiro: as alças ficam nas pontas
    await expect(button(page, 'Excluir')).toBeDisabled() // tirar tudo não pode
    const start = page.getByRole('slider', { name: 'Começo da parte marcada' })
    const end = page.getByRole('slider', { name: 'Fim da parte marcada' })
    await start.focus()
    await page.keyboard.press('Shift+ArrowRight') // começo em 1 s
    await end.focus()
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft') // fim em 2,01 s
    await expect(start).toHaveAttribute('aria-valuetext', '0:01,00 do vídeo original')
    await expect(end).toHaveAttribute('aria-valuetext', '0:02,01 do vídeo original')
    await expect(detail(page, 'Parte marcada')).toHaveText('0:01,00 a 0:02,01 · 0:01,01')
    await expect(detail(page, 'Vídeo final')).toHaveText('0:04,01') // marcar não muda o vídeo
    // O player mostra o quadro da alça que andou por último: 2,01 s do original (azul).
    await expect.poll(() => player(page).evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(2.01, 1)

    await button(page, 'Excluir').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:03,00')
    await expect(detail(page, 'Pedaços')).toHaveText('2')
    await expect(page.getByRole('status')).toContainText('Parte de 0:01,00 a 0:02,01 excluída')

    if (await joinBlocked(page)) return
    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    const probe = await probeVideo(result.bytes)
    expect(probe.duration).toBeCloseTo(3, 1)
    // Fica 0–1 s (vermelho) e 2,01–4,01 s (azul, amarelo).
    expect(await frameColors(page, result.bytes, 0.5, [[160, 120]])).toEqual(['red'])
    expect(await frameColors(page, result.bytes, 1.5, [[160, 120]])).toEqual(['blue'])
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

test.describe('Editar vídeo: textos', () => {
  const textField = (page: Page) => page.getByRole('textbox', { name: 'Texto', exact: true })
  /** Ponto dentro da bolha, acima das letras (a letra no maior tamanho tem 16% do lado menor do quadro, 240 px). */
  const aboveLetters = (centerY: number) => Math.round(centerY - 0.85 * 0.16 * 240)

  async function addBubble(page: Page) {
    await button(page, 'Adicionar texto').click()
    await expect(textField(page)).toBeFocused()
    await textField(page).fill('Oi')
    await page.getByRole('radio', { name: 'Bolha', exact: true }).click()
    await page.getByRole('tab', { name: 'Fonte' }).click()
    await page.getByRole('radio', { name: 'Cursiva', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Cursiva', exact: true })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('tab', { name: 'Cor' }).click()
    await page.getByRole('radio', { name: 'Verde', exact: true }).click()
    await page.getByRole('tab', { name: 'Ajustes' }).click()
    await page.getByRole('slider', { name: 'Tamanho' }).fill('100')
  }

  test('o T põe um texto no ponto da linha; estilo, cor e lugar saem no vídeo salvo, só no tempo dele', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await addBubble(page)
    // O texto aparece no player e na faixa da barra, de 0 a 3 s.
    await expect(page.getByRole('button', { name: 'Texto: Oi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Oi, texto de 0:00,00 a 0:03,00 do vídeo original' })).toBeVisible()
    await expect(page.getByText('De 0:00,00 a 0:03,00 do vídeo original', { exact: true })).toBeVisible()
    await expect(detail(page, 'Textos')).toHaveText('1')

    // Pelo teclado, o texto sobe 10% do quadro (Shift + seta: 5% por vez).
    await page.getByRole('button', { name: 'Texto: Oi' }).focus()
    await page.keyboard.press('Shift+ArrowUp')
    await page.keyboard.press('Shift+ArrowUp')
    await button(page, 'Concluir o texto').click()
    await expect(textField(page)).toHaveCount(0)

    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe.duration).toBeCloseTo(4, 1)
    // A bolha verde ficou com o centro em 40% da altura (96 px), sobre o vermelho; depois de 3 s, sumiu.
    expect(await frameColors(page, result.bytes, 0.5, [[160, aboveLetters(96)], [10, 10]])).toEqual(['green', 'red'])
    expect(await frameColors(page, result.bytes, 3.5, [[160, aboveLetters(96)]])).toEqual(['yellow'])
  })

  test('as pontas do bloco na barra mudam quando o texto aparece; Desfazer tira o texto', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await button(page, 'Adicionar texto').click()
    await textField(page).fill('Olá')
    const end = page.getByRole('slider', { name: 'Fim do texto' })
    await end.focus()
    await page.keyboard.press('Shift+ArrowLeft') // 1 s antes
    await expect(end).toHaveAttribute('aria-valuetext', '0:02,00 do vídeo original')
    await page.getByRole('tab', { name: 'Ajustes' }).click()
    await expect(page.getByText('De 0:00,00 a 0:02,00 do vídeo original', { exact: true })).toBeVisible()

    // Escrever e mexer no texto aberto é um passo só: desfazer volta ao vídeo sem o texto.
    await button(page, 'Desfazer').click()
    await expect(page.getByRole('button', { name: /, texto de / })).toHaveCount(0)
    await expect(button(page, 'Salvar vídeo')).toBeDisabled()
    await button(page, 'Refazer').click()
    await expect(page.getByRole('button', { name: 'Olá, texto de 0:00,00 a 0:02,00 do vídeo original' })).toBeVisible()
  })

  test('texto com corte: o texto acompanha o tempo do original e o arquivo sai com os dois', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    // Texto de 0 a 3 s; depois, tira o primeiro segundo (vermelho).
    await addBubble(page)
    await button(page, 'Concluir o texto').click()
    await splitAt(page, 1)
    await selectPiece(page, 1, 2)
    await button(page, 'Excluir').click()
    await expect(detail(page, 'Vídeo final')).toHaveText('0:03,01')
    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expect((await probeVideo(result.bytes)).duration).toBeCloseTo(3, 1)
    // 0,5 s do resultado = 1,5 s do original (verde, com a bolha); 2,5 s = 3,5 s do original, sem texto.
    expect(await frameColors(page, result.bytes, 0.5, [[10, 10]])).toEqual(['green'])
    expect(await frameColors(page, result.bytes, 2.5, [[160, aboveLetters(120)]])).toEqual(['yellow'])
  })

  test('texto aberto: sem violações de acessibilidade, sem rolagem lateral e alvos de 44 px no celular', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'conferido no Chromium em duas larguras')
    await openWithDecoding(page)
    await load(page)
    await addBubble(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)
    if (testInfo.project.name === 'mobile') {
      for (const tab of ['Estilo', 'Cor', 'Ajustes']) {
        await page.getByRole('tab', { name: tab }).click()
        expect(await smallTouchTargets(page)).toEqual([])
      }
    }
  })
})

test.describe('Editar vídeo: efeitos', () => {
  const effectsPanel = (page: Page) => page.getByRole('region', { name: 'Efeitos' })

  async function openEffects(page: Page) {
    await button(page, 'Efeitos').click()
    await expect(effectsPanel(page)).toBeVisible()
  }

  test('filtro P&B: a prévia muda na hora e o vídeo salvo sai em cinza', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await openEffects(page)
    await page.getByRole('radio', { name: 'P&B', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'P&B', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('slider', { name: 'Força do filtro' })).toHaveValue('100')
    // A prévia: o player ganha o filtro de cor (os textos ficam fora dele).
    await expect.poll(() => player(page).evaluate((video: HTMLVideoElement) => getComputedStyle(video).filter)).toMatch(/^url\(/)
    await expect(detail(page, 'Filtro')).toHaveText('P&B')
    await expect(page.getByText(/^Com texto, filtro ou ajustes, o vídeo é refeito/)).toBeVisible()
    await button(page, 'Concluir os efeitos').click()
    await expect(effectsPanel(page)).toHaveCount(0)

    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expectVideoFormat(result.bytes, 'mp4')
    expect((await probeVideo(result.bytes)).duration).toBeCloseTo(4, 1)
    expect(await frameColors(page, result.bytes, 0.5, [[160, 120]])).toEqual(['gray']) // era vermelho
    expect(await frameColors(page, result.bytes, 3.5, [[160, 120]])).toEqual(['gray']) // era amarelo
  })

  test('ajustes: mexer seguido no mesmo controle é um passo só de desfazer', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await openEffects(page)
    await page.getByRole('tab', { name: 'Ajustes' }).click()
    const brightness = page.getByRole('slider', { name: 'Brilho' })
    await brightness.focus()
    for (let step = 0; step < 5; step += 1) await page.keyboard.press('ArrowRight')
    await expect(brightness).toHaveValue('5')
    await expect(detail(page, 'Ajustes')).toHaveText('Brilho')
    await expect(button(page, 'Salvar vídeo')).toBeEnabled()

    await button(page, 'Desfazer').click()
    await expect(brightness).toHaveValue('0')
    await expect(button(page, 'Desfazer')).toBeDisabled()
    await expect(button(page, 'Salvar vídeo')).toBeDisabled()
    await button(page, 'Refazer').click()
    await expect(brightness).toHaveValue('5')
  })

  test('2×: o player toca mais rápido e o vídeo salvo dura a metade; sem AAC (Firefox), fica indisponível com explicação', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await openEffects(page)
    await page.getByRole('tab', { name: 'Velocidade' }).click()
    await page.getByRole('radio', { name: '2×', exact: true }).click()
    await expect(page.getByText('A 2×, o vídeo fica com 0:02,01 (era 0:04,01). O som acompanha sem mudar o tom.')).toBeVisible()
    await expect.poll(() => player(page).evaluate((video: HTMLVideoElement) => video.playbackRate)).toBe(2)
    await expect(detail(page, 'Velocidade')).toHaveText('2×')
    await expect(detail(page, 'Vídeo final')).toHaveText('0:02,01') // 4,01 s ÷ 2

    const blocked = page.getByText(/^Para mudar a velocidade, o som também é refeito/)
    if (await blocked.isVisible()) {
      await expect(button(page, 'Salvar vídeo')).toBeDisabled()
      return
    }
    await save(page)
    const result = await download(page, button(page, 'Baixar vídeo'))
    expectVideoFormat(result.bytes, 'mp4')
    const probe = await probeVideo(result.bytes)
    expect(probe.duration).toBeCloseTo(2, 1)
    expect(await frameColors(page, result.bytes, 0.25, [[160, 120]])).toEqual(['red']) // 0,5 s do original
    expect(await frameColors(page, result.bytes, 1.25, [[160, 120]])).toEqual(['blue']) // 2,5 s do original
  })

  test('um painel por vez: abrir os efeitos fecha o texto, e o T fecha os efeitos', async ({ page }) => {
    await openWithDecoding(page)
    await load(page)
    await button(page, 'Adicionar texto').click()
    await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toBeVisible()
    await openEffects(page)
    await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveCount(0)
    await expect(button(page, 'Efeitos')).toHaveAttribute('aria-expanded', 'true')
    await button(page, 'Adicionar texto').click()
    await expect(effectsPanel(page)).toHaveCount(0)
  })

  test('efeitos abertos: sem violações de acessibilidade, sem rolagem lateral e alvos de 44 px no celular', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'conferido no Chromium em duas larguras')
    await openWithDecoding(page)
    await load(page)
    await openEffects(page)
    await page.getByRole('radio', { name: 'Vívido', exact: true }).click()
    for (const tab of ['Filtros', 'Ajustes', 'Velocidade']) {
      await page.getByRole('tab', { name: tab }).click()
      await page.evaluate(() => window.scrollTo(0, 0))
      await expectNoAxeViolations(page)
      expect(await horizontalOverflow(page)).toBe(0)
      if (testInfo.project.name === 'mobile') expect(await smallTouchTargets(page)).toEqual([])
    }
  })
})
