import { expect, test, type Page } from '@playwright/test'
import { fileInput } from './image-tool.ts'
import { OPEN_TIMEOUT, UNSUPPORTED_DECODING, canDecodeVideo, videoFixture } from './video-tool.ts'

// O editor de vídeo: trocar de ferramenta leva o vídeo aberto, sem escolher de novo.

const switcher = (page: Page) => page.getByRole('navigation', { name: 'Ferramentas de vídeo' })

async function open(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
}

test.describe('Editor de vídeo', () => {
  test('trocar de ferramenta leva o vídeo aberto, e a atual fica marcada', async ({ page }) => {
    await open(page, '/videos/converter', 'Converter vídeo')
    await expect(switcher(page).getByRole('link', { name: 'Converter' })).toHaveAttribute('aria-current', 'page')
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    await expect(page.getByRole('radiogroup', { name: 'Formato final' })).toBeVisible({ timeout: OPEN_TIMEOUT })

    await switcher(page).getByRole('link', { name: 'Áudio' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Extrair áudio' })).toBeVisible()
    await expect(switcher(page).getByRole('link', { name: 'Áudio' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('segundos.mp4', { exact: true }).first()).toBeVisible({ timeout: OPEN_TIMEOUT })
    await expect(page.getByRole('radiogroup', { name: 'Formato do áudio' })).toBeVisible({ timeout: OPEN_TIMEOUT })
  })

  test('do editor para o GIF e de volta, com o mesmo vídeo', async ({ page }) => {
    await open(page, '/videos/editar', 'Editar vídeo')
    test.skip(!(await canDecodeVideo(page)), UNSUPPORTED_DECODING)
    await fileInput(page).setInputFiles(videoFixture('segundos.mp4'))
    await expect(page.getByLabel('Vídeo segundos.mp4, como está ficando')).toBeVisible({ timeout: OPEN_TIMEOUT })

    await switcher(page).getByRole('link', { name: 'GIF' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Criar GIF' })).toBeVisible()
    await expect(page.getByText('segundos.mp4', { exact: true }).first()).toBeVisible({ timeout: OPEN_TIMEOUT })

    await switcher(page).getByRole('link', { name: 'Editar' }).click()
    await expect(page.getByLabel('Vídeo segundos.mp4, como está ficando')).toBeVisible({ timeout: OPEN_TIMEOUT })
  })

  test('sem vídeo aberto, trocar de ferramenta só muda de tela', async ({ page }) => {
    await open(page, '/videos/comprimir', 'Comprimir vídeo')
    await switcher(page).getByRole('link', { name: 'Recortar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Recortar vídeo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Selecionar vídeo' })).toBeVisible()
  })
})
