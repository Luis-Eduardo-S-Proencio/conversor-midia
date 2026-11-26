import { Film } from 'lucide-react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Button } from './Button'
import { Chip } from './Chip'
import { MetaChips } from './MetaChips'
import { ProgressRing } from './ProgressRing'
import { Slider } from './Slider'
import { ToolIcon } from './ToolIcon'

describe('Button carregando', () => {
  it('sem ícone, mantém a largura e o nome enquanto carrega', async () => {
    function Harness() {
      const [loading, setLoading] = useState(false)
      return (
        <Button loading={loading} onClick={() => setLoading(true)}>
          Comprimir vídeo
        </Button>
      )
    }
    const screen = await render(<Harness />)
    // A largura muda quando a Inter termina de carregar: mede depois.
    await document.fonts.ready
    const button = screen.getByRole('button', { name: 'Comprimir vídeo' })
    const before = button.element().getBoundingClientRect().width
    await button.click()
    await expect.element(button).toHaveAttribute('aria-busy', 'true')
    expect(button.element().getBoundingClientRect().width).toBe(before)
  })

  it('desligado fica com 40% de opacidade e cursor de proibido', async () => {
    const screen = await render(<Button variant="primary">Salvar vídeo</Button>)
    const style = getComputedStyle(screen.getByRole('button').element())
    expect(style.opacity).toBe('1')
    screen.rerender(
      <Button variant="primary" disabled>
        Salvar vídeo
      </Button>,
    )
    await expect.element(screen.getByRole('button')).toBeDisabled()
    // A opacidade muda com transição: espera ela terminar.
    await vi.waitFor(() => {
      const disabled = getComputedStyle(screen.getByRole('button').element())
      expect(disabled.opacity).toBe('0.4')
      expect(disabled.cursor).toBe('not-allowed')
    })
  })
})

describe('Chip', () => {
  it('de alternância anuncia se está selecionado', async () => {
    const screen = await render(<Chip selected>Vídeo</Chip>)
    await expect.element(screen.getByRole('button', { name: 'Vídeo' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MetaChips', () => {
  it('lê cada dado com o nome dele, sem se confundir com as linhas de termo e valor', async () => {
    const screen = await render(
      <MetaChips
        items={[
          { label: 'Formato', value: 'MP4' },
          { label: 'Tamanho', value: '22,4 MB' },
        ]}
      />,
    )
    const items = screen.getByRole('listitem').elements().map((item) => item.textContent)
    expect(items).toEqual(['Formato: MP4', 'Tamanho: 22,4 MB'])
    expect(screen.getByRole('term').elements()).toHaveLength(0)
    await expect.element(screen.getByText('22,4 MB')).toBeVisible()
  })
})

describe('ProgressRing', () => {
  it('determinado expõe o valor; indeterminado, não', async () => {
    const screen = await render(
      <>
        <ProgressRing label="Exportando" value={42.4} />
        <ProgressRing label="Abrindo" />
      </>,
    )
    await expect.element(screen.getByRole('progressbar', { name: 'Exportando' })).toHaveAttribute('aria-valuenow', '42')
    await expect.element(screen.getByRole('progressbar', { name: 'Abrindo' })).not.toHaveAttribute('aria-valuenow')
  })
})

describe('Slider com valor padrão', () => {
  it('toque duplo volta ao valor padrão', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState(30)
      return (
        <Slider
          label="Velocidade"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
          min={0}
          max={100}
          resetTo={50}
        />
      )
    }
    const screen = await render(<Harness />)
    const slider = screen.getByRole('slider', { name: 'Velocidade' })
    await userEvent.dblClick(slider, { position: { x: 4, y: 12 } })
    expect(onChange).toHaveBeenLastCalledWith(50)
    await expect.element(slider).toHaveValue('50')
  })
})

describe('ToolIcon', () => {
  it('mostra o selo de vídeo ou imagem no canto', async () => {
    const screen = await render(
      <div data-testid="icons">
        <ToolIcon icon={Film} tone="edit" media="video" />
        <ToolIcon icon={Film} tone="edit" media="image" />
      </div>,
    )
    const container = screen.getByTestId('icons').element()
    expect(container.querySelector('[data-media="video"]')).not.toBeNull()
    expect(container.querySelector('[data-media="image"]')).not.toBeNull()
  })
})
