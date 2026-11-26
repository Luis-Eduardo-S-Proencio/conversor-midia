import { expect, test, type Page } from '@playwright/test'
import { expectNoAxeViolations } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const principal = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

test.describe('navegação', () => {
  test('o menu leva às páginas e marca a atual', async ({ page }) => {
    await page.goto('/')
    const nav = principal(page)
    await expect(nav).toHaveCount(1) // só um menu visível por largura

    await nav.getByRole('link', { name: 'Imagens' }).click()

    await expect(page).toHaveURL(/\/imagens$/)
    await expect(page).toHaveTitle('Imagens · Media Tools')
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  test('o menu fica à esquerda a partir de 768 px e embaixo no celular', async ({ page }, testInfo) => {
    await page.goto('/')
    const box = await principal(page).boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error('menu ou viewport ausente')

    if (testInfo.project.name === 'mobile') {
      expect(Math.round(box.y + box.height)).toBe(viewport.height)
    } else {
      expect(box.x).toBeLessThan(20)
      expect(box.y).toBeLessThan(200)
    }
  })

  test('celular e tablet têm as mesmas quatro abas; no computador o Sobre fica no rodapé da barra lateral', async ({ page }, testInfo) => {
    await page.goto('/')
    if (testInfo.project.name === 'desktop') {
      await expect(principal(page).getByRole('link')).toHaveText(['Início', 'Imagens', 'Vídeos'])
      await page.getByRole('complementary', { name: 'Navegação' }).getByRole('link', { name: 'Sobre', exact: true }).click()
    } else {
      await expect(principal(page).getByRole('link')).toHaveText(['Início', 'Imagens', 'Vídeos', 'Sobre'])
      await principal(page).getByRole('link', { name: 'Sobre' }).click()
    }
    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre' })).toBeVisible()
  })

  test('no celular a barra inferior não cobre o fim da página', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'só existe barra inferior no celular')
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    const last = await page.getByRole('main').locator('section').last().boundingBox()
    const nav = await principal(page).boundingBox()
    if (!last || !nav) throw new Error('conteúdo ou menu ausente')
    expect(last.y + last.height).toBeLessThanOrEqual(nav.y)
  })

  test('o Sobre tem voltar: aberto por link direto, volta ao início', async ({ page }) => {
    await page.goto('/sobre')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Edite fotos e vídeos direto no navegador' })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('ferramenta aberta por link direto: o voltar leva à lista do mesmo tipo', async ({ page }) => {
    await page.goto('/videos/comprimir')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de vídeo' })).toBeVisible()
    await expect(page).toHaveURL(/\/videos$/)
  })

  test('tela nova abre no topo, e o voltar devolve à tela anterior na mesma posição', async ({ page }) => {
    await page.goto('/')
    const gif = page.getByRole('main').getByRole('link', { name: /Criar GIF/ }).first()
    // Inteiro na tela antes de medir: assim o clique não precisa rolar a página.
    await gif.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    const before = await scrollY(page)
    test.skip(before === 0, 'nesta largura o início cabe inteiro na tela')

    await gif.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Criar GIF' })).toBeVisible()
    expect(await scrollY(page)).toBe(0)

    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Edite fotos e vídeos direto no navegador' })).toBeVisible()
    await expect.poll(() => scrollY(page)).toBe(before)
  })

  test('"Processamento local", na barra lateral, leva à explicação', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a barra lateral é do computador')
    await page.goto('/')
    await page.getByRole('complementary', { name: 'Navegação' }).getByRole('link', { name: 'Processamento local' }).click()

    await expect(page).toHaveURL(/\/sobre#privacidade$/)
    const section = page.getByRole('heading', { name: 'Processamento local' })
    await expect(section).toBeInViewport()
    await expect(section).toBeFocused() // o leitor de tela começa pela seção pedida
  })

  test('no alto contraste do Windows o item ativo continua identificável', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/imagens')
    const active = principal(page).getByRole('link', { name: 'Imagens' })
    await expect(active).toHaveCSS('text-decoration-line', 'underline')
  })

  test('endereço inexistente mostra página própria, com caminho de volta', async ({ page }) => {
    await page.goto('/endereco-que-nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible()

    await page.getByRole('link', { name: 'Ir para o início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('a vitrine fica em /_design, fora da navegação', async ({ page }) => {
    await page.goto('/_design')
    await expect(page.getByRole('heading', { level: 1, name: 'Design System' })).toBeVisible()
    await page.goto('/')
    await expect(page.locator('a[href="/_design"]')).toHaveCount(0)
  })
})

test.describe('computador: barra lateral', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'a barra lateral com as ferramentas é do computador')

  test('todas as ferramentas, agrupadas, com a atual destacada; sem segundo trilho na ferramenta', async ({ page }) => {
    await page.goto('/imagens/comprimir')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    const tools = page.getByRole('navigation', { name: 'Ferramentas' })
    await expect(tools.getByRole('link')).toHaveCount(12)
    await expect(tools.getByRole('link', { name: 'Comprimir imagem' })).toHaveAttribute('aria-current', 'page')
    await expect(tools.getByRole('link', { name: 'Comprimir vídeo' })).not.toHaveAttribute('aria-current')
    await expect(page.getByRole('navigation', { name: 'Ferramentas de imagem' })).toBeHidden()
    // A trilha "Imagens / Comprimir imagem" leva de volta à lista.
    await page.getByRole('main').getByRole('link', { name: 'Imagens', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
  })

  test('recolhe para 72 px e lembra a escolha ao recarregar', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('complementary', { name: 'Navegação' })
    await page.getByRole('button', { name: 'Recolher a barra lateral' }).click()
    await expect(page.getByRole('button', { name: 'Expandir a barra lateral' })).toBeVisible()
    expect((await sidebar.boundingBox())?.width).toBe(72)
    await expectNoAxeViolations(page)

    await page.reload()
    expect((await sidebar.boundingBox())?.width).toBe(72)
    await page.getByRole('button', { name: 'Expandir a barra lateral' }).click()
    expect((await sidebar.boundingBox())?.width).toBe(248)
  })
})

test.describe('instalar o app', () => {
  test.describe('no iPhone', () => {
    test.use({ userAgent: IPHONE_UA })

    test('"Instalar" no cabeçalho abre o passo a passo; o voltar fecha o painel sem sair da tela', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'o cabeçalho com "Instalar" é do celular')
      await page.goto('/')
      const install = page.getByRole('banner').getByRole('button', { name: 'Instalar' })
      await install.click()

      const sheet = page.getByRole('dialog', { name: 'Instalar o app' })
      await expect(sheet).toBeVisible()
      await expect(sheet).toContainText('Adicionar à Tela de Início')
      await expectNoAxeViolations(page)
      expect(await horizontalOverflow(page)).toBe(0)

      // Voltar do navegador (ou o gesto do Android) fecha o painel antes de sair do início.
      await page.goBack()
      await expect(sheet).toBeHidden()
      await expect(page.getByRole('heading', { level: 1, name: 'Edite fotos e vídeos direto no navegador' })).toBeVisible()

      await install.click()
      await sheet.getByRole('button', { name: 'Entendi' }).click()
      await expect(sheet).toBeHidden()
      await expect(install).toBeFocused()
    })
  })

  test('sem o pedido do navegador e fora do iPhone, não há botão de instalar', async ({ page }) => {
    // Se o Chromium liberasse o pedido, o botão apareceria (conferido no teste do componente).
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (event) => event.stopImmediatePropagation())
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Edite fotos e vídeos direto no navegador' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Instalar/ })).toHaveCount(0)
  })
})

test.describe('teclado', () => {
  test.skip(({ isMobile }) => isMobile, 'teclado físico')

  test('o primeiro Tab mostra "Pular para o conteúdo", que leva ao conteúdo', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeInViewport()

    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    // O próximo Tab já é o primeiro controle do conteúdo, a entrada principal do início.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('main').getByRole('button', { name: 'Abrir foto ou vídeo' })).toBeFocused()
  })

  test('ao trocar de página, o foco vai para o conteúdo', async ({ page }) => {
    await page.goto('/')
    await principal(page).getByRole('link', { name: 'Imagens' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
    await expect(page.locator('#conteudo')).toBeFocused()
  })
})
