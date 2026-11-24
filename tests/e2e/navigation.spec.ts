import { expect, test } from '@playwright/test'

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

  test('"Como funciona" leva à explicação do processamento local', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Como funciona' }).click()

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

  test('a vitrine de componentes não existe no build de produção', async ({ page }) => {
    await page.goto('/design-system')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
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

    await page.keyboard.press('Tab')
    await expect(page.getByRole('main').getByRole('link').first()).toBeFocused()
  })

  test('ao trocar de página, o foco vai para o conteúdo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^Imagens/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ferramentas de imagem' })).toBeVisible()
    await expect(page.locator('#conteudo')).toBeFocused()
  })
})
