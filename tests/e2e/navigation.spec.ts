import { expect, test, type Page } from '@playwright/test'
import { expectNoAxeViolations } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const HOME_TITLE = 'Edite fotos e vídeos'

const principal = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

async function openMenu(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await expect(menu).toBeVisible()
  return menu
}

test.describe('navegação', () => {
  test('o menu principal leva às páginas e marca a atual', async ({ page }) => {
    await page.goto('/')
    const nav = principal(page)
    await expect(nav).toHaveCount(1) // só um menu visível por largura

    await nav.getByRole('link', { name: 'Imagens' }).click()

    await expect(page).toHaveURL(/\/imagens$/)
    await expect(page).toHaveTitle('Imagens · Media Tools')
    await expect(page.getByRole('heading', { level: 1, name: 'Imagens' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  test('três abas embaixo no celular; no cabeçalho a partir de 768 px', async ({ page }, testInfo) => {
    await page.goto('/')
    const box = await principal(page).boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error('menu ou viewport ausente')
    await expect(principal(page).getByRole('link')).toHaveText(['Início', 'Imagens', 'Vídeos'])

    if (testInfo.project.name === 'mobile') {
      expect(Math.round(box.y + box.height)).toBe(viewport.height)
    } else {
      expect(box.y).toBeLessThan(64)
      expect(box.x + box.width).toBeGreaterThan(viewport.width / 2)
    }
  })

  test('o menu (☰) fica no canto superior esquerdo e leva ao Sobre', async ({ page }) => {
    await page.goto('/')
    const button = await page.getByRole('banner').getByRole('button', { name: 'Menu' }).boundingBox()
    if (!button) throw new Error('botão do menu ausente')
    expect(button.x).toBeLessThan(48)
    expect(button.y).toBeLessThan(16)

    const menu = await openMenu(page)
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)
    await menu.getByRole('link', { name: 'Sobre o Media Tools' }).click()
    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre' })).toBeVisible()

    // O Sobre tomou o lugar do menu no histórico: voltar leva ao início, com o menu fechado.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: HOME_TITLE })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('o voltar do navegador fecha o menu sem sair da tela', async ({ page }) => {
    await page.goto('/videos')
    const menu = await openMenu(page)
    await page.goBack()
    await expect(menu).toBeHidden()
    await expect(page).toHaveURL(/\/videos$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Vídeos' })).toBeVisible()
  })

  test('Termos de uso e Política de privacidade ficam no rodapé do menu', async ({ page }) => {
    await page.goto('/imagens')
    let menu = await openMenu(page)
    await menu.getByRole('link', { name: 'Política de privacidade' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Tomou o lugar do menu no histórico: voltar leva à tela de antes.
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Imagens' })).toBeVisible()

    menu = await openMenu(page)
    await menu.getByRole('link', { name: 'Termos de uso' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible()
  })

  test('documento legal: o índice leva à seção, e o contato é um e-mail', async ({ page }) => {
    await page.goto('/termos')
    const toc = page.getByRole('navigation', { name: 'Neste documento' })
    await expect(toc.getByRole('listitem')).toHaveCount(13)
    await toc.getByRole('link', { name: /Contato/ }).click()
    await expect(page).toHaveURL(/\/termos#contato$/)
    const contact = page.getByRole('region', { name: /Contato/ })
    await expect(contact).toBeInViewport()
    // O link de contato abre o e-mail mostrado no texto.
    const mail = contact.getByRole('link', { name: /@/ })
    await expect(mail).toHaveAttribute('href', `mailto:${await mail.textContent()}`)
    await page.getByRole('main').getByRole('link', { name: 'Política de privacidade' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Seus direitos pela LGPD/ })).toBeVisible()
  })

  test('as licenças de código aberto ficam ligadas pelos Termos de uso', async ({ page }) => {
    await page.goto('/termos')
    await page.getByRole('link', { name: 'Licenças de código aberto' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Licenças de código aberto' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'licença LGPL' })).toHaveAttribute('href', '/licencas/lame-lgpl.txt')
    await expectNoAxeViolations(page)
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
    await expect(page.getByRole('heading', { level: 1, name: HOME_TITLE })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('ferramenta aberta por link direto: o voltar leva à lista do mesmo tipo', async ({ page }) => {
    await page.goto('/videos/comprimir')
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir vídeo' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Vídeos' })).toBeVisible()
    await expect(page).toHaveURL(/\/videos$/)
  })

  test('tela nova abre no topo, e o voltar devolve à tela anterior na mesma posição', async ({ page }) => {
    await page.goto('/')
    const gif = page.getByRole('main').getByRole('link', { name: /^Girar e espelhar/ })
    // Inteiro na tela antes de medir: assim o clique não precisa rolar a página.
    await gif.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    const before = await scrollY(page)
    test.skip(before === 0, 'nesta largura o início cabe inteiro na tela')

    await gif.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Girar e espelhar' })).toBeVisible()
    expect(await scrollY(page)).toBe(0)

    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: HOME_TITLE })).toBeVisible()
    await expect.poll(() => scrollY(page)).toBe(before)
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

test.describe('instalar o app', () => {
  test.describe('no iPhone', () => {
    test.use({ userAgent: IPHONE_UA })

    test('"Instalar app", no menu, mostra o passo a passo do Safari; o voltar fecha sem sair da tela', async ({ page }) => {
      await page.goto('/')
      const menu = await openMenu(page)
      await menu.getByRole('button', { name: 'Instalar app' }).click()

      const guide = page.getByRole('dialog', { name: 'Instalar o app' })
      await expect(guide).toBeVisible()
      await expect(guide).toContainText('Adicionar à Tela de Início')
      await expectNoAxeViolations(page)
      expect(await horizontalOverflow(page)).toBe(0)

      // Voltar do navegador (ou o gesto do Android) fecha o menu antes de sair do início.
      await page.goBack()
      await expect(guide).toBeHidden()
      await expect(page.getByRole('heading', { level: 1, name: HOME_TITLE })).toBeVisible()

      const again = await openMenu(page)
      await again.getByRole('button', { name: 'Instalar app' }).click()
      await page.getByRole('dialog', { name: 'Instalar o app' }).getByRole('button', { name: 'Entendi' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('banner').getByRole('button', { name: 'Menu' })).toBeFocused()
    })
  })

  test('sem o pedido do navegador, o menu explica como instalar pelo próprio navegador', async ({ page }) => {
    // Se o Chromium liberasse o pedido, "Instalar app" o abriria direto (conferido no teste do componente).
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (event) => event.stopImmediatePropagation())
    })
    await page.goto('/')
    const menu = await openMenu(page)
    await menu.getByRole('button', { name: 'Instalar app' }).click()
    await expect(page.getByRole('dialog', { name: 'Instalar o app' })).toContainText('Instalar')
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
    await expect(page.getByRole('heading', { level: 1, name: 'Imagens' })).toBeVisible()
    await expect(page.locator('#conteudo')).toBeFocused()
  })
})
