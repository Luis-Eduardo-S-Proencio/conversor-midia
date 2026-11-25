import { expect, test, type APIRequestContext } from '@playwright/test'

/** Largura e altura lidas do cabeçalho IHDR do PNG. */
async function pngSize(request: APIRequestContext, url: string): Promise<{ width: number; height: number }> {
  const response = await request.get(url)
  expect(response.ok(), url).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
  const bytes = await response.body()
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test.describe('PWA e ícones', () => {
  test('o manifesto descreve o app instalado', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'não depende da largura')
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    if (!href) throw new Error('link do manifesto ausente')

    const response = await request.get(href)
    expect(response.ok()).toBe(true)
    const manifest = (await response.json()) as {
      name: string
      lang: string
      display: string
      theme_color: string
      background_color: string
      icons: Array<{ src: string; sizes: string; purpose: string }>
    }

    expect(manifest).toMatchObject({
      name: 'Media Tools',
      lang: 'pt-BR',
      display: 'standalone',
      theme_color: '#0a0a0d',
      background_color: '#0a0a0d',
    })
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)

    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split('x').map(Number)
      expect(await pngSize(request, icon.src), icon.src).toEqual({ width, height })
    }
  })

  test('favicon, ícone da Apple e cor do tema estão publicados', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'não depende da largura')
    await page.goto('/')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0a0d')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')

    expect(await pngSize(request, '/apple-touch-icon.png')).toEqual({ width: 180, height: 180 })

    const svg = await request.get('/favicon.svg')
    expect(svg.ok()).toBe(true)
    expect(await svg.text()).toContain('<svg')

    const ico = await request.get('/favicon.ico')
    expect(ico.ok()).toBe(true)
    const icoBytes = await ico.body()
    expect([icoBytes[2], icoBytes[4], icoBytes[6]]).toEqual([1, 1, 32]) // ícone, 1 imagem, 32 px
  })
})
