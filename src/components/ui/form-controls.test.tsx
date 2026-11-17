import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Field } from './Field'
import { Input } from './Input'
import { Slider } from './Slider'

describe('Field', () => {
  it('liga rótulo, dica e erro ao controle', async () => {
    const screen = await render(
      <Field label="Nome do arquivo" hint="A extensão é adicionada automaticamente." error="Use apenas letras e números.">
        {(control) => <Input {...control} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Nome do arquivo' })

    await expect.element(input).toHaveAttribute('aria-invalid', 'true')
    await expect.element(input).toHaveAccessibleDescription(
      'Use apenas letras e números. A extensão é adicionada automaticamente.',
    )
  })

  it('não marca inválido sem erro', async () => {
    const screen = await render(<Field label="Largura">{(control) => <Input {...control} />}</Field>)
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).not.toHaveAttribute('aria-invalid')
  })
})

describe('Input', () => {
  it('anuncia a unidade como descrição', async () => {
    const screen = await render(<Field label="Largura">{(control) => <Input {...control} unit="px" />}</Field>)
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toHaveAccessibleDescription('px')
  })
})

function QualityHarness() {
  const [quality, setQuality] = useState(80)
  return <Slider label="Qualidade" value={quality} onChange={setQuality} formatValue={(value) => `${value}%`} />
}

describe('Slider', () => {
  it('é rotulado e anuncia o valor formatado', async () => {
    const screen = await render(<QualityHarness />)
    const slider = screen.getByRole('slider', { name: 'Qualidade' })

    await expect.element(slider).toHaveAttribute('aria-valuetext', '80%')
    await expect.element(screen.getByText('80%')).toBeVisible()
  })

  it('responde ao teclado e atualiza o valor exibido', async () => {
    const screen = await render(<QualityHarness />)
    const slider = screen.getByRole('slider', { name: 'Qualidade' })
    slider.element().focus()

    await userEvent.keyboard('{End}')
    await expect.element(slider).toHaveAttribute('aria-valuetext', '100%')
    await userEvent.keyboard('{ArrowLeft}')
    await expect.element(slider).toHaveAttribute('aria-valuetext', '99%')
  })
})
