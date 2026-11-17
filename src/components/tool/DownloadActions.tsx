import { Download, Share } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { useMediaQuery } from '../ui/useMediaQuery'
import { canShareFiles, saveBlob, shareFiles } from './download'

interface DownloadActionsProps {
  file: File
  downloadLabel?: string
}

/**
 * Botão de download e, em aparelhos de toque com suporte, "Salvar na galeria".
 * No iPhone o download vai para o app Arquivos; a galeria só é alcançada pelo compartilhamento.
 */
export function DownloadActions({ file, downloadLabel = 'Baixar' }: DownloadActionsProps) {
  const isTouchDevice = useMediaQuery('(pointer: coarse)')
  const [shareError, setShareError] = useState<string | null>(null)
  const showShare = isTouchDevice && canShareFiles([file])

  async function handleShare() {
    setShareError(null)
    try {
      await shareFiles([file])
    } catch {
      setShareError('Não foi possível abrir o compartilhamento. Use o botão Baixar.')
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button variant="primary" icon={Download} onClick={() => saveBlob(file, file.name)}>
          {downloadLabel}
        </Button>
        {showShare && (
          <Button icon={Share} onClick={() => void handleShare()}>
            Salvar na galeria
          </Button>
        )}
      </div>
      {shareError && (
        <p role="alert" className="text-sm text-danger">
          {shareError}
        </p>
      )}
    </div>
  )
}
