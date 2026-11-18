import { ArrowLeftRight } from 'lucide-react'
import { DownloadActions } from '../../../components/tool/DownloadActions'
import { Button } from '../../../components/ui/Button'
import type { ConvertState, ConvertSummary } from './convert-state'

interface ConvertActionsProps {
  summary: ConvertSummary
  run: ConvertState['run']
  size: 'md' | 'lg'
  onConvert: () => void
  onCancel: () => void
  onReset: () => void
  getFiles: () => File[]
  bundle: () => Promise<{ blob: Blob; name: string }>
}

/** Ação principal de cada fase: converter, cancelar ou baixar. Usada no painel e na barra do celular. */
export function ConvertActions({ summary, run, size, onConvert, onCancel, onReset, getFiles, bundle }: ConvertActionsProps) {
  if (summary.isConverting) {
    return (
      <div className="grid gap-2">
        {run && (
          // Progresso visível; o leitor de tela recebe só o início e o fim, pela região de status da página.
          <p className="text-center text-sm text-fg-muted" aria-hidden="true">
            Convertendo {Math.min(run.completed + 1, run.total)} de {run.total}
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
          Converter outras
        </Button>
      </div>
    )
  }

  const label = summary.inspecting > 0 ? 'Preparando…' : summary.ready > 1 ? `Converter ${summary.ready} imagens` : 'Converter'
  return (
    <Button variant="primary" size={size} block icon={ArrowLeftRight} disabled={!summary.canConvert} onClick={onConvert}>
      {label}
    </Button>
  )
}
