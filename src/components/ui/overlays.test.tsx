import { useState, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { ToastProvider } from './Toast'
import { useToast } from './toast-context'

function SheetHarness({ onApply, onClose }: { onApply?: () => void; onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir velocidade</Button>
      <BottomSheet
        open={open}
        title="Velocidade"
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        onApply={
          onApply &&
          (() => {
            onApply()
            setOpen(false)
          })
        }
      >
        <p>Conteúdo do painel</p>
      </BottomSheet>
    </>
  )
}

/** Componentes de painel usam o histórico (voltar fecha): precisam de um roteador. */
function withRouter(element: ReactNode) {
  const router = createMemoryRouter([{ path: '/', element }], { initialEntries: ['/'] })
  return { router, screenPromise: render(<RouterProvider router={router} />) }
}

describe('BottomSheet', () => {
  it('abre como diálogo nomeado pelo título e fecha no ✕, devolvendo o foco', async () => {
    const onClose = vi.fn()
    const { screenPromise } = withRouter(<SheetHarness onClose={onClose} />)
    const screen = await screenPromise
    const opener = screen.getByRole('button', { name: 'Abrir velocidade' })
    await opener.click()

    const dialog = screen.getByRole('dialog', { name: 'Velocidade' })
    await expect.element(dialog).toBeVisible()
    await screen.getByRole('button', { name: 'Cancelar' }).click()

    expect(onClose).toHaveBeenCalledOnce()
    await expect.element(dialog).not.toBeInTheDocument()
    await expect.element(opener).toHaveFocus()
  })

  it('o ✓ aplica', async () => {
    const onApply = vi.fn()
    const { screenPromise } = withRouter(<SheetHarness onApply={onApply} />)
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Abrir velocidade' }).click()
    await screen.getByRole('button', { name: 'Aplicar' }).click()
    expect(onApply).toHaveBeenCalledOnce()
    await expect.element(screen.getByRole("dialog", { name: "Velocidade" })).not.toBeInTheDocument()
  })

  it('Esc fecha', async () => {
    const onClose = vi.fn()
    const { screenPromise } = withRouter(<SheetHarness onClose={onClose} />)
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Abrir velocidade' }).click()
    await expect.element(screen.getByRole('dialog', { name: 'Velocidade' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('o voltar (navegador ou gesto do Android) fecha o painel antes de sair da tela', async () => {
    const onClose = vi.fn()
    const { router, screenPromise } = withRouter(<SheetHarness onClose={onClose} />)
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Abrir velocidade' }).click()
    const dialog = screen.getByRole('dialog', { name: 'Velocidade' })
    await expect.element(dialog).toBeVisible()
    // Abrir empilhou um passo no histórico, no mesmo endereço.
    await vi.waitFor(() => expect(router.state.historyAction).toBe('PUSH'))

    await router.navigate(-1)
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    await expect.element(dialog).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('fechar pelo painel desfaz o passo do histórico', async () => {
    const { router, screenPromise } = withRouter(<SheetHarness />)
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Abrir velocidade' }).click()
    await vi.waitFor(() => expect(router.state.historyAction).toBe('PUSH'))
    await screen.getByRole('button', { name: 'Cancelar' }).click()
    await vi.waitFor(() => expect(router.state.historyAction).toBe('POP'))
  })
})

describe('ConfirmDialog', () => {
  function ConfirmHarness({ onConfirm }: { onConfirm: () => void }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Sair</Button>
        <ConfirmDialog
          open={open}
          title="Descartar edição?"
          description="As mudanças ainda não foram salvas."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          destructive
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            onConfirm()
            setOpen(false)
          }}
        />
      </>
    )
  }

  it('é um alerta com o foco na opção segura, e confirmar chama a ação', async () => {
    const onConfirm = vi.fn()
    const { screenPromise } = withRouter(<ConfirmHarness onConfirm={onConfirm} />)
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Sair' }).click()

    const dialog = screen.getByRole('alertdialog', { name: 'Descartar edição?' })
    await expect.element(dialog).toBeVisible()
    await expect.element(dialog).toHaveAccessibleDescription('As mudanças ainda não foram salvas.')
    await expect.element(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus()

    await screen.getByRole('button', { name: 'Descartar' }).click()
    expect(onConfirm).toHaveBeenCalledOnce()
    await expect.element(dialog).not.toBeInTheDocument()
  })
})

describe('Toast', () => {
  function ToastHarness({ onAction }: { onAction: () => void }) {
    const toast = useToast()
    return (
      <>
        <Button onClick={() => toast({ message: 'Pronto! Seu vídeo ficou 58% menor.', tone: 'success' })}>Sucesso</Button>
        <Button onClick={() => toast({ message: 'Nova versão disponível', action: { label: 'Atualizar', onClick: onAction } })}>
          Versão
        </Button>
      </>
    )
  }

  it('anuncia o aviso numa região viva (sem competir com o status da página) e o tira da tela sozinho', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const screen = await render(
        <ToastProvider>
          <ToastHarness onAction={() => {}} />
        </ToastProvider>,
      )
      await screen.getByRole('button', { name: 'Sucesso' }).click()
      const message = screen.getByText('Pronto! Seu vídeo ficou 58% menor.')
      await expect.element(message).toBeVisible()
      const region = document.querySelector('[data-toast-region]')
      expect(region?.getAttribute('aria-live')).toBe('polite')
      expect(region?.contains(message.element())).toBe(true)
      expect(screen.getByRole('status').elements()).toHaveLength(0)
      await vi.advanceTimersByTimeAsync(3100)
      await expect.element(message).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('aviso com ação fica até ser usado', async () => {
    const onAction = vi.fn()
    const screen = await render(
      <ToastProvider>
        <ToastHarness onAction={onAction} />
      </ToastProvider>,
    )
    await screen.getByRole('button', { name: 'Versão' }).click()
    await screen.getByRole('button', { name: 'Atualizar' }).click()
    expect(onAction).toHaveBeenCalledOnce()
    await expect.element(screen.getByText('Nova versão disponível')).not.toBeInTheDocument()
  })
})
