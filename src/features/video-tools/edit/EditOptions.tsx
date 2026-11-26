import { TriangleAlert } from 'lucide-react'
import { formatTime } from '../../../core/video/time'
import { editedDuration, type Edit, type SavePlan, type Selection } from '../../../core/video/timeline'
import { Note } from '../shared/Note'

interface EditOptionsProps {
  edit: Edit
  /** A parte marcada para sair. */
  selection?: Selection
  plan: SavePlan
  /** Por que este navegador não consegue salvar a edição atual. */
  saveBlocker?: string
  extraTracks: boolean
}

const SAVE_DESCRIPTIONS: Record<SavePlan['kind'], string> = {
  unchanged: 'Marque na barra a parte que quer tirar e toque em Excluir para poder salvar.',
  trim: 'Sobrou um trecho só: quando dá, ele é copiado sem refazer, rápido e sem perder qualidade.',
  join: 'Para juntar os pedaços, o vídeo é refeito, o que pode demorar em vídeos longos. As emendas ficam no ponto exato.',
}

/** Resumo do vídeo editado, a parte marcada e como ele será salvo. */
export function EditOptions({ edit, selection, plan, saveBlocker, extraTracks }: EditOptionsProps) {
  return (
    <div className="grid gap-6">
      <dl className="grid gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Vídeo final</dt>
          <dd className="tabular-nums text-fg">{formatTime(editedDuration(edit.pieces))}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Pedaços</dt>
          <dd className="tabular-nums text-fg">{edit.pieces.length}</dd>
        </div>
        {selection && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">Parte marcada</dt>
            <dd className="text-right tabular-nums text-accent">
              {`${formatTime(selection.start)} a ${formatTime(selection.end)} · ${formatTime(selection.end - selection.start)}`}
            </dd>
          </div>
        )}
      </dl>

      {saveBlocker ? (
        <Note icon={TriangleAlert} tone="text-warning">
          {saveBlocker}
        </Note>
      ) : (
        <p className="text-xs text-fg-muted">{SAVE_DESCRIPTIONS[plan.kind]}</p>
      )}

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
    </div>
  )
}
