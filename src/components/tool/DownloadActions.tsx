import { Download, Share } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { useMediaQuery } from '../ui/useMediaQuery'
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

/**
 * Baixar e, em aparelhos de toque que permitem, "Salvar na galeria".
 * No iPhone o download vai para o app Arquivos; a galeria só é alcançada pelo compartilhamento.
 */
export function DownloadActions({ getFiles, bundle, downloadLabel = 'Baixar', size = 'md', stacked = false }: DownloadActionsProps) {
  const isTouchDevice = useMediaQuery('(pointer: coarse)')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showShare = isTouchDevice && typeof navigator.canShare === 'function'

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
      setError('Este navegador não permite salvar estes arquivos na galeria. Use o botão Baixar.')
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
          <Button size={size} block={stacked} icon={Share} onClick={() => void handleShare()}>
            Salvar na galeria
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
