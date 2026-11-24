import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { formatTime } from '../../../core/video/time'
import { edgeLimits, editedDuration, type Edit, type Piece, type SavePlan } from '../../../core/video/timeline'
import { checkRange, checkTimeValues, fieldsOfRange, type TrimError, type TrimField, type TrimFields } from '../../../core/video/trim'
import { Note } from '../shared/Note'
import { TimeFields } from '../shared/TimeFields'

interface FineAdjustProps {
  edit: Edit
  piece: Piece
  /** Posição do pedaço, para o título. */
  index: number
  duration: number
  onApply: (start: number, end: number) => void
  disabled: boolean
}

/** Começo e fim do pedaço selecionado, digitados em tempo do vídeo original, para quem quer precisão de centésimos. */
function FineAdjust({ edit, piece, index, duration, onApply, disabled }: FineAdjustProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const [fields, setFields] = useState<TrimFields>(() => fieldsOfRange(piece))
  const [error, setError] = useState<TrimError>()
  const min = edgeLimits(edit, piece.id, 'start', duration).min
  const max = edgeLimits(edit, piece.id, 'end', duration).max

  function apply(event: FormEvent) {
    event.preventDefault()
    const checked = checkTimeValues(fields, duration)
    const validation = checked.ok ? checkRange(fields, checked.values, duration, 'O pedaço') : checked
    if (!validation.ok) return setError(validation.error)
    const { start, end } = validation.range
    if (start < min - 0.005 || end > max + 0.005) {
      return setError({
        message: `Este pedaço pode ir de ${formatTime(min)} a ${formatTime(max)} do vídeo original, sem passar dos vizinhos.`,
        fields: start < min ? ['start'] : ['end'],
        missing: false,
      })
    }
    setError(undefined)
    onApply(start, end)
  }

  return (
    <form onSubmit={apply} className="grid gap-3" noValidate>
      <p className="text-xs text-fg-muted">{`Pedaço ${index + 1}, em tempo do vídeo original.`}</p>
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
        Digite como 1:05,30.
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
  selected?: number
  plan: SavePlan
  /** Por que este navegador não consegue salvar a edição atual. */
  saveBlocker?: string
  onRangeChange: (id: number, start: number, end: number) => void
  extraTracks: boolean
  disabled?: boolean
}

const SAVE_DESCRIPTIONS: Record<SavePlan['kind'], string> = {
  unchanged: 'Divida o vídeo e exclua partes, ou arraste as pontas de um pedaço, para poder salvar.',
  trim: 'Sobrou um trecho só: quando dá, ele é copiado sem refazer, rápido e sem perder qualidade.',
  join: 'Para juntar os pedaços, o vídeo é refeito, o que pode demorar em vídeos longos. As emendas ficam no ponto exato.',
}

/** Resumo do vídeo editado, como ele será salvo e o ajuste fino do pedaço selecionado. */
export function EditOptions({ edit, duration, selected, plan, saveBlocker, onRangeChange, extraTracks, disabled = false }: EditOptionsProps) {
  const index = edit.pieces.findIndex((piece) => piece.id === selected)
  const piece = edit.pieces[index]

  return (
    <div className="grid gap-6">
      <dl className="grid gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Vídeo final</dt>
          <dd className="font-mono tabular-nums text-fg">{formatTime(editedDuration(edit.pieces))}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Pedaços</dt>
          <dd className="font-mono tabular-nums text-fg">{edit.pieces.length}</dd>
        </div>
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
          {piece ? (
            <FineAdjust
              key={`${piece.id}:${piece.start}:${piece.end}`}
              edit={edit}
              piece={piece}
              index={index}
              duration={duration}
              onApply={(start, end) => onRangeChange(piece.id, start, end)}
              disabled={disabled}
            />
          ) : (
            <p className="text-xs text-fg-muted">Toque num pedaço da barra para ajustar o começo e o fim dele com precisão de centésimos.</p>
          )}
        </div>
      </details>

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
