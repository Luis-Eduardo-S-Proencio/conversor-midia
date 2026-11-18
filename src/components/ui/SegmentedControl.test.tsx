import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { SegmentedControl, type SegmentedOption } from './SegmentedControl'

type Format = 'jpg' | 'png' | 'webp'

const OPTIONS: readonly SegmentedOption<Format>[] = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
]

function Harness({ initial = 'png', onChange }: { initial?: Format; onChange?: (value: Format) => void }) {
  const [value, setValue] = useState<Format>(initial)
  return (
    <SegmentedControl
      label="Converter para"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('SegmentedControl', () => {
  it('é um grupo de rádio rotulado com a opção atual marcada', async () => {
    const screen = await render(<Harness />)
    await expect.element(screen.getByRole('radiogroup', { name: 'Converter para' })).toBeVisible()
    await expect.element(screen.getByRole('radio', { name: 'PNG' })).toBeChecked()
    await expect.element(screen.getByRole('radio', { name: 'JPG' })).not.toBeChecked()
  })

  it('deixa só a opção marcada na ordem do Tab', async () => {
    const screen = await render(<Harness />)
    await expect.element(screen.getByRole('radio', { name: 'PNG' })).toHaveAttribute('tabindex', '0')
    await expect.element(screen.getByRole('radio', { name: 'JPG' })).toHaveAttribute('tabindex', '-1')
  })

  it('muda a seleção com as setas, circulando nas pontas', async () => {
    const onChange = vi.fn()
    const screen = await render(<Harness onChange={onChange} />)
    await screen.getByRole('radio', { name: 'PNG' }).click()

    await userEvent.keyboard('{ArrowRight}')
    await expect.element(screen.getByRole('radio', { name: 'WEBP' })).toBeChecked()
    await expect.element(screen.getByRole('radio', { name: 'WEBP' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    await expect.element(screen.getByRole('radio', { name: 'JPG' })).toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith('jpg')
  })

  it('clicar na opção já marcada não avisa mudança, como no rádio nativo', async () => {
    const onChange = vi.fn()
    const screen = await render(<Harness onChange={onChange} />)
    await screen.getByRole('radio', { name: 'PNG' }).click()
    await expect.element(screen.getByRole('radio', { name: 'PNG' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('vai ao início e ao fim com Home e End', async () => {
    const screen = await render(<Harness />)
    await screen.getByRole('radio', { name: 'PNG' }).click()

    await userEvent.keyboard('{End}')
    await expect.element(screen.getByRole('radio', { name: 'WEBP' })).toBeChecked()
    await userEvent.keyboard('{Home}')
    await expect.element(screen.getByRole('radio', { name: 'JPG' })).toBeChecked()
  })

  it('com muitas opções, quebra em linhas de quatro', async () => {
    const options = ['a', 'b', 'c', 'd', 'e', 'f'].map((value) => ({ value, label: value.toUpperCase() }))
    const screen = await render(<SegmentedControl label="Formato" options={options} value="a" onChange={() => {}} columns={4} />)
    const [first, , , , fifth] = screen.getByRole('radio').elements().map((radio) => radio.getBoundingClientRect())
    expect(fifth?.left).toBe(first?.left) // a quinta opção começa a segunda linha
    expect(fifth?.top).toBeGreaterThan(first?.top ?? 0)
  })

  it('pula opções desativadas', async () => {
    const screen = await render(
      <SegmentedControl
        label="Formato"
        options={[OPTIONS[0]!, { value: 'png', label: 'PNG', disabled: true }, OPTIONS[2]!]}
        value="jpg"
        onChange={() => {}}
      />,
    )
    await screen.getByRole('radio', { name: 'JPG' }).click()
    await userEvent.keyboard('{ArrowRight}')
    await expect.element(screen.getByRole('radio', { name: 'WEBP' })).toHaveFocus()
  })
})
