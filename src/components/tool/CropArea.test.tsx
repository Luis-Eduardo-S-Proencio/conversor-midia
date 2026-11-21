import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { CropArea } from './CropArea'

/** PNG de verdade, servido por URL temporária como a prévia gerada pelo Worker. */
async function pngUrl(width: number, height: number): Promise<string> {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d')?.fillRect(0, 0, width, height)
  return URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }))
}

// A prévia tem 200 × 100 e a imagem original, 2000 × 1000: cada pixel da tela vale 10 da imagem.
const size = { width: 2000, height: 1000 }
const crop = { x: 500, y: 250, width: 1000, height: 500 }
const IMAGE_LOAD = { timeout: 5_000 }

/** A área recebe a mídia como filho: aqui, a prévia de uma imagem. */
const preview = async () => <img src={await pngUrl(200, 100)} alt="Pré-visualização de foto.jpg" />

describe('CropArea', () => {
  it('a área e os pontos de ajuste têm nomes em português e entram na ordem do Tab', async () => {
    const screen = await render(
      <CropArea size={size} crop={crop} onChange={() => {}}>
        {await preview()}
      </CropArea>,
    )
    await expect.element(screen.getByRole('img', { name: 'Pré-visualização de foto.jpg' })).toBeVisible()
    const area = screen.getByRole('group', { name: 'Área de recorte. Use as setas para mover.' })
    await expect.element(area).toHaveAttribute('tabindex', '0')
    await expect.element(screen.getByRole('button', { name: 'Canto inferior direito. Use as setas para ajustar.' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Borda esquerda. Use as setas para ajustar.' })).toBeInTheDocument()
  })

  it('a seta move a área um pixel da tela, convertido para pixels da imagem', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <CropArea size={size} crop={crop} onChange={onChange}>
        {await preview()}
      </CropArea>,
    )
    const image = screen.getByRole('img', { name: 'Pré-visualização de foto.jpg' })
    await expect.poll(() => image.element().getBoundingClientRect().width, IMAGE_LOAD).toBe(200)

    screen.getByRole('group', { name: /Área de recorte/ }).element().focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith({ x: 510, y: 250, width: 1000, height: 500 })
  })

  it('desativada, mostra a área sem os pontos de ajuste', async () => {
    const screen = await render(
      <CropArea size={size} crop={crop} onChange={() => {}} disabled>
        {await preview()}
      </CropArea>,
    )
    await expect.element(screen.getByRole('group', { name: /Área de recorte/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Use as setas para ajustar/ }).elements()).toHaveLength(0)
  })
})
