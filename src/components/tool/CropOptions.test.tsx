import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { fieldsOf, type CropError, type CropFields } from '../../core/crop-fields'
import { CropOptions } from './CropOptions'

const size = { width: 400, height: 300 }
const crop = { x: 50, y: 40, width: 200, height: 100 }
const base = {
  subject: 'image' as const,
  size,
  aspect: 'free' as const,
  onAspectChange: () => {},
  fields: fieldsOf(crop),
  onFieldChange: () => {},
  crop,
  onReset: () => {},
}

/** Campos com estado de verdade, para conferir o que fica escrito ao digitar. */
function Harness() {
  const [fields, setFields] = useState<CropFields>(fieldsOf(crop))
  return <CropOptions {...base} fields={fields} onFieldChange={(field, text) => setFields((current) => ({ ...current, [field]: text }))} />
}

describe('CropOptions', () => {
  it('proporções Livre, 1:1, 4:5, 9:16, 16:9 e 3:2, em duas linhas de três', async () => {
    const screen = await render(<CropOptions {...base} />)
    const radios = () => screen.getByRole('radiogroup', { name: 'Proporção' }).getByRole('radio').elements()
    expect(radios().map((radio) => radio.textContent)).toEqual(['Livre', '1:1', '4:5', '9:16', '16:9', '3:2'])
    await expect.element(screen.getByRole('radio', { name: 'Livre' })).toBeChecked()
    const [first, , , fourth] = radios().map((radio) => radio.getBoundingClientRect())
    expect(fourth?.left).toBe(first?.left) // a quarta opção começa a segunda linha
  })

  it('informa a proporção escolhida', async () => {
    const onAspectChange = vi.fn()
    const screen = await render(<CropOptions {...base} onAspectChange={onAspectChange} />)
    await screen.getByRole('radio', { name: '16:9' }).click()
    expect(onAspectChange).toHaveBeenCalledWith('16:9')
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

  it('o tamanho final pode diferir da área (vídeo: lados pares)', async () => {
    const screen = await render(<CropOptions {...base} crop={{ x: 0, y: 0, width: 201, height: 101 }} finalSize={{ width: 200, height: 100 }} />)
    await expect.element(screen.getByText('200 × 100')).toBeVisible()
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

  it('mostra as observações da ferramenta antes da nota sobre metadados', async () => {
    const screen = await render(<CropOptions {...base} notes={<p>Observação da ferramenta.</p>} />)
    await expect.element(screen.getByText('Observação da ferramenta.')).toBeVisible()
  })

  it('avisa sobre metadados', async () => {
    const screen = await render(<CropOptions {...base} />)
    await expect.element(screen.getByText(/O recorte remove metadados, como localização e data da foto/)).toBeVisible()
  })

  it('para vídeo, os textos falam do vídeo', async () => {
    const screen = await render(<CropOptions {...base} subject="video" />)
    await expect.element(screen.getByText(/Arraste a área e os cantos sobre o vídeo/)).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Usar o vídeo inteiro' })).toBeVisible()
    await expect.element(screen.getByText('O vídeo sai sem metadados, como localização e data da gravação.')).toBeVisible()
  })

  it('desativado durante o processamento', async () => {
    const screen = await render(<CropOptions {...base} disabled />)
    await expect.element(screen.getByRole('radio', { name: '1:1' })).toBeDisabled()
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Usar a imagem inteira' })).toBeDisabled()
  })
})
