import { expect, test } from '@playwright/test'
import { fixture } from './image-tool.ts'
import { videoFixture } from './video-tool.ts'

// A prévia local serve os cabeçalhos do vercel.json (ver vite.config.ts): o que passa aqui
// é o que vai para produção.

test.describe('cabeçalhos de segurança', () => {
  test('páginas e arquivos saem com CSP restritiva e demais cabeçalhos', async ({ page, request }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['content-security-policy']).toContain("object-src 'none'")
    // O player mostra o vídeo escolhido por URL temporária (blob:), e só ela além do próprio site.
    expect(headers['content-security-policy']).toContain("media-src 'self' blob:")
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=()')

    const html = await (await request.get('/imagens/converter')).text()
    expect(html).toContain('<div id="root">') // rota profunda servida pelo fallback de SPA

    // Scripts saem de /assets, como o do Worker: a mesma política vale dentro dele.
    const script = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1]
    expect(script).toBeDefined()
    const asset = await request.get(script ?? '')
    expect(asset.headers()['content-security-policy']).toContain("default-src 'self'")
    expect(asset.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('o fluxo completo roda sem nenhuma violação de CSP', async ({ page }) => {
    const violations: string[] = []
    page.on('console', (message) => {
      const text = message.text()
      if (/Content[- ]Security[- ]Policy|Refused to/i.test(text)) violations.push(text)
    })
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`Content-Security-Policy: ${event.violatedDirective} bloqueou ${event.blockedURI}`)
      })
    })

    await page.goto('/')
    await page.getByRole('link', { name: /Converter imagem/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Converter imagem' })).toBeVisible()
    await page.locator('input[type="file"]').first().setInputFiles([fixture('quadrantes.png'), fixture('foto.jpg')])
    await expect(page.getByRole('button', { name: 'Converter 2 imagens', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Converter 2 imagens', exact: true }).click()
    await expect(page.getByRole('heading', { name: '2 imagens convertidas' })).toBeVisible()

    // O ZIP carrega o fflate dentro do Worker: confere também a política do Worker.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Baixar todas (.zip)', exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toBe('imagens-convertidas.zip')

    // Comprimir: mesma base, com o código da ferramenta carregado sob demanda.
    await page.goto('/imagens/comprimir')
    await page.locator('input[type="file"]').first().setInputFiles(fixture('foto.jpg'))
    await page.getByRole('button', { name: 'Comprimir', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Imagem comprimida' })).toBeVisible()

    // Vídeo: o player carrega o vídeo escolhido (media-src blob:) e o Worker de vídeo processa.
    await page.goto('/videos/cortar')
    await page.locator('input[type="file"]').first().setInputFiles(videoFixture('segundos.mp4'))
    const player = page.locator('video')
    await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1)
    await page.getByRole('textbox', { name: 'Início' }).fill('0:01,00')
    await page.getByRole('button', { name: 'Cortar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Vídeo cortado' })).toBeVisible()
    expect(violations).toEqual([])
  })
})
