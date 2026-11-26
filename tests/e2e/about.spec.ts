import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './image-tool.ts'
import { horizontalOverflow } from './video-tool.ts'

// Sobre: app (versão, compartilhar), privacidade, formatos, limites e perguntas. Sem créditos e licenças,
// que ficam numa página própria, ligada pelo rodapé do menu.

test.describe('Sobre', () => {
  test('mostra o app com a versão, e as perguntas abrem e fecham', async ({ page }) => {
    await page.goto('/sobre')
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre' })).toBeVisible()
    await expect(page.getByText(/^Versão \d+\.\d+\.\d+$/)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Privacidade', 'Formatos', 'Limites', 'Perguntas frequentes'])
    await expect(page.getByText(/Créditos|licença/i)).toHaveCount(0)

    const question = page.getByRole('button', { name: 'Meus arquivos vão para algum servidor?' })
    await expect(question).toHaveAttribute('aria-expanded', 'false')
    await question.click()
    await expect(question).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('region', { name: 'Meus arquivos vão para algum servidor?' })).toContainText('Não.')
    await expectNoAxeViolations(page)
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('Compartilhar oferece o endereço do app (ou copia o link)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => {
      // Sem a folha do sistema (como no computador): cai no copiar o link.
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/sobre')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect(page.getByText('Link copiado.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/', page.url()).href)
  })

  test('formatos e limites vêm do que as ferramentas aceitam', async ({ page }) => {
    await page.goto('/sobre')
    const formats = page.getByRole('region', { name: 'Formatos' })
    await expect(formats.getByRole('definition').first()).toHaveText('JPG, PNG e WEBP')
    await expect(page.getByRole('region', { name: 'Limites' }).getByText('até 1 GB, um por vez')).toBeVisible()
  })
})
