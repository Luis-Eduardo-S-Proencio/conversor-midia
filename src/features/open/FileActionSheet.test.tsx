import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { ToastProvider } from '../../components/ui/Toast'
import { clearHandOff, peekHandOff } from '../shared/file-handoff'
import { FileActionSheet } from './FileActionSheet'
import type { OpenedMedia } from './useOpenMedia'

const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'praia.jpg', { type: 'image/jpeg' })
const logo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' })
const clip = new File([new Uint8Array([0, 0, 0, 8])], 'ferias.mp4', { type: 'video/mp4' })

function Harness({ initial }: { initial: OpenedMedia }) {
  const [opened, setOpened] = useState<OpenedMedia | null>(initial)
  return (
    <>
      <h1>Início</h1>
      <FileActionSheet opened={opened} onClose={() => setOpened(null)} onChooseAnother={() => {}} />
    </>
  )
}

function renderSheet(initial: OpenedMedia) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Harness initial={initial} /> },
      { path: '/imagens/:tool', element: <h1>Ferramenta de imagem</h1> },
      { path: '/videos/:tool', element: <h1>Ferramenta de vídeo</h1> },
    ],
    { initialEntries: ['/'] },
  )
  return {
    router,
    screenPromise: render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    ),
  }
}

afterEach(() => {
  for (const kind of ['image', 'video'] as const) clearHandOff(peekHandOff(kind) ?? [])
})

describe('"O que fazer com este arquivo?"', () => {
  it('uma foto: as cinco ferramentas de imagem, com o arquivo e o formato', async () => {
    const { screenPromise } = renderSheet({ kind: 'image', files: [photo], formatLabel: 'JPG' })
    const screen = await screenPromise
    const sheet = screen.getByRole('dialog', { name: 'O que fazer com este arquivo?' })
    await expect.element(sheet).toBeVisible()
    await expect.element(sheet.getByText('praia.jpg')).toBeVisible()
    await expect.element(sheet.getByText('JPG', { exact: true })).toBeVisible()
    const names = sheet.getByRole('link').elements().map((link) => link.textContent ?? '')
    expect(names).toHaveLength(5)
    expect(names[0]).toMatch(/^Converter imagem/)
    expect(names[3]).toMatch(/^Recortar imagem/)
  })

  it('várias fotos: só as ferramentas de lote, e avisa como recortar', async () => {
    const { screenPromise } = renderSheet({ kind: 'image', files: [photo, logo], formatLabel: 'JPG' })
    const screen = await screenPromise
    const sheet = screen.getByRole('dialog', { name: 'O que fazer com estas imagens?' })
    await expect.element(sheet).toBeVisible()
    await expect.element(sheet.getByText('2 imagens')).toBeVisible()
    expect(sheet.getByRole('link', { name: /Recortar imagem/ }).elements()).toHaveLength(0)
    await expect.element(sheet.getByText('Para recortar, abra uma imagem de cada vez.')).toBeVisible()
  })

  it('um vídeo: o editor vem primeiro, como recomendado', async () => {
    const { screenPromise } = renderSheet({ kind: 'video', files: [clip], formatLabel: 'MP4' })
    const screen = await screenPromise
    const links = screen.getByRole('dialog').getByRole('link')
    expect(links.elements()).toHaveLength(7)
    expect(links.elements()[0]?.textContent).toMatch(/^Editar vídeo\s*Recomendado/)
  })

  it('a ferramenta escolhida recebe os arquivos e toma o lugar do painel no histórico', async () => {
    const { router, screenPromise } = renderSheet({ kind: 'image', files: [photo, logo], formatLabel: 'JPG' })
    const screen = await screenPromise
    await screen.getByRole('link', { name: /^Comprimir imagem/ }).click()
    await expect.element(screen.getByRole('heading', { name: 'Ferramenta de imagem' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/imagens/comprimir')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(peekHandOff('image')?.map((file) => file.name)).toEqual(['praia.jpg', 'logo.png'])
  })

  it('fechar não entrega nada', async () => {
    const { screenPromise } = renderSheet({ kind: 'image', files: [photo], formatLabel: 'JPG' })
    const screen = await screenPromise
    await screen.getByRole('button', { name: 'Fechar' }).click()
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
    expect(peekHandOff('image')).toBeNull()
  })
})
