import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { UPRIGHT } from '../../../core/image/orientation'
import { RotateOptions } from './RotateOptions'

const base = { onStep: () => {}, onReset: () => {}, formats: ['jpeg'] as const, webpSupported: true }
const right = { quarterTurns: 1, mirrored: false } as const

describe('RotateOptions', () => {
  it('girar à esquerda e à direita, espelhar na horizontal e na vertical, em dois grupos', async () => {
    const screen = await render(<RotateOptions {...base} orientation={UPRIGHT} />)
    const rotate = screen.getByRole('group', { name: 'Girar' })
    const flip = screen.getByRole('group', { name: 'Espelhar' })
    await expect.element(rotate.getByRole('button', { name: 'Girar à esquerda' })).toBeVisible()
    await expect.element(rotate.getByRole('button', { name: 'Girar à direita' })).toBeVisible()
    await expect.element(flip.getByRole('button', { name: 'Espelhar na horizontal' })).toBeVisible()
    await expect.element(flip.getByRole('button', { name: 'Espelhar na vertical' })).toBeVisible()
  })

  it('cada botão informa a sua operação', async () => {
    const onStep = vi.fn()
    const screen = await render(<RotateOptions {...base} onStep={onStep} orientation={UPRIGHT} />)
    await screen.getByRole('button', { name: 'Girar à esquerda' }).click()
    await screen.getByRole('button', { name: 'Girar à direita' }).click()
    await screen.getByRole('button', { name: 'Espelhar na horizontal' }).click()
    await screen.getByRole('button', { name: 'Espelhar na vertical' }).click()
    expect(onStep.mock.calls.map(([step]) => step)).toEqual(['rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical'])
  })

  it('resume a orientação escolhida numa região anunciada ao leitor de tela', async () => {
    const screen = await render(<RotateOptions {...base} orientation={UPRIGHT} />)
    await expect.element(screen.getByText('Escolha como girar ou espelhar.')).toHaveAttribute('aria-live', 'polite')

    await screen.rerender(<RotateOptions {...base} orientation={right} />)
    await expect.element(screen.getByText('Girada 90° para a direita.')).toHaveAttribute('aria-live', 'polite')
  })

  it('"Desfazer tudo" só aparece com alguma mudança e devolve o foco ao primeiro botão', async () => {
    const onReset = vi.fn()
    const screen = await render(<RotateOptions {...base} onReset={onReset} orientation={UPRIGHT} />)
    expect(screen.getByRole('button', { name: 'Desfazer tudo' }).elements()).toHaveLength(0)

    await screen.rerender(<RotateOptions {...base} onReset={onReset} orientation={right} />)
    await screen.getByRole('button', { name: 'Desfazer tudo' }).click()
    expect(onReset).toHaveBeenCalledOnce()
    await expect.element(screen.getByRole('button', { name: 'Girar à esquerda' })).toHaveFocus()
  })

  it('sem escolher nada: o erro fica ligado aos botões e o foco vai para o primeiro a cada tentativa', async () => {
    const error = 'Gire ou espelhe a imagem antes.'
    const screen = await render(<RotateOptions {...base} orientation={UPRIGHT} error={error} />)
    const first = screen.getByRole('button', { name: 'Girar à esquerda' })
    await expect.element(screen.getByText(error)).toBeVisible()
    await expect.element(first).toHaveAccessibleDescription(error)
    await expect.element(first).not.toHaveFocus()

    await screen.rerender(<RotateOptions {...base} orientation={UPRIGHT} error={error} focusRequest={{}} />)
    await expect.element(first).toHaveFocus()
  })

  it('sem WEBP no navegador, explica o destino dos WEBP só quando há WEBP', async () => {
    const screen = await render(<RotateOptions {...base} orientation={UPRIGHT} webpSupported={false} />)
    expect(screen.getByText(/WEBP sai em/).elements()).toHaveLength(0)
    await screen.rerender(<RotateOptions {...base} orientation={UPRIGHT} webpSupported={false} formats={['webp']} />)
    await expect.element(screen.getByText('Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.')).toBeVisible()
  })

  it('avisa sobre metadados', async () => {
    const screen = await render(<RotateOptions {...base} orientation={UPRIGHT} />)
    await expect.element(screen.getByText(/remove metadados, como localização e data da foto/)).toBeVisible()
  })

  it('desativado durante o processamento', async () => {
    const screen = await render(<RotateOptions {...base} orientation={right} disabled />)
    await expect.element(screen.getByRole('button', { name: 'Girar à direita' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Desfazer tudo' })).toBeDisabled()
  })
})
