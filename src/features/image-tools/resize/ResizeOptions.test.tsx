import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ResizeOptions } from './ResizeOptions'
import { DEFAULT_SETTINGS, type ResizeError, type ResizeSettings } from './settings'

const pixels: ResizeSettings = { ...DEFAULT_SETTINGS, mode: 'pixels' }
const base = { onChange: () => {}, formats: ['jpeg'] as const, webpSupported: true }

/** Opções com estado de verdade, para conferir o que fica nos campos ao digitar. */
function Harness() {
  const [settings, setSettings] = useState(pixels)
  return <ResizeOptions {...base} settings={settings} onChange={(changes) => setSettings((current) => ({ ...current, ...changes }))} />
}

describe('ResizeOptions', () => {
  it('começa em Porcentagem, com o tamanho em 50% e passos de 5%', async () => {
    const screen = await render(<ResizeOptions {...base} settings={DEFAULT_SETTINGS} />)
    await expect.element(screen.getByRole('radiogroup', { name: 'Redimensionar por' })).toBeVisible()
    await expect.element(screen.getByRole('radio', { name: 'Porcentagem' })).toBeChecked()

    const slider = screen.getByRole('slider', { name: 'Novo tamanho' })
    await expect.element(slider).toHaveAttribute('aria-valuetext', '50%')
    await expect.element(slider).toHaveAttribute('min', '10')
    await expect.element(slider).toHaveAttribute('max', '90')
    await expect.element(slider).toHaveAttribute('step', '5')
    expect(screen.getByRole('textbox').elements()).toHaveLength(0)
  })

  it('informa a troca de modo e de porcentagem', async () => {
    const onChange = vi.fn()
    const screen = await render(<ResizeOptions {...base} onChange={onChange} settings={DEFAULT_SETTINGS} />)
    await screen.getByRole('radio', { name: 'Pixels' }).click()
    expect(onChange).toHaveBeenCalledWith({ mode: 'pixels' })
  })

  it('Pixels: largura, altura e o cadeado "Manter proporção", ligado, com a explicação de cada estado', async () => {
    const onChange = vi.fn()
    const screen = await render(<ResizeOptions {...base} onChange={onChange} settings={pixels} />)
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toBeVisible()
    await expect.element(screen.getByRole('textbox', { name: 'Altura' })).toBeVisible()
    const lock = screen.getByRole('button', { name: 'Manter proporção' })
    await expect.element(lock).toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByText('A imagem cabe nessas medidas sem deformar. Basta preencher uma.')).toBeVisible()

    await lock.click()
    expect(onChange).toHaveBeenCalledWith({ keepRatio: false })

    await screen.rerender(<ResizeOptions {...base} onChange={onChange} settings={{ ...pixels, keepRatio: false }} />)
    await expect.element(lock).toHaveAttribute('aria-pressed', 'false')
    await expect.element(screen.getByText('A imagem fica exatamente com essas medidas e pode deformar.')).toBeVisible()
  })

  it('os campos guardam só algarismos e anunciam a unidade', async () => {
    const screen = await render(<Harness />)
    const width = screen.getByRole('textbox', { name: 'Largura' })
    await width.fill('1.920 px')
    await expect.element(width).toHaveValue('1920')
    await expect.element(width).toHaveAccessibleDescription(/px/)
  })

  it('erro: mensagem ligada só aos campos com problema, que ficam marcados como inválidos', async () => {
    const error: ResizeError = { message: 'Sem manter a proporção, preencha a largura e a altura.', fields: ['height'], missing: true }
    const screen = await render(<ResizeOptions {...base} settings={{ ...pixels, keepRatio: false, width: '100' }} error={error} />)

    const height = screen.getByRole('textbox', { name: 'Altura' })
    await expect.element(screen.getByText(error.message)).toBeVisible()
    await expect.element(height).toHaveAttribute('aria-invalid', 'true')
    await expect.element(height).toHaveAccessibleDescription(/Sem manter a proporção, preencha a largura e a altura\./)
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).not.toHaveAttribute('aria-invalid')
  })

  it('valor errado é anunciado ao surgir (alerta); campo vazio, não: o foco leva ao campo, que já o descreve', async () => {
    const range: ResizeError = { message: 'Use um valor de 1 a 16384 px.', fields: ['width'], missing: false }
    const screen = await render(<ResizeOptions {...base} settings={{ ...pixels, width: '0' }} error={range} />)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Use um valor de 1 a 16384 px.')

    const missing: ResizeError = { message: 'Preencha a largura, a altura ou as duas.', fields: ['width', 'height'], missing: true }
    await screen.rerender(<ResizeOptions {...base} settings={pixels} error={missing} />)
    await expect.element(screen.getByText(missing.message)).toBeVisible()
    expect(screen.getByRole('alert').elements()).toHaveLength(0)
  })

  it('a cada tentativa com erro, o foco vai para o campo pedido, e só nessas horas', async () => {
    const error: ResizeError = { message: 'Sem manter a proporção, preencha a largura e a altura.', fields: ['height'], missing: true }
    const settings = { ...pixels, keepRatio: false, width: '100' }
    const screen = await render(<ResizeOptions {...base} settings={settings} error={error} />)
    const height = screen.getByRole('textbox', { name: 'Altura' })
    await expect.element(height).not.toHaveFocus() // mostrar o erro não rouba o foco

    await screen.rerender(<ResizeOptions {...base} settings={settings} error={error} focusRequest={{ field: 'height' }} />)
    await expect.element(height).toHaveFocus()

    // Nova tentativa, mesmo campo: um pedido novo leva o foco de volta.
    await screen.getByRole('textbox', { name: 'Largura' }).click()
    await screen.rerender(<ResizeOptions {...base} settings={settings} error={error} focusRequest={{ field: 'height' }} />)
    await expect.element(height).toHaveFocus()
  })

  it('com uma imagem só, mostra o tamanho final ou avisa que ela já cabe', async () => {
    const screen = await render(
      <ResizeOptions {...base} settings={DEFAULT_SETTINGS} outcome={{ from: { width: 5120, height: 2880 }, to: { width: 2560, height: 1440 } }} />,
    )
    await expect.element(screen.getByText('Tamanho final')).toBeVisible()
    await expect.element(screen.getByText('2560 × 1440')).toBeVisible()

    await screen.rerender(
      <ResizeOptions {...base} settings={pixels} outcome={{ from: { width: 800, height: 600 }, to: { width: 800, height: 600 } }} />,
    )
    await expect.element(screen.getByText('Já cabe no tamanho pedido: a imagem fica como está.')).toBeVisible()
  })

  it('sem WEBP no navegador, explica o destino dos WEBP só quando há WEBP', async () => {
    const screen = await render(<ResizeOptions {...base} settings={DEFAULT_SETTINGS} webpSupported={false} />)
    expect(screen.getByText(/WEBP sai em/).elements()).toHaveLength(0)

    await screen.rerender(<ResizeOptions {...base} settings={DEFAULT_SETTINGS} webpSupported={false} formats={['jpeg', 'webp']} />)
    await expect.element(screen.getByText('Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.')).toBeVisible()
  })

  it('avisa sobre metadados e que nada é ampliado sem pedir', async () => {
    const screen = await render(<ResizeOptions {...base} settings={DEFAULT_SETTINGS} />)
    await expect.element(screen.getByText(/O redimensionamento remove metadados/)).toBeVisible()
    await expect.element(screen.getByText(/Com a proporção mantida, nenhuma imagem é ampliada/)).toBeVisible()
  })

  it('desativado durante o processamento', async () => {
    const screen = await render(<ResizeOptions {...base} settings={pixels} disabled />)
    await expect.element(screen.getByRole('radio', { name: 'Pixels' })).toBeDisabled()
    await expect.element(screen.getByRole('textbox', { name: 'Largura' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Manter proporção' })).toBeDisabled()
  })
})
