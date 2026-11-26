import type { LucideIcon } from 'lucide-react'
import { DownloadActions } from '../../../components/tool/DownloadActions'
import { Button } from '../../../components/ui/Button'
import { ReuseResultButton } from '../../open/ReuseResultButton'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import type { BatchState, BatchSummary } from './batch-state'
import type { BatchLabels } from './constants'

interface BatchActionsProps {
  summary: BatchSummary
  progress: BatchState['run']
  labels: BatchLabels
  icon: LucideIcon
  size: 'md' | 'lg'
  onStart: () => void
  onCancel: () => void
  onReset: () => void
  getFiles: () => File[]
  bundle: () => Promise<{ blob: Blob; name: string }>
  /** Tempo que falta, pelo ritmo do lote ("cerca de 30 s"). */
  remaining?: string
  /** Os resultados são fotos que as ferramentas abrem: oferece "Usar em outra ferramenta". */
  reusable: boolean
}

/** Ação principal de cada fase: começar, cancelar ou baixar. Usada no painel e na barra do celular. */
export function BatchActions({ summary, progress, labels, icon, size, onStart, onCancel, onReset, getFiles, bundle, remaining, reusable }: BatchActionsProps) {
  if (summary.isProcessing) {
    return (
      <div className="grid gap-2">
        {progress && (
          // Progresso do lote; o leitor de tela recebe o início e o fim pela região de status da página.
          <ProgressBar
            label={`${labels.progress} ${Math.min(progress.completed + 1, progress.total)} de ${progress.total}`}
            value={(progress.completed / progress.total) * 100}
            hint={remaining ? `Faltam ${remaining.replace('quase pronto', 'poucos segundos')}` : undefined}
          />
        )}
        <Button size={size} block onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (summary.hasResults) {
    const many = summary.done > 1
    return (
      <div className="grid gap-2">
        <DownloadActions
          getFiles={getFiles}
          bundle={many ? bundle : undefined}
          downloadLabel={many ? 'Baixar todas (.zip)' : 'Baixar imagem'}
          size={size}
          stacked
        />
        {reusable && <ReuseResultButton kind="image" getFiles={getFiles} size={size} />}
        <Button variant="ghost" size={size} block onClick={onReset}>
          {labels.again ?? `${labels.action} outras`}
        </Button>
      </div>
    )
  }

  const label =
    summary.inspecting > 0 ? 'Preparando…' : summary.ready > 1 ? `${labels.action} ${summary.ready} imagens` : labels.action
  return (
    <Button variant="primary" size={size} block icon={icon} disabled={!summary.canStart} onClick={onStart}>
      {label}
    </Button>
  )
}
