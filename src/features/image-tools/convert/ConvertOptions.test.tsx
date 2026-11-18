import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ConvertOptions } from './ConvertOptions'
import type { ConvertSettings } from './settings'

const jpeg: ConvertSettings = { target: 'jpeg', quality: 85, background: 'white' }

describe('ConvertOptions', () => {
  it('JPG mostra qualidade; o fundo só aparece quando há transparência', async () => {
    const screen = await render(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported hasTransparency={false} />)
    await expect.element(screen.getByRole('slider', { name: 'Qualidade' })).toBeVisible()
    expect(screen.getByRole('radiogroup', { name: 'Fundo das áreas transparentes' }).elements()).toHaveLength(0)

    await screen.rerender(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported hasTransparency />)
    await expect.element(screen.getByRole('radiogroup', { name: 'Fundo das áreas transparentes' })).toBeVisible()
  })

  it('PNG não tem qualidade nem fundo: é sem perdas e aceita transparência', async () => {
    const screen = await render(
      <ConvertOptions settings={{ ...jpeg, target: 'png' }} onChange={() => {}} webpSupported hasTransparency />,
    )
    expect(screen.getByRole('slider', { name: 'Qualidade' }).elements()).toHaveLength(0)
    expect(screen.getByRole('radiogroup', { name: 'Fundo das áreas transparentes' }).elements()).toHaveLength(0)
  })

  it('sem codificador WEBP no navegador, a opção fica desativada e explicada', async () => {
    const screen = await render(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported={false} hasTransparency={false} />)
    await expect.element(screen.getByRole('radio', { name: 'WEBP' })).toBeDisabled()
    await expect.element(screen.getByText('Este navegador não consegue gerar WEBP. Escolha JPG ou PNG.')).toBeVisible()
  })

  it('avisa que metadados são removidos', async () => {
    const screen = await render(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported hasTransparency={false} />)
    await expect.element(screen.getByText('A conversão remove metadados, como localização e data da foto.')).toBeVisible()
  })

  it('informa as mudanças escolhidas', async () => {
    const onChange = vi.fn()
    const screen = await render(<ConvertOptions settings={jpeg} onChange={onChange} webpSupported hasTransparency />)
    await screen.getByRole('radio', { name: 'PNG' }).click()
    expect(onChange).toHaveBeenCalledWith({ target: 'png' })
    await screen.getByRole('radio', { name: 'Preto' }).click()
    expect(onChange).toHaveBeenCalledWith({ background: 'black' })
  })

  it('oferece os oito formatos de saída', async () => {
    const screen = await render(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported hasTransparency={false} />)
    const names = screen.getByRole('radio').elements().map((radio) => radio.textContent)
    expect(names).toEqual(['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'ICO', 'PDF'])
  })

  it('PDF tem qualidade (a imagem vai em JPG) e pede fundo quando há transparência', async () => {
    const screen = await render(<ConvertOptions settings={{ ...jpeg, target: 'pdf' }} onChange={() => {}} webpSupported hasTransparency />)
    await expect.element(screen.getByRole('slider', { name: 'Qualidade' })).toBeVisible()
    await expect.element(screen.getByRole('radiogroup', { name: 'Fundo das áreas transparentes' })).toBeVisible()
    await expect.element(screen.getByText('No PDF, a imagem vai em JPG, sem transparência.')).toBeVisible()
    await expect.element(screen.getByText('Cada imagem vira um PDF de uma página, do tamanho da imagem.')).toBeVisible()
  })

  it('BMP pede fundo, sem qualidade, e avisa do tamanho', async () => {
    const screen = await render(<ConvertOptions settings={{ ...jpeg, target: 'bmp' }} onChange={() => {}} webpSupported hasTransparency />)
    expect(screen.getByRole('slider', { name: 'Qualidade' }).elements()).toHaveLength(0)
    await expect.element(screen.getByText('BMP não tem transparência.')).toBeVisible()
    await expect.element(screen.getByText('BMP não tem compressão: o arquivo fica bem maior.')).toBeVisible()
  })

  it('GIF, TIFF e ICO mantêm a transparência e explicam o que muda', async () => {
    const notes = {
      gif: 'GIF tem no máximo 256 cores: em fotos, as cores perdem detalhes.',
      tiff: 'TIFF sem compressão: não perde qualidade, mas o arquivo fica bem maior.',
      ico: 'Ícone com tamanhos de 16 a 256 px, para favicon e atalhos. Imagens não quadradas ganham margens transparentes.',
    } as const
    for (const [target, note] of Object.entries(notes)) {
      const screen = await render(
        <ConvertOptions settings={{ ...jpeg, target: target as keyof typeof notes }} onChange={() => {}} webpSupported hasTransparency />,
      )
      expect(screen.getByRole('radiogroup', { name: 'Fundo das áreas transparentes' }).elements()).toHaveLength(0)
      expect(screen.getByRole('slider', { name: 'Qualidade' }).elements()).toHaveLength(0)
      await expect.element(screen.getByText(note)).toBeVisible()
      await screen.unmount()
    }
  })

  it('desativado durante a conversão', async () => {
    const screen = await render(<ConvertOptions settings={jpeg} onChange={() => {}} webpSupported hasTransparency={false} disabled />)
    await expect.element(screen.getByRole('radio', { name: 'JPG' })).toBeDisabled()
    await expect.element(screen.getByRole('slider', { name: 'Qualidade' })).toBeDisabled()
  })
})
