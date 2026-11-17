import { X } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { Button, IconButton } from './Button'

describe('Button', () => {
  it('é um botão comum com o texto como nome', async () => {
    const onClick = vi.fn()
    const screen = await render(<Button onClick={onClick}>Converter</Button>)
    const button = screen.getByRole('button', { name: 'Converter' })

    await expect.element(button).toHaveAttribute('type', 'button')
    await button.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('em carregamento anuncia ocupado e ignora cliques', async () => {
    const onClick = vi.fn()
    const screen = await render(
      <Button loading onClick={onClick}>
        Convertendo…
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Convertendo…' })

    await expect.element(button).toHaveAttribute('aria-busy', 'true')
    await expect.element(button).toHaveAttribute('aria-disabled', 'true')
    button.element().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('desativado não dispara a ação', async () => {
    const screen = await render(<Button disabled>Desativado</Button>)
    await expect.element(screen.getByRole('button', { name: 'Desativado' })).toBeDisabled()
  })
})

describe('IconButton', () => {
  it('usa o rótulo como nome acessível, já que não tem texto', async () => {
    const screen = await render(<IconButton icon={X} label="Remover arquivo" />)
    await expect.element(screen.getByRole('button', { name: 'Remover arquivo' })).toBeVisible()
  })

  it('expõe o estado de alternância', async () => {
    const screen = await render(<IconButton icon={X} label="Manter proporção" aria-pressed />)
    await expect.element(screen.getByRole('button', { name: 'Manter proporção' })).toHaveAttribute('aria-pressed', 'true')
  })
})
