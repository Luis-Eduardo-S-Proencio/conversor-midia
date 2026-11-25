import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

test.describe('navegação', () => {
  test('o menu leva às páginas e marca a atual', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav).toHaveCount(1) // só um menu visível por largura

    await nav.getByRole('link', { name: 'Imagens' }).click()

    await expect(page).toHaveURL(/\/imagens$/)
    await expect(page).toHaveTitle('Imagens · Media Tools')
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Imagens' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  test('o menu fica na lateral esquerda a partir de 768 px e embaixo no celular', async ({ page }, testInfo) => {
    await page.goto('/')
    const box = await page.getByRole('navigation', { name: 'Principal' }).boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error('menu ou viewport ausente')

    if (testInfo.project.name === 'mobile') {
      expect(Math.round(box.y + box.height)).toBe(viewport.height)
    } else {
      expect(box.x).toBeLessThan(10)
      expect(box.y).toBeLessThan(200)
    }
  })

  test('no celular a barra inferior não cobre o fim da página', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'só existe barra inferior no celular')
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    const footerLine = await page.getByText(/© \d{4} Media Tools/).boundingBox()
    const nav = await page.getByRole('navigation', { name: 'Principal' }).boundingBox()
    if (!footerLine || !nav) throw new Error('rodapé ou menu ausente')
    expect(footerLine.y + footerLine.height).toBeLessThanOrEqual(nav.y)
  })

  test('o menu principal leva a Início, Imagens e Vídeos; o Sobre fica no rodapé', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link')).toHaveText(['Início', 'Imagens', 'Vídeos'])

    await page.getByRole('navigation', { name: 'Rodapé' }).getByRole('link', { name: 'Sobre', exact: true }).click()
    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre o Media Tools' })).toBeVisible()
  })

  test('"Processamento local", no rodapé, leva à explicação', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Rodapé' }).getByRole('link', { name: 'Processamento local' }).click()

    await expect(page).toHaveURL(/\/sobre#processamento-local$/)
    const section = page.getByRole('heading', { name: 'Processamento local' })
    await expect(section).toBeInViewport()
    await expect(section).toBeFocused() // o leitor de tela começa pela seção pedida
  })

  test('no alto contraste do Windows o item ativo continua identificável', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/imagens')
    const active = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Imagens' })
    await expect(active).toHaveCSS('text-decoration-line', 'underline')
  })

  test('endereço inexistente mostra página própria, com caminho de volta', async ({ page }) => {
    await page.goto('/endereco-que-nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()

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

test.describe('celular: menu "Mais opções" do cabeçalho', () => {
  test.skip(({ isMobile }) => !isMobile, 'a partir de 768 px o cabeçalho é a barra lateral, sem este menu')

  test.beforeEach(async ({ page }) => {
    // Se o Chromium liberar o pedido de instalação, ele vai para o próprio navegador; aqui vale o caminho
    // de quem não o tem (Safari, Firefox): as instruções. O pedido é conferido no teste do componente.
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (event) => event.stopImmediatePropagation())
    })
  })

  test('leva ao Sobre e explica como instalar o app', async ({ page }) => {
    await page.goto('/')
    const menu = page.getByRole('banner').getByRole('button', { name: 'Mais opções' })
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expectNoAxeViolations(page) // menu aberto

    await page.getByRole('link', { name: 'Sobre o Media Tools' }).click()
    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre o Media Tools' })).toBeVisible()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')

    await menu.click()
    await page.getByRole('button', { name: 'Instalar o app' }).click()
    const dialog = page.getByRole('dialog', { name: 'Instalar o app' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Adicionar à Tela de Início')
    await expectNoAxeViolations(page) // instruções abertas
    expect(await horizontalOverflow(page)).toBe(0)

    await dialog.getByRole('button', { name: 'Entendi' }).click()
    await expect(dialog).toBeHidden()
    await expect(menu).toBeFocused()
  })

  test('também nas ferramentas, sem sair da tela', async ({ page }) => {
    await page.goto('/videos/editar')
    await expect(page.getByRole('heading', { level: 1, name: 'Editar vídeo' })).toBeVisible()
    await page.getByRole('banner').getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('button', { name: 'Instalar o app' }).click()

    await expect(page.getByRole('dialog', { name: 'Instalar o app' })).toBeVisible()
    await expect(page).toHaveURL(/\/videos\/editar$/)
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
    await page.getByRole('link', { name: /^Imagens/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
    await expect(page.locator('#conteudo')).toBeFocused()
  })
})
