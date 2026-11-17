import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES, WCAG_TAGS } from './routes.ts'

for (const route of PUBLIC_ROUTES) {
  test(`${route.path}: sem violações automáticas de acessibilidade`, async ({ page }) => {
    await page.goto(route.path)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const violations = results.violations.map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    )
    expect(violations).toEqual([])
  })
}
