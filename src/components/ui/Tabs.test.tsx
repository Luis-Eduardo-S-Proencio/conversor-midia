import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Tabs } from './Tabs'

type Tab = 'layout' | 'border' | 'photos'

function Harness() {
  const [tab, setTab] = useState<Tab>('layout')
  return (
    <Tabs<Tab>
      label="Opções da colagem"
      value={tab}
      onChange={setTab}
      items={[
        { value: 'layout', label: 'Layout', content: <button type="button">Modelo</button> },
        { value: 'border', label: 'Borda', content: <p>Espessura</p> },
        { value: 'photos', label: 'Fotos', content: <p>Lista de fotos</p> },
      ]}
    />
  )
}

describe('Tabs', () => {
  it('mostra só o painel da aba aberta, ligado a ela', async () => {
    const screen = await render(<Harness />)
    const layout = screen.getByRole('tab', { name: 'Layout' })
    await expect.element(layout).toHaveAttribute('aria-selected', 'true')
    await expect.element(screen.getByRole('tabpanel', { name: 'Layout' })).toHaveTextContent('Modelo')
    expect(screen.getByText('Espessura').elements()).toHaveLength(0)

    await screen.getByRole('tab', { name: 'Borda' }).click()
    await expect.element(screen.getByRole('tabpanel', { name: 'Borda' })).toHaveTextContent('Espessura')
    await expect.element(layout).toHaveAttribute('aria-selected', 'false')
  })

  it('pelo teclado: Tab entra só na aba aberta e as setas trocam de aba, dando a volta', async () => {
    const screen = await render(<Harness />)
    await userEvent.keyboard('{Tab}')
    await expect.element(screen.getByRole('tab', { name: 'Layout' })).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    await expect.element(screen.getByRole('tab', { name: 'Fotos' })).toHaveFocus()
    await expect.element(screen.getByRole('tab', { name: 'Fotos' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Home}')
    await expect.element(screen.getByRole('tab', { name: 'Layout' })).toHaveFocus()
    // O próximo Tab sai das abas e vai para o painel.
    await userEvent.keyboard('{Tab}')
    await expect.element(screen.getByRole('button', { name: 'Modelo' })).toHaveFocus()
  })
})
