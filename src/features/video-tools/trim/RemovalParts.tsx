import { Plus, X } from 'lucide-react'
import { useId } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { cx } from '../../../components/ui/cx'
import { MAX_REMOVED_PARTS, type RemovalPart } from '../../../core/video/remove'
import type { TrimField } from '../../../core/video/trim'
import { TimeFields } from '../shared/TimeFields'

interface RemovalPartsProps {
  parts: readonly RemovalPart[]
  /** A parte que os botões do player marcam. */
  active: number
  /** Parte e campos com problema, quando o erro já deve aparecer. */
  invalid?: { part?: number; fields: readonly TrimField[] }
  errorId: string
  hintId: string
  onFieldChange: (part: number, field: TrimField, text: string) => void
  onActivate: (part: number) => void
  onAdd: () => void
  onRemove: (part: number) => void
  inputRef: (part: number, field: TrimField, element: HTMLInputElement | null) => void
  disabled?: boolean
}

/** Lista das partes a tirar do vídeo. A parte em que a pessoa está fica destacada: é ela que o player marca. */
export function RemovalParts({ parts, active, invalid, errorId, hintId, onFieldChange, onActivate, onAdd, onRemove, inputRef, disabled = false }: RemovalPartsProps) {
  const id = useId()
  const full = parts.length >= MAX_REMOVED_PARTS

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {parts.map((part, index) => {
          const number = index + 1
          const titleId = `${id}-parte-${part.id}`
          const current = part.id === active
          return (
            <li key={part.id}>
              <div
                role="group"
                aria-labelledby={titleId}
                onFocus={() => onActivate(part.id)}
                className={cx('grid gap-3 rounded-md border p-3', current ? 'border-accent bg-accent-subtle' : 'border-border')}
              >
                <div className="flex min-h-8 items-center justify-between gap-2">
                  <p className="flex items-baseline gap-2 text-sm">
                    <span id={titleId} className="font-medium text-fg">{`Parte ${number}`}</span>
                    {current && <span className="text-xs text-accent-soft">marcando no vídeo</span>}
                  </p>
                  {parts.length > 1 && (
                    <IconButton icon={X} label={`Tirar a parte ${number} da lista`} onClick={() => onRemove(part.id)} disabled={disabled} />
                  )}
                </div>
                <TimeFields
                  values={part}
                  onChange={(field, text) => onFieldChange(part.id, field, text)}
                  labelSuffix={` da parte ${number}`}
                  invalid={invalid?.part === part.id ? invalid.fields : []}
                  errorId={errorId}
                  hintId={hintId}
                  inputRef={(field, element) => inputRef(part.id, field, element)}
                  disabled={disabled}
                />
              </div>
            </li>
          )
        })}
      </ol>
      <Button variant="ghost" icon={Plus} onClick={onAdd} disabled={disabled || full}>
        Adicionar parte
      </Button>
      {full && <p className="text-xs text-fg-subtle">{`Até ${MAX_REMOVED_PARTS} partes por vez.`}</p>}
    </div>
  )
}
