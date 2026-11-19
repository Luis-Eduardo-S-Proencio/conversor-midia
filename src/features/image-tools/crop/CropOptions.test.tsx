import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { CropOptions } from './CropOptions'
import { fieldsOf, type CropError, type CropFields } from './settings'

const image = { width: 400, height: 300 }
const crop = { x: 50, y: 40, width: 200, height: 100 }
const base = {
  image,
  aspect: 'free' as const,
  onAspectChange: () => {},
  fields: fieldsOf(crop),
  onFieldChange: () => {},
  crop,
  onReset: () => {},
  formats: ['jpeg'] as const,
  webpSupported: true,
}

/** Campos com estado de verdade, para conferir o que fica escrito ao digitar. */
function Harness() {
  const [fields, setFields] = useState<CropFields>(fieldsOf(crop))
  return <CropOptions {...base} fields={fields} onFieldChange={(field, text) => setFields((current) => ({ ...current, [field]: text }))} />
}

describe('CropOptions', () => {
  it('proporções Livre, 1:1, 4:3 e 16:9; numa foto em pé, 3:4 e 9:16', async () => {
    const screen = await render(<CropOptions {...base} />)
    const names = () => screen.getByRole('radiogroup', { name: 'Proporção' }).getByRole('radio').elements().map((radio) => radio.textContent)
    expect(names()).toEqual(['Livre', '1:1', '4:3', '16:9'])
    await expect.element(screen.getByRole('radio', { name: 'Livre' })).toBeChecked()

    await screen.rerender(<CropOptions {...base} image={{ width: 300, height: 400 }} />)
    expect(names()).toEqual(['Livre', '1:1', '3:4', '9:16'])
  })

  it('informa a proporção escolhida', async () => {
    const onAspectChange = vi.fn()
    const screen = await render(<CropOptions {...base} onAspectChange={onAspectChange} />)
    await screen.getByRole('radio', { name: '16:9' }).click()
    expect(onAspectChange).toHaveBeenCalledWith('wide')
  })

  it('quatro campos em pixels: margens e tamanho da área', async () => {
    const screen = await render(<CropOptions {...base} />)
    await expect.element(screen.getByRole('textbox', { name: 'Margem esquerda' })).toHaveValue('50')
    await expect.element(screen.getByRole('textbox', { name: 'Margem superior' })).toHaveValue('40')
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toHaveValue('200')
    await expect.element(screen.getByRole('textbox', { name: 'Altura' })).toHaveValue('100')
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toHaveAccessibleDescription(/px/)
  })

  it('o que é digitado chega à ferramenta', async () => {
    const screen = await render(<Harness />)
    const width = screen.getByRole('textbox', { name: 'Largura' })
    await width.fill('120')
    await expect.element(width).toHaveValue('120')
  })

  it('mostra o tamanho final e explica como ajustar a área', async () => {
    const screen = await render(<CropOptions {...base} />)
    await expect.element(screen.getByText('Tamanho final')).toBeVisible()
    await expect.element(screen.getByText('200 × 100')).toBeVisible()
    await expect.element(screen.getByText(/Arraste a área e os cantos sobre a imagem/)).toBeVisible()
  })

  it('"Usar a imagem inteira" só aparece com a área recortada e informa o pedido', async () => {
    const onReset = vi.fn()
    const screen = await render(<CropOptions {...base} onReset={onReset} />)
    await screen.getByRole('button', { name: 'Usar a imagem inteira' }).click()
    expect(onReset).toHaveBeenCalledOnce()

    const full = { x: 0, y: 0, width: 400, height: 300 }
    await screen.rerender(<CropOptions {...base} crop={full} fields={fieldsOf(full)} />)
    expect(screen.getByRole('button', { name: 'Usar a imagem inteira' }).elements()).toHaveLength(0)
  })

  it('valor errado: anunciado ao surgir e ligado só aos campos com problema', async () => {
    const error: CropError = {
      message: 'A área passa da borda direita da imagem, que tem 400 px de largura. Diminua a margem esquerda ou a largura.',
      fields: ['width', 'x'],
      missing: false,
    }
    const screen = await render(<CropOptions {...base} error={error} />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent(error.message)
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toHaveAttribute('aria-invalid', 'true')
    await expect.element(screen.getByRole('textbox', { name: 'Margem esquerda' })).toHaveAttribute('aria-invalid', 'true')
    await expect.element(screen.getByRole('textbox', { name: 'Altura' })).not.toHaveAttribute('aria-invalid')
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toHaveAccessibleDescription(/passa da borda direita/)
  })

  it('aviso de tentativa (nada a recortar) não é alerta: o foco vai ao campo, que o lê', async () => {
    const error: CropError = { message: 'Ajuste a área de recorte antes.', fields: ['width'], missing: true }
    const screen = await render(<CropOptions {...base} error={error} />)
    const width = screen.getByRole('textbox', { name: 'Largura' })
    await expect.element(screen.getByText(error.message)).toBeVisible()
    expect(screen.getByRole('alert').elements()).toHaveLength(0)
    await expect.element(width).not.toHaveFocus()

    await screen.rerender(<CropOptions {...base} error={error} focusRequest={{ field: 'width' }} />)
    await expect.element(width).toHaveFocus()
  })

  it('sem WEBP no navegador, explica o destino dos WEBP só quando há WEBP', async () => {
    const screen = await render(<CropOptions {...base} webpSupported={false} />)
    expect(screen.getByText(/WEBP sai em/).elements()).toHaveLength(0)
    await screen.rerender(<CropOptions {...base} webpSupported={false} formats={['webp']} />)
    await expect.element(screen.getByText('Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.')).toBeVisible()
  })

  it('avisa sobre metadados', async () => {
    const screen = await render(<CropOptions {...base} />)
    await expect.element(screen.getByText(/O recorte remove metadados, como localização e data da foto/)).toBeVisible()
  })

  it('desativado durante o processamento', async () => {
    const screen = await render(<CropOptions {...base} disabled />)
    await expect.element(screen.getByRole('radio', { name: '1:1' })).toBeDisabled()
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Usar a imagem inteira' })).toBeDisabled()
  })
})
