import { CircleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/** Atributos que ligam o controle ao rótulo, à dica e ao erro. */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** Conteúdo à direita do rótulo, como o valor atual de um slider. */
  trailing?: ReactNode
  id?: string
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

export function Field({ label, hint, error, trailing, id: idProp, className, children }: FieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('grid min-w-0 gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {trailing}
      </div>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="flex gap-1.5 text-sm text-danger">
          <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}
