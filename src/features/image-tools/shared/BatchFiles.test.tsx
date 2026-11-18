import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { BatchItem } from './batch-state'
import { BatchFiles } from './BatchFiles'

const image = { format: 'jpeg', width: 64, height: 48, hasAlpha: false, animated: false } as const

const renderFiles = (items: BatchItem[]) =>
  render(
    <BatchFiles
      items={items}
      busy={items.some((item) => item.status === 'processing')}
      headingRef={createRef()}
      progressVerb="Comprimindo"
      onAdd={() => {}}
      onRemove={() => {}}
      onClear={() => {}}
      onDownload={() => {}}
    />,
  )

describe('BatchFiles', () => {
  it('a barra de progresso diz o que a ferramenta está fazendo', async () => {
    const screen = await renderFiles([
      { id: 'a', name: 'foto.jpg', size: 1000, status: 'processing', image },
      { id: 'b', name: 'outra.jpg', size: 1000, status: 'queued', image },
    ])
    await expect.element(screen.getByRole('progressbar', { name: 'Comprimindo foto.jpg' })).toBeInTheDocument()
  })

  it('observação do resultado aparece junto do arquivo, sem tom de erro', async () => {
    const screen = await renderFiles([
      { id: 'a', name: 'foto.jpg', size: 1000, status: 'done', image, output: { name: 'foto.jpg', size: 1000, note: 'Mantida a original.' } },
      { id: 'b', name: 'outra.jpg', size: 1000, status: 'done', image, output: { name: 'outra.jpg', size: 400 } },
    ])
    const note = screen.getByText('Mantida a original.')
    await expect.element(note).toBeVisible()
    expect(note.element().closest('p')?.className).not.toContain('text-danger')
  })
})
