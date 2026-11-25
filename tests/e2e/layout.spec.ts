import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES } from './routes.ts'

for (const route of PUBLIC_ROUTES) {
  test(`${route.path}: título visível e sem rolagem horizontal`, async ({ page }, testInfo) => {
    await page.goto(route.path)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)

    // Capturas para revisão visual (ficam em test-results/, fora do Git).
    const name = route.path === '/' ? 'inicio' : route.path.slice(1)
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
  })
}

test('reflow em 320 px sem rolagem horizontal (WCAG 1.4.10)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'largura mínima do critério')
  await page.setViewportSize({ width: 320, height: 640 })

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route.path)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, route.path).toBe(0)
  }
})

test('alvos de toque têm pelo menos 44 px no celular', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'regra de toque')

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route.path)
    // Páginas carregadas sob demanda (ferramentas, Sobre): conferir depois que o conteúdo aparece.
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, [role="radio"]')]
        // Links dentro de frases são exceção da WCAG 2.5.8; elementos ocultos não contam.
        .filter((element) => !element.closest('p') && element.getClientRects().length > 0)
        .map((element) => ({ text: element.textContent?.trim() ?? '', height: element.getBoundingClientRect().height }))
        .filter(({ height }) => height > 1 && height < 44),
    )
    expect(small, `alvos pequenos em ${route.path}`).toEqual([])
  }
})

test('nenhuma requisição sai do próprio site (fontes e ícones hospedados localmente)', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(baseURL ?? '') && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url)
  })

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route.path)
    await page.waitForLoadState('networkidle')
  }
  expect(external).toEqual([])
})
