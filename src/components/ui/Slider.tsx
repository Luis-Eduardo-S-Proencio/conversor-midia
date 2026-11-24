import { useId, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Field } from './Field'

type NativeRangeProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'id'
>

interface SliderProps extends NativeRangeProps {
  label: ReactNode
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Texto do valor, exibido e anunciado pelo leitor de tela (ex.: "82%"). */
  formatValue?: (value: number) => string
  hint?: ReactNode
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = String,
  hint,
  className,
  style,
  ...rest
}: SliderProps) {
  const id = useId()
  const valueText = formatValue(value)
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      className={className}
      trailing={
        // Só visual: o leitor de tela já ouve o valor pelo aria-valuetext do slider.
        // (Um <output> seria região de status e anunciaria cada mudança duas vezes.)
        <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-accent-soft">
          {valueText}
        </span>
      }
    >
      {(control) => (
        <input
          {...rest}
          {...control}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={valueText}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="slider"
          style={{ ...style, '--fill': `${fill}%` } as CSSProperties}
        />
      )}
    </Field>
  )
}
