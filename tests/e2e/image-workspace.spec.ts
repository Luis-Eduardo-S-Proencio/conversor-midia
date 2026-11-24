import { expect, test, type Page } from '@playwright/test'
import { fileInput, fixture, openImageTool } from './image-tool.ts'

// O editor de imagens: troca de ferramenta sem escolher as imagens de novo e prévia grande
// da imagem escolhida quando há várias.

const switcher = (page: Page) => page.getByRole('navigation', { name: 'Ferramentas de imagem' })
const listed = (page: Page, name: string) => page.getByText(name, { exact: true }).first()

test.describe('Editor de imagens', () => {
  test('trocar de ferramenta leva as imagens abertas, e a atual fica marcada', async ({ page }) => {
    await openImageTool(page, '/imagens/converter', 'Converter imagem')
    await expect(switcher(page).getByRole('link', { name: 'Converter' })).toHaveAttribute('aria-current', 'page')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()

    await switcher(page).getByRole('link', { name: 'Comprimir' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Comprimir imagem' })).toBeVisible()
    await expect(switcher(page).getByRole('link', { name: 'Comprimir' })).toHaveAttribute('aria-current', 'page')
    await expect(listed(page, 'foto.jpg')).toBeVisible()
    await expect(listed(page, 'quadrantes.png')).toBeVisible()

    // Tocar de novo na ferramenta atual não recarrega nem perde as imagens.
    await switcher(page).getByRole('link', { name: 'Comprimir' }).click()
    await expect(listed(page, 'quadrantes.png')).toBeVisible()
  })

  test('várias imagens: a miniatura escolhe qual aparece grande', async ({ page }) => {
    await openImageTool(page, '/imagens/redimensionar', 'Redimensionar imagem')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mostrar foto.jpg' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Mostrar quadrantes.png' }).click()
    await expect(page.getByRole('img', { name: 'Pré-visualização de quadrantes.png' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mostrar quadrantes.png' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('de uma imagem por vez para o lote e de volta: o Recortar fica com a primeira', async ({ page }) => {
    await openImageTool(page, '/imagens/girar', 'Girar e espelhar')
    await fileInput(page).setInputFiles([fixture('foto.jpg'), fixture('quadrantes.png')])
    await expect(listed(page, 'quadrantes.png')).toBeVisible()

    await switcher(page).getByRole('link', { name: 'Recortar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Recortar imagem' })).toBeVisible()
    await expect(listed(page, 'foto.jpg')).toBeVisible()
    await expect(page.getByText('quadrantes.png', { exact: true })).toHaveCount(0)
  })

  test('no celular a fileira de ferramentas já mostra a atual', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'fileira que rola só existe em telas estreitas')
    await openImageTool(page, '/imagens/girar', 'Girar e espelhar')
    await page.evaluate(() => document.fonts.ready)
    await expect(switcher(page).getByRole('link', { name: 'Girar' })).toBeInViewport({ ratio: 1 })
  })
})
