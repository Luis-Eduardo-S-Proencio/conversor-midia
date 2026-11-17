import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { DownloadActions } from './DownloadActions'
import { REVOKE_DELAY_MS } from './download'
import { Dropzone } from './Dropzone'
import { FileInfo } from './FileInfo'
import { ResultSummary } from './ResultSummary'

const png = (name: string) => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' })

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('input de arquivo não encontrado')
  return input
}

describe('Dropzone', () => {
  it('oferece um botão real para escolher arquivos, descrito pela dica', async () => {
    const screen = await render(
      <Dropzone accept="image/png" onFiles={() => {}} buttonLabel="Selecionar imagens" hint="JPG, PNG ou WEBP" />,
    )
    await expect
      .element(screen.getByRole('button', { name: 'Selecionar imagens' }))
      .toHaveAccessibleDescription('JPG, PNG ou WEBP')
  })

  it('entrega os arquivos escolhidos', async () => {
    const onFiles = vi.fn()
    const screen = await render(<Dropzone accept="image/png" onFiles={onFiles} />)

    await userEvent.upload(fileInput(screen.container), [png('a.png'), png('b.png')])

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual(['a.png', 'b.png'])
  })

  it('com multiple={false} entrega só o primeiro, mesmo soltando vários', async () => {
    const onFiles = vi.fn()
    const screen = await render(<Dropzone accept="image/png" multiple={false} onFiles={onFiles} />)
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(png('a.png'))
    dataTransfer.items.add(png('b.png'))

    const zone = screen.getByRole('button').element().parentElement
    zone?.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }))

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual(['a.png'])
  })

  it('ignora arquivos soltos quando desativada', async () => {
    const onFiles = vi.fn()
    const screen = await render(<Dropzone accept="image/png" disabled onFiles={onFiles} />)
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(png('a.png'))

    screen.getByRole('button').element().parentElement?.dispatchEvent(
      new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }),
    )

    expect(onFiles).not.toHaveBeenCalled()
  })

  it('limpa o campo para permitir escolher o mesmo arquivo de novo', async () => {
    const screen = await render(<Dropzone accept="image/png" onFiles={() => {}} />)
    const input = fileInput(screen.container)
    await userEvent.upload(input, png('a.png'))
    expect(input.value).toBe('')
  })
})

describe('FileInfo e ResultSummary', () => {
  it('mostram dados técnicos no padrão brasileiro', async () => {
    const screen = await render(
      <>
        <FileInfo name="praia-2026.png" format="png" width={3024} height={4032} sizeBytes={9_017_753} />
        <ResultSummary beforeBytes={9_017_753} afterBytes={1_992_294} />
      </>,
    )
    await expect.element(screen.getByText('PNG · 3024 × 4032 · 8,6 MB')).toBeVisible()
    await expect.element(screen.getByText('Redução')).toBeVisible()
    await expect.element(screen.getByText('−78%')).toBeVisible()
  })
})

describe('DownloadActions', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('baixa com o nome do arquivo e libera a URL temporária depois do prazo', async () => {
    vi.useFakeTimers()
    const clicked: Array<{ href: string; download: string }> = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download })
    })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const file = png('resultado.png')

    const screen = await render(<DownloadActions file={file} />)
    screen.getByRole('button', { name: 'Baixar' }).element().dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.download).toBe('resultado.png')
    expect(clicked[0]?.href).toMatch(/^blob:/)
    expect(revoke).not.toHaveBeenCalled()

    vi.advanceTimersByTime(REVOKE_DELAY_MS)
    expect(revoke).toHaveBeenCalledWith(clicked[0]?.href)
  })

  it('não mostra "Salvar na galeria" em aparelho com mouse', async () => {
    const screen = await render(<DownloadActions file={png('a.png')} />)
    await expect.element(screen.getByRole('button', { name: 'Baixar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Salvar na galeria' }).elements()).toHaveLength(0)
  })
})
