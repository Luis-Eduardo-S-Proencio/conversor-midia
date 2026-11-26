import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { Accordion } from './Accordion'

const ITEMS = [
  { id: 'a', title: 'Meus arquivos vão para algum servidor?', content: <p>Não. Tudo acontece no aparelho.</p> },
  { id: 'b', title: 'Funciona sem internet?', content: <p>Depois da primeira visita.</p> },
]

describe('Accordion', () => {
  it('cada pergunta é um botão que abre e fecha a resposta, anunciando o estado', async () => {
    const screen = await render(<Accordion items={ITEMS} />)
    const question = screen.getByRole('button', { name: 'Meus arquivos vão para algum servidor?' })
    await expect.element(question).toHaveAttribute('aria-expanded', 'false')
    // Fechada, a resposta fica inerte: fora do Tab e do leitor de tela.
    expect(screen.getByText('Não. Tudo acontece no aparelho.').element().closest('[inert]')).not.toBeNull()

    await question.click()
    await expect.element(question).toHaveAttribute('aria-expanded', 'true')
    const region = screen.getByRole('region', { name: 'Meus arquivos vão para algum servidor?' })
    await expect.element(region).toBeVisible()
    expect(region.element().hasAttribute('inert')).toBe(false)

    await question.click()
    await expect.element(question).toHaveAttribute('aria-expanded', 'false')
  })

  it('as perguntas ficam em títulos de nível 3, para navegar pelo leitor de tela', async () => {
    const screen = await render(<Accordion items={ITEMS} />)
    expect(screen.getByRole('heading', { level: 3 }).elements()).toHaveLength(2)
  })
})
