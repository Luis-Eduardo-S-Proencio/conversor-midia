import { Crop, Minimize2 } from 'lucide-react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { ToolSwitcher, type SwitcherTool } from './ToolSwitcher'

const TOOLS: SwitcherTool[] = [
  { id: 'compress', to: '/imagens/comprimir', label: 'Comprimir', icon: Minimize2, tone: 'compress' },
  { id: 'crop', to: '/imagens/recortar', label: 'Recortar', icon: Crop, tone: 'crop' },
]

function renderSwitcher(switched: string[]) {
  const element = <ToolSwitcher label="Ferramentas de imagem" tools={TOOLS} onSwitch={(tool) => switched.push(tool.id)} />
  const router = createMemoryRouter(
    [
      { path: '/imagens/comprimir', element },
      { path: '/imagens/recortar', element: <h1>Recortar imagem</h1> },
    ],
    { initialEntries: ['/imagens/comprimir'] },
  )
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

describe('ToolSwitcher', () => {
  it('marca a ferramenta atual e leva às outras avisando antes de sair', async () => {
    const switched: string[] = []
    const { router, screenPromise } = renderSwitcher(switched)
    const screen = await screenPromise
    const nav = screen.getByRole('navigation', { name: 'Ferramentas de imagem' })

    await expect.element(nav.getByRole('link', { name: 'Comprimir' })).toHaveAttribute('aria-current', 'page')
    await expect.element(nav.getByRole('link', { name: 'Recortar' })).not.toHaveAttribute('aria-current')

    await nav.getByRole('link', { name: 'Recortar' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Recortar imagem' })).toBeVisible()
    expect(switched).toEqual(['crop'])
    expect(router.state.location.pathname).toBe('/imagens/recortar')
  })

  it('tocar na ferramenta atual não recarrega a tela nem leva arquivos a lugar algum', async () => {
    const switched: string[] = []
    const { router, screenPromise } = renderSwitcher(switched)
    const screen = await screenPromise

    await screen.getByRole('link', { name: 'Comprimir' }).click()
    expect(switched).toEqual([])
    expect(router.state.historyAction).toBe('POP') // nenhuma navegação nova
  })
})
