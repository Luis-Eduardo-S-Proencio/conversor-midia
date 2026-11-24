import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  /** Muitas opções: quebra em linhas de quatro, ocupando a largura toda. Sem isso, uma linha só. */
  columns?: 4
  className?: string
}

const ARROW_STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Escolha única entre poucas opções (ex.: formato de saída).
 * Padrão de grupo de rádio: Tab entra no item marcado e as setas mudam a seleção.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  columns,
  className,
}: SegmentedControlProps<T>) {
  const labelId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const enabledIndexes = options.flatMap((option, index) => (disabled || option.disabled ? [] : [index]))
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabbableIndex = enabledIndexes.includes(selectedIndex) ? selectedIndex : (enabledIndexes[0] ?? -1)

  function select(index: number) {
    const option = options[index]
    if (!option) return
    // Como no rádio nativo, a opção já marcada não gera mudança (evita refazer resultados à toa).
    if (option.value !== value) onChange(option.value)
    buttons.current[index]?.focus()
  }

  function targetFor(key: string, currentIndex: number): number | undefined {
    if (key === 'Home') return enabledIndexes[0]
    if (key === 'End') return enabledIndexes.at(-1)
    const step = ARROW_STEP[key]
    if (step === undefined) return undefined
    const position = enabledIndexes.indexOf(currentIndex)
    return enabledIndexes[(position + step + enabledIndexes.length) % enabledIndexes.length]
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = targetFor(event.key, index)
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div className={cx('grid gap-2', className)}>
      <span id={labelId} className="text-sm font-medium text-fg">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        className={cx(
          'grid w-full gap-1.5',
          columns === 4 ? 'grid-cols-4' : 'auto-cols-fr grid-flow-col sm:w-auto sm:justify-self-start',
        )}
      >
        {options.map((option, index) => {
          const checked = index === selectedIndex
          return (
            <button
              key={option.value}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={index === tabbableIndex ? 0 : -1}
              disabled={disabled || option.disabled}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                'h-9 rounded-md border text-sm font-semibold tabular-nums transition-colors pointer-coarse:h-11',
                // Em colunas, as opções encolhem para caber em telas de 320 px.
                columns ? 'min-w-0 px-1' : 'min-w-16 px-3',
                'disabled:cursor-not-allowed disabled:opacity-50',
                // No alto contraste do Windows fundo e borda somem; o sublinhado mantém a seleção visível.
                checked
                  ? 'border-accent bg-accent-subtle text-fg forced-colors:underline forced-colors:underline-offset-4'
                  : 'border-border bg-surface-raised text-fg-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
