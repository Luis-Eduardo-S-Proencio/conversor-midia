import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { DownloadActions } from './DownloadActions'
import { REVOKE_DELAY_MS } from './download'
import { Dropzone } from './Dropzone'
import { FileInfo } from './FileInfo'
import { FileListItem } from './FileListItem'
import { FilePickerButton } from './FilePickerButton'
import { FilePreview } from './FilePreview'
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

/** Carregar e decodificar a imagem pode passar de 1 s com a máquina ocupada pelos outros testes. */
const IMAGE_LOAD = { timeout: 5_000 }

/** PNG de verdade com as medidas pedidas, servido por URL temporária (como a prévia gerada pelo Worker). */
async function pngUrl(width: number, height: number): Promise<string> {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d')?.fillRect(0, 0, width, height)
  return URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }))
}

describe('FilePreview', () => {
  it('sem orientação, a imagem aparece como é', async () => {
    const screen = await render(<FilePreview src={await pngUrl(200, 100)} alt="Pré-visualização de faixa.png" />)
    const image = screen.getByRole('img', { name: 'Pré-visualização de faixa.png' })
    await expect.poll(() => image.element().getBoundingClientRect().width, IMAGE_LOAD).toBe(200)
    expect(image.element().getBoundingClientRect().height).toBe(100)
  })

  it('girada 90°: aparece em pé, com largura e altura trocadas, inteira dentro da área da prévia', async () => {
    const screen = await render(
      <FilePreview src={await pngUrl(200, 100)} alt="Pré-visualização de faixa.png" orientation={{ quarterTurns: 1, mirrored: false }} />,
    )
    const image = screen.getByRole('img', { name: 'Pré-visualização de faixa.png' })
    // O retângulo na tela já inclui o giro.
    await expect.poll(() => Math.round(image.element().getBoundingClientRect().height), IMAGE_LOAD).toBe(200)
    const box = image.element().getBoundingClientRect()
    expect(Math.round(box.width)).toBe(100)

    const frame = screen.container.firstElementChild?.getBoundingClientRect()
    if (!frame) throw new Error('área da prévia ausente')
    expect(box.left).toBeGreaterThanOrEqual(frame.left)
    expect(box.right).toBeLessThanOrEqual(frame.right)
    expect(box.top).toBeGreaterThanOrEqual(frame.top)
    expect(box.bottom).toBeLessThanOrEqual(frame.bottom)
  })

  it('espelhada: mesmas medidas, imagem invertida', async () => {
    const screen = await render(
      <FilePreview src={await pngUrl(200, 100)} alt="Pré-visualização de faixa.png" orientation={{ quarterTurns: 0, mirrored: true }} />,
    )
    const image = screen.getByRole('img', { name: 'Pré-visualização de faixa.png' })
    await expect.poll(() => getComputedStyle(image.element()).transform, IMAGE_LOAD).not.toBe('none')
    const box = image.element().getBoundingClientRect()
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([200, 100])
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
    // Antes → depois e a variação; os nomes ("Antes", "Depois", "Redução") ficam para o leitor de tela.
    const values = screen.getByRole('definition').elements().map((value) => value.textContent)
    expect(values).toEqual(['8,6 MB', '1,9 MB', '−78%'])
    await expect.element(screen.getByText('−78%')).toBeVisible()
    expect(screen.getByRole('term').elements().map((term) => term.textContent)).toEqual(['Antes', 'Depois', 'Redução'])
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

  it('sem compartilhamento de arquivos no navegador, fica só o Baixar', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })
    const screen = await render(<DownloadActions getFiles={() => [png('a.png')]} />)
    await expect.element(screen.getByRole('button', { name: 'Baixar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Compartilhar' }).elements()).toHaveLength(0)
  })

  it('com compartilhamento de arquivos, "Compartilhar" envia o próprio arquivo', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    const share = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const file = png('resultado.png')
    const screen = await render(<DownloadActions getFiles={() => [file]} />)
    await screen.getByRole('button', { name: 'Compartilhar' }).click()
    expect(share).toHaveBeenCalledWith({ files: [file] })
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
    await expect.element(screen.getByRole('progressbar', { name: 'Processando praia.png' })).toBeInTheDocument()
  })

  it('a barra de progresso usa o verbo da ferramenta, quando informado', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="praia.png" state="processing" progressLabel="Comprimindo praia.png" />
      </ul>,
    )
    await expect.element(screen.getByRole('progressbar', { name: 'Comprimindo praia.png' })).toBeInTheDocument()
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

  it('a miniatura mostra a orientação escolhida', async () => {
    const screen = await render(
      <ul>
        <FileListItem name="praia.png" state="ready" thumbnailUrl="/icons/icon-192.png" orientation={{ quarterTurns: 1, mirrored: false }} />
      </ul>,
    )
    expect(screen.container.querySelector('img')?.style.transform).toBe('rotate(90deg)')
  })
})
