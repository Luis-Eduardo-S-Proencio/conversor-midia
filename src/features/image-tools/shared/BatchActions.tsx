import type { LucideIcon } from 'lucide-react'
import { DownloadActions } from '../../../components/tool/DownloadActions'
import { Button } from '../../../components/ui/Button'
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
}

/** Ação principal de cada fase: começar, cancelar ou baixar. Usada no painel e na barra do celular. */
export function BatchActions({ summary, progress, labels, icon, size, onStart, onCancel, onReset, getFiles, bundle }: BatchActionsProps) {
  if (summary.isProcessing) {
    return (
      <div className="grid gap-2">
        {progress && (
          // Progresso visível; o leitor de tela recebe só o início e o fim, pela região de status da página.
          <p className="text-center text-sm text-fg-muted" aria-hidden="true">
            {labels.progress} {Math.min(progress.completed + 1, progress.total)} de {progress.total}
          </p>
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
        <Button variant="ghost" size={size} block onClick={onReset}>
          {labels.action} outras
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
