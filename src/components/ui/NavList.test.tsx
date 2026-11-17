import { Crop, Scaling } from 'lucide-react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { NavList } from './NavList'

function withRouter(ui: ReactNode) {
  return <RouterProvider router={createMemoryRouter([{ path: '/', element: ui }])} />
}

describe('NavList', () => {
  it('item com destino é link; item sem destino mostra "Em breve" e não é link', async () => {
    const screen = await render(
      withRouter(
        <NavList
          items={[
            { id: 'resize', title: 'Redimensionar imagem', description: 'Largura e altura', icon: Scaling, to: '/imagens/redimensionar' },
            { id: 'crop', title: 'Recortar imagem', description: 'Área que importa', icon: Crop },
          ]}
        />,
      ),
    )

    await expect
      .element(screen.getByRole('link', { name: /Redimensionar imagem/ }))
      .toHaveAttribute('href', '/imagens/redimensionar')
    expect(screen.getByRole('link', { name: /Recortar imagem/ }).elements()).toHaveLength(0)
    await expect.element(screen.getByText('Em breve')).toBeVisible()
  })

  it('é uma lista com um item por ferramenta', async () => {
    const screen = await render(
      withRouter(
        <NavList
          items={[
            { id: 'a', title: 'A', description: 'a', icon: Crop },
            { id: 'b', title: 'B', description: 'b', icon: Crop },
            { id: 'c', title: 'C', description: 'c', icon: Crop },
          ]}
          columns={2}
        />,
      ),
    )
    expect(screen.getByRole('listitem').elements()).toHaveLength(3)
  })
})
