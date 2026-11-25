import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { formatTime } from '../../../core/video/time'
import { editedDuration, type Edit, type Piece, type SavePlan, type Selection } from '../../../core/video/timeline'
import { checkRange, checkTimeValues, fieldsOfRange, type TrimError, type TrimField, type TrimFields } from '../../../core/video/trim'
import { Note } from '../shared/Note'
import { TimeFields } from '../shared/TimeFields'

interface FineAdjustProps {
  piece: Piece
  /** Posição do pedaço, para o texto. */
  index: number
  selection: Selection
  duration: number
  onApply: (start: number, end: number) => void
  disabled: boolean
}

/** Começo e fim da parte marcada, digitados em tempo do vídeo original, para quem quer precisão de centésimos. */
function FineAdjust({ piece, index, selection, duration, onApply, disabled }: FineAdjustProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const [fields, setFields] = useState<TrimFields>(() => fieldsOfRange(selection))
  const [error, setError] = useState<TrimError>()

  function apply(event: FormEvent) {
    event.preventDefault()
    const checked = checkTimeValues(fields, duration)
    const validation = checked.ok ? checkRange(fields, checked.values, duration, 'A parte') : checked
    if (!validation.ok) return setError(validation.error)
    const { start, end } = validation.range
    if (start < piece.start - 0.005 || end > piece.end + 0.005) {
      return setError({
        message: `A parte marcada fica dentro do pedaço ${index + 1}, de ${formatTime(piece.start)} a ${formatTime(piece.end)} do vídeo original.`,
        fields: start < piece.start - 0.005 ? ['start'] : ['end'],
        missing: false,
      })
    }
    setError(undefined)
    onApply(start, end)
  }

  return (
    <form onSubmit={apply} className="grid gap-3" noValidate>
      <p className="text-xs text-fg-muted">{`Parte marcada do pedaço ${index + 1}, em tempo do vídeo original.`}</p>
      <TimeFields
        values={fields}
        onChange={(field: TrimField, text: string) => setFields((current) => ({ ...current, [field]: text }))}
        invalid={error?.fields ?? []}
        errorId={errorId}
        hintId={hintId}
        inputRef={() => {}}
        disabled={disabled}
      />
      {error && (
        <p id={errorId} role="alert" className="flex gap-1.5 text-sm text-danger">
          <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
          <span>{error.message}</span>
        </p>
      )}
      <p id={hintId} className="text-xs text-fg-subtle">
        Digite como 1:05,30 e toque em Aplicar; depois, em Excluir.
      </p>
      <Button type="submit" disabled={disabled} className="justify-self-start">
        Aplicar
      </Button>
    </form>
  )
}

interface EditOptionsProps {
  edit: Edit
  duration: number
  /** A parte marcada para sair. */
  selection?: Selection
  plan: SavePlan
  /** Por que este navegador não consegue salvar a edição atual. */
  saveBlocker?: string
  onSelectionChange: (start: number, end: number) => void
  extraTracks: boolean
  disabled?: boolean
}

const SAVE_DESCRIPTIONS: Record<SavePlan['kind'], string> = {
  unchanged: 'Marque na barra a parte que quer tirar e toque em Excluir para poder salvar.',
  trim: 'Sobrou um trecho só: quando dá, ele é copiado sem refazer, rápido e sem perder qualidade.',
  join: 'Para juntar os pedaços, o vídeo é refeito, o que pode demorar em vídeos longos. As emendas ficam no ponto exato.',
}

/** Resumo do vídeo editado, a parte marcada, como ele será salvo e o ajuste fino da parte marcada. */
export function EditOptions({ edit, duration, selection, plan, saveBlocker, onSelectionChange, extraTracks, disabled = false }: EditOptionsProps) {
  const index = selection ? edit.pieces.findIndex((piece) => piece.id === selection.id) : -1
  const piece = edit.pieces[index]

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

      <details className="grid gap-3 border-t border-border pt-4">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-fg pointer-fine:min-h-0">Ajuste fino</summary>
        <div className="mt-3">
          {piece && selection ? (
            <FineAdjust
              key={`${selection.id}:${selection.start}:${selection.end}`}
              piece={piece}
              index={index}
              selection={selection}
              duration={duration}
              onApply={onSelectionChange}
              disabled={disabled}
            />
          ) : (
            <p className="text-xs text-fg-muted">Toque no vídeo na barra para marcar uma parte e digitar o começo e o fim dela com precisão de centésimos.</p>
          )}
        </div>
      </details>

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
