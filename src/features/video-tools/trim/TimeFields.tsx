import { Field } from '../../../components/ui/Field'
import { Input } from '../../../components/ui/Input'
import { TRIM_FIELDS, type TrimField, type TrimFields } from '../../../core/video/trim'

const FIELD_LABELS: Record<TrimField, string> = { start: 'Início', end: 'Fim' }

interface TimeFieldsProps {
  values: TrimFields
  onChange: (field: TrimField, text: string) => void
  /** Lido pelo leitor de tela depois de "Início" e "Fim" (ex.: " da parte 2"); na tela, só o rótulo curto. */
  labelSuffix?: string
  /** Campos com problema: ganham `aria-invalid` e a descrição do erro. */
  invalid: readonly TrimField[]
  errorId: string
  hintId: string
  inputRef: (field: TrimField, element: HTMLInputElement | null) => void
  disabled?: boolean
}

/** Início e fim lado a lado, em minutos e segundos ("1:05,30"). */
export function TimeFields({ values, onChange, labelSuffix, invalid, errorId, hintId, inputRef, disabled = false }: TimeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
      {TRIM_FIELDS.map((field) => {
        const wrong = invalid.includes(field)
        return (
          <Field
            key={field}
            label={
              <>
                {FIELD_LABELS[field]}
                {labelSuffix && <span className="sr-only">{labelSuffix}</span>}
              </>
            }
          >
            {(control) => (
              <Input
                {...control}
                ref={(element) => inputRef(field, element)}
                value={values[field]}
                onChange={(event) => onChange(field, event.currentTarget.value)}
                placeholder="0:00,00"
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                className="font-mono"
                aria-invalid={wrong || undefined}
                aria-describedby={wrong ? `${errorId} ${hintId}` : hintId}
              />
            )}
          </Field>
        )
      })}
    </div>
  )
}
