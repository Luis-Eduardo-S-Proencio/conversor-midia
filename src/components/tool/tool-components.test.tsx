import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { DownloadActions } from './DownloadActions'
import { REVOKE_DELAY_MS } from './download'
import { Dropzone } from './Dropzone'
import { FileInfo } from './FileInfo'
import { FileListItem } from './FileListItem'
import { FilePickerButton } from './FilePickerButton'
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

/** Intercepta o clique do link de download para não baixar de verdade durante o teste. */
function captureDownloads() {
  const clicked: Array<{ href: string; download: string }> = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download })
  })
  return clicked
}

describe('DownloadActions', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('um arquivo: baixa com o nome dele e libera a URL temporária depois do prazo', async () => {
    vi.useFakeTimers()
    const clicked = captureDownloads()
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const file = png('resultado.png')

    const screen = await render(<DownloadActions getFiles={() => [file]} />)
    screen.getByRole('button', { name: 'Baixar' }).element().dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.download).toBe('resultado.png')
    expect(clicked[0]?.href).toMatch(/^blob:/)
    expect(revoke).not.toHaveBeenCalled()

    vi.advanceTimersByTime(REVOKE_DELAY_MS)
    expect(revoke).toHaveBeenCalledWith(clicked[0]?.href)
  })

  it('vários arquivos: baixa o pacote montado por bundle', async () => {
    const clicked = captureDownloads()
    const bundle = vi.fn(async () => ({ blob: new Blob(['zip']), name: 'imagens-convertidas.zip' }))

    const screen = await render(
      <DownloadActions getFiles={() => [png('a.png'), png('b.png')]} bundle={bundle} downloadLabel="Baixar todas (.zip)" />,
    )
    await screen.getByRole('button', { name: 'Baixar todas (.zip)' }).click()

    await expect.poll(() => clicked.length).toBe(1)
    expect(bundle).toHaveBeenCalledOnce()
    expect(clicked[0]?.download).toBe('imagens-convertidas.zip')
  })

  it('falha ao montar o pacote vira mensagem com alternativa', async () => {
    captureDownloads()
    const screen = await render(
      <DownloadActions getFiles={() => [png('a.png'), png('b.png')]} bundle={() => Promise.reject(new Error('sem memória'))} />,
    )
    await screen.getByRole('button', { name: 'Baixar' }).click()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Não foi possível montar o arquivo para baixar. Baixe os arquivos um a um.')
  })

  it('não mostra "Salvar na galeria" em aparelho com mouse', async () => {
    const screen = await render(<DownloadActions getFiles={() => [png('a.png')]} />)
    await expect.element(screen.getByRole('button', { name: 'Baixar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Salvar na galeria' }).elements()).toHaveLength(0)
  })
})

describe('FilePickerButton', () => {
  it('é um botão que entrega os arquivos escolhidos', async () => {
    const onFiles = vi.fn()
    const screen = await render(
      <FilePickerButton accept="image/png" onFiles={onFiles}>
        Adicionar arquivos
      </FilePickerButton>,
    )
    await expect.element(screen.getByRole('button', { name: 'Adicionar arquivos' })).toBeVisible()
    await userEvent.upload(fileInput(screen.container), [png('a.png')])
    expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual(['a.png'])
  })
})

describe('FileListItem', () => {
  it('mostra nome, linha técnica e estado', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="praia.png" meta="PNG · 640 × 480 · 1,2 MB" state="done" statusLabel="320 KB" />
      </ul>,
    )
    await expect.element(screen.getByText('praia.png')).toBeVisible()
    await expect.element(screen.getByText('PNG · 640 × 480 · 1,2 MB')).toBeVisible()
    // O selo existe em duas posições (sob o nome no celular, à direita a partir de 640 px); só uma aparece.
    const badges = screen.getByText('320 KB').elements()
    expect(badges.filter((badge) => badge.getClientRects().length > 0)).toHaveLength(1)
  })

  it('em processamento, tem barra de progresso com o nome do arquivo', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="praia.png" state="processing" />
      </ul>,
    )
    await expect.element(screen.getByRole('progressbar', { name: 'Convertendo praia.png' })).toBeInTheDocument()
  })

  it('erro aparece como texto junto do arquivo', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="scan.png" state="error" message="O arquivo está vazio." />
      </ul>,
    )
    await expect.element(screen.getByText('O arquivo está vazio.')).toBeVisible()
  })

  it('a miniatura é decorativa: o nome já está ao lado', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="praia.png" state="ready" thumbnailUrl="/icons/icon-192.png" />
      </ul>,
    )
    expect(screen.container.querySelector('img')?.getAttribute('alt')).toBe('')
  })
})
