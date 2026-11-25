import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AppMenu } from './AppMenu'

function renderMenu() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <header className="flex justify-end">
              <AppMenu />
            </header>
            {/* Bem abaixo do painel aberto: tocar aqui é tocar fora do menu. */}
            <p className="mt-80">Conteúdo da página</p>
          </>
        ),
      },
      { path: '/sobre', element: <h1>Sobre o Media Tools</h1> },
    ],
    { initialEntries: ['/'] },
  )
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

/** O Chromium avisando que o app pode ser instalado, com o pedido que o site abre pelo próprio botão. */
function offerInstall(outcome: 'accepted' | 'dismissed') {
  const prompt = vi.fn(() => Promise.resolve())
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  })
  window.dispatchEvent(event)
  return { event, prompt }
}

// O estado da instalação é do módulo (como numa visita real): os testes que mexem nele vêm por último.
describe('AppMenu', () => {
  it('abre pelo botão e fecha com Esc (o foco volta ao botão) e ao tocar fora', async () => {
    const screen = await renderMenu().screenPromise
    const button = screen.getByRole('button', { name: 'Mais opções' })
    await expect.element(button).toHaveAttribute('aria-expanded', 'false')

    await button.click()
    await expect.element(button).toHaveAttribute('aria-expanded', 'true')
    await expect.element(screen.getByRole('button', { name: 'Instalar o app' })).toBeVisible()
    await expect.element(screen.getByRole('link', { name: 'Sobre o Media Tools' })).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await expect.element(button).toHaveAttribute('aria-expanded', 'false')
    await expect.element(button).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Sobre o Media Tools' }).elements()).toHaveLength(0)

    await button.click()
    await screen.getByText('Conteúdo da página').click()
    await expect.element(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('o Tab percorre os itens, e sair da lista fecha o menu', async () => {
    const screen = await renderMenu().screenPromise
    const button = screen.getByRole('button', { name: 'Mais opções' })
    await button.click()

    await userEvent.tab()
    await expect.element(screen.getByRole('button', { name: 'Instalar o app' })).toHaveFocus()
    await userEvent.tab()
    await expect.element(screen.getByRole('link', { name: 'Sobre o Media Tools' })).toHaveFocus()
    await userEvent.tab()
    await expect.element(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Sobre o Media Tools" leva à página Sobre', async () => {
    const { router, screenPromise } = renderMenu()
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Mais opções' }).click()
    await screen.getByRole('link', { name: 'Sobre o Media Tools' }).click()

    await expect.element(screen.getByRole('heading', { name: 'Sobre o Media Tools' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/sobre')
  })

  it('sem o pedido do navegador, "Instalar o app" mostra como instalar pelo menu dele', async () => {
    const screen = await renderMenu().screenPromise
    const button = screen.getByRole('button', { name: 'Mais opções' })
    await button.click()
    await screen.getByRole('button', { name: 'Instalar o app' }).click()

    const dialog = screen.getByRole('dialog', { name: 'Instalar o app' })
    await expect.element(dialog).toBeVisible()
    await expect.element(dialog.getByText('iPhone e iPad')).toBeVisible()
    await expect.element(dialog.getByText(/Adicionar à Tela de Início/)).toBeVisible()
    await expect.element(dialog.getByText('Android')).toBeVisible()
    await expect.element(button).toHaveAttribute('aria-expanded', 'false')

    await dialog.getByRole('button', { name: 'Entendi' }).click()
    await expect.element(dialog).not.toBeInTheDocument()
    await expect.element(button).toHaveFocus()

    // Esc também fecha, e o foco volta ao botão do menu.
    await button.click()
    await screen.getByRole('button', { name: 'Instalar o app' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Instalar o app' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect.element(screen.getByRole('dialog', { name: 'Instalar o app' })).not.toBeInTheDocument()
    await expect.element(button).toHaveFocus()
  })

  it('com o pedido do Chromium, "Instalar o app" o abre direto; recusado, voltam as instruções', async () => {
    const declined = offerInstall('dismissed')
    expect(declined.event.defaultPrevented).toBe(true) // a faixa automática do Chrome não cobre as abas

    const screen = await renderMenu().screenPromise
    const button = screen.getByRole('button', { name: 'Mais opções' })
    await button.click()
    await screen.getByRole('button', { name: 'Instalar o app' }).click()
    expect(declined.prompt).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog').elements()).toHaveLength(0)
    await expect.element(button).toHaveFocus() // o pedido fechou: o foco não fica perdido na página

    // Cada pedido abre uma vez: depois de recusado, o item explica como instalar pelo navegador.
    await button.click()
    await screen.getByRole('button', { name: 'Instalar o app' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Instalar o app' })).toBeVisible()
    expect(declined.prompt).toHaveBeenCalledOnce()
    await screen.getByRole('button', { name: 'Entendi' }).click()
  })

  it('aceito o pedido, o app instalado tira o item do menu', async () => {
    const accepted = offerInstall('accepted')
    const screen = await renderMenu().screenPromise
    const button = screen.getByRole('button', { name: 'Mais opções' })
    await button.click()
    await screen.getByRole('button', { name: 'Instalar o app' }).click()
    expect(accepted.prompt).toHaveBeenCalledOnce()

    window.dispatchEvent(new Event('appinstalled'))
    await button.click()
    await expect.element(screen.getByRole('link', { name: 'Sobre o Media Tools' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Instalar o app' }).elements()).toHaveLength(0)
  })
})
