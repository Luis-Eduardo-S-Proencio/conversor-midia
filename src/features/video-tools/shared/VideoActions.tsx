import type { LucideIcon } from 'lucide-react'
import { DownloadActions } from '../../../components/tool/DownloadActions'
import { Button } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { ReuseResultButton } from '../../open/ReuseResultButton'
import { outputTexts, type VideoToolLabels, type VideoToolState } from './useVideoTool'

interface VideoActionsProps {
  state: VideoToolState
  labels: VideoToolLabels
  icon: LucideIcon
  size: 'md' | 'lg'
  /** A ferramenta consegue processar este vídeo neste navegador. */
  canStart: boolean
  onStart: () => void
  onCancel: () => void
  onReset: () => void
  getFile: () => File | null
  /** Tempo que falta, pelo ritmo do progresso ("cerca de 30 s"). */
  remaining?: string
}

/** Ação principal de cada fase: começar, acompanhar e cancelar, ou baixar. Usada no painel e na barra do celular. */
export function VideoActions({ state, labels, icon, size, canStart, onStart, onCancel, onReset, getFile, remaining }: VideoActionsProps) {
  const texts = outputTexts(labels)
  if (state.phase === 'processing') {
    return (
      <div className="grid gap-3">
        {/* O leitor de tela recebe só o início e o fim, pela região de status da página. */}
        <ProgressBar
          label={`${labels.progress} ${texts.object}`}
          value={state.progress * 100}
          hint={remaining ? `Faltam ${remaining.replace('quase pronto', 'poucos segundos')}` : undefined}
        />
        <Button size={size} block onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (state.phase === 'done') {
    const getFiles = () => {
      const file = getFile()
      return file ? [file] : []
    }
    return (
      <div className="grid gap-2">
        <DownloadActions getFiles={getFiles} downloadLabel={texts.download} size={size} stacked />
        {(labels.output ?? 'video') === 'video' && <ReuseResultButton kind="video" getFiles={getFiles} size={size} />}
        <Button variant="ghost" size={size} block onClick={onReset}>
          {labels.again ?? `${labels.action} outro vídeo`}
        </Button>
      </div>
    )
  }

  const ready = state.phase === 'ready' || state.phase === 'failed'
  return (
    <Button variant="primary" size={size} block icon={icon} disabled={!ready || !canStart} onClick={onStart}>
      {state.phase === 'opening' ? 'Abrindo…' : labels.action}
    </Button>
  )
}
