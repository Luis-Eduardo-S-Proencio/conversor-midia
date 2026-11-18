import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { CompressOptions } from './CompressOptions'

describe('CompressOptions', () => {
  it('oferece três níveis, com Média como explicação inicial', async () => {
    const screen = await render(<CompressOptions level="balanced" onChange={() => {}} formats={['jpeg']} webpSupported />)
    await expect.element(screen.getByRole('radiogroup', { name: 'Nível de compressão' })).toBeVisible()
    await expect.element(screen.getByRole('radio', { name: 'Média' })).toBeChecked()
    await expect.element(screen.getByText('Bom equilíbrio entre tamanho e qualidade.')).toBeVisible()
  })

  it('informa a escolha de nível', async () => {
    const onChange = vi.fn()
    const screen = await render(<CompressOptions level="balanced" onChange={onChange} formats={['jpeg']} webpSupported />)
    await screen.getByRole('radio', { name: 'Forte' }).click()
    expect(onChange).toHaveBeenCalledWith('strong')
  })

  it('explica que PNG sai em WEBP só quando há PNG', async () => {
    const screen = await render(<CompressOptions level="light" onChange={() => {}} formats={['jpeg']} webpSupported />)
    expect(screen.getByText(/PNG sai em WEBP/).elements()).toHaveLength(0)

    await screen.rerender(<CompressOptions level="light" onChange={() => {}} formats={['jpeg', 'png']} webpSupported />)
    await expect.element(screen.getByText(/PNG sai em WEBP/)).toBeVisible()
  })

  it('sem WEBP no navegador, explica o que acontece com PNG e WEBP', async () => {
    const screen = await render(<CompressOptions level="light" onChange={() => {}} formats={['png']} webpSupported={false} />)
    await expect.element(screen.getByText(/Neste navegador, PNG e WEBP sem transparência saem em JPG/)).toBeVisible()
  })

  it('avisa sobre metadados e sobre manter a original quando não houver ganho', async () => {
    const screen = await render(<CompressOptions level="light" onChange={() => {}} formats={['jpeg']} webpSupported />)
    await expect.element(screen.getByText(/A compressão remove metadados/)).toBeVisible()
    await expect.element(screen.getByText(/a original é mantida/)).toBeVisible()
  })

  it('desativado durante a compressão', async () => {
    const screen = await render(<CompressOptions level="light" onChange={() => {}} formats={['jpeg']} webpSupported disabled />)
    await expect.element(screen.getByRole('radio', { name: 'Leve' })).toBeDisabled()
  })
})
