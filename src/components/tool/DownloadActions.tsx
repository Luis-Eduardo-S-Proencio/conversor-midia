import { Download, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { canShareFiles, saveBlob, shareFiles } from './download'

interface DownloadActionsProps {
  /** Arquivos prontos. Lidos só no clique: os arquivos não ficam no estado do React. */
  getFiles: () => File[]
  /** Monta o pacote a baixar quando há mais de um arquivo (ex.: ZIP). */
  bundle?: () => Promise<{ blob: Blob; name: string }>
  downloadLabel?: string
  size?: 'md' | 'lg'
  /** Botões em coluna, ocupando a largura (barra de ação e painéis estreitos). */
  stacked?: boolean
}

/** O navegador compartilha arquivos (Web Share com arquivos)? Conferido uma vez, com um arquivo de teste. */
function supportsFileSharing(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([''], 'teste.png', { type: 'image/png' })] })
  } catch {
    return false // alguns navegadores lançam em vez de responder "não"
  }
}

/**
 * Baixar e, onde o navegador permite, "Compartilhar" o próprio arquivo (WhatsApp, e-mail, galeria).
 * No iPhone o download vai para o app Arquivos; a galeria só é alcançada pelo compartilhamento.
 */
export function DownloadActions({ getFiles, bundle, downloadLabel = 'Baixar', size = 'md', stacked = false }: DownloadActionsProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showShare] = useState(supportsFileSharing)

  async function handleDownload() {
    setError(null)
    const files = getFiles()
    const [first] = files
    if (files.length === 1 && first) {
      saveBlob(first, first.name)
      return
    }
    if (!bundle) return
    setBusy(true)
    try {
      const { blob, name } = await bundle()
      saveBlob(blob, name)
    } catch {
      setError('Não foi possível montar o arquivo para baixar. Baixe os arquivos um a um.')
    } finally {
      setBusy(false)
    }
  }

  async function handleShare() {
    setError(null)
    const files = getFiles()
    if (!canShareFiles(files)) {
      setError('Este navegador não permite compartilhar estes arquivos. Use o botão Baixar.')
      return
    }
    try {
      await shareFiles(files)
    } catch {
      setError('Não foi possível abrir o compartilhamento. Use o botão Baixar.')
    }
  }

  return (
    <div className="grid gap-2">
      <div className={cx('grid gap-2', !stacked && 'sm:flex sm:flex-wrap')}>
        <Button variant="primary" size={size} block={stacked} icon={Download} loading={busy} onClick={() => void handleDownload()}>
          {downloadLabel}
        </Button>
        {showShare && (
          <Button size={size} block={stacked} icon={Share2} onClick={() => void handleShare()}>
            Compartilhar
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
