import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { CompareView } from './CompareView'
import { ResultImage } from './ResultMedia'

describe('CompareView', () => {
  it('mostra primeiro como ficou; o original fica a um toque, um de cada vez', async () => {
    const screen = await render(<CompareView resultKey="a" result={<p>Imagem do resultado</p>} original={<p>Imagem de antes</p>} />)
    await expect.element(screen.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    await expect.element(screen.getByText('Imagem do resultado')).toBeVisible()
    expect(screen.getByText('Imagem de antes').elements()).toHaveLength(0)

    await screen.getByRole('radio', { name: 'Original' }).click()
    await expect.element(screen.getByText('Imagem de antes')).toBeVisible()
    expect(screen.getByText('Imagem do resultado').elements()).toHaveLength(0)
  })

  it('resultado novo volta para "Como ficou"', async () => {
    const screen = await render(<CompareView resultKey="a" result={<p>Imagem do resultado</p>} original={<p>Imagem de antes</p>} />)
    await screen.getByRole('radio', { name: 'Original' }).click()
    await screen.rerender(<CompareView resultKey="b" result={<p>Imagem do resultado</p>} original={<p>Imagem de antes</p>} />)
    await expect.element(screen.getByRole('radio', { name: 'Como ficou' })).toBeChecked()
    await expect.element(screen.getByText('Imagem do resultado')).toBeVisible()
  })
})

describe('ResultImage', () => {
  it('formato que o navegador não mostra: orienta a baixar, sem imagem quebrada', async () => {
    const url = URL.createObjectURL(new Blob(['II*\0 não é uma imagem que o navegador mostre'], { type: 'image/tiff' }))
    const screen = await render(<ResultImage src={url} name="foto.tiff" />)
    await expect.element(screen.getByText('Este navegador não mostra este formato de arquivo. Baixe para ver como ficou.')).toBeVisible()
    expect(screen.getByRole('img').elements()).toHaveLength(0)
    URL.revokeObjectURL(url)
  })
})
