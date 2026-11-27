import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface Choice<T extends string> {
  value: T
  /** Nome para o leitor de tela (e a dica ao passar o mouse). */
  name: string
  content: (checked: boolean) => ReactNode
}

interface ChoiceGridProps<T extends string> {
  label: string
  options: readonly Choice<T>[]
  value: T | undefined
  onChange: (value: T) => void
  columns: number
  /** Classes de cada opção; a marcada tem `aria-checked`, para estilizar por ele. */
  optionClassName?: string
  /** Item extra no fim da grade, fora do grupo de rádio (ex.: escolher outra cor). */
  trailing?: ReactNode
  className?: string
}

/**
 * Escolha única em grade (modelos de layout, cores): grupo de rádio em que as setas andam também
 * para cima e para baixo, como numa grade de verdade.
 */
export function ChoiceGrid<T extends string>({
  label,
  options,
  value,
  onChange,
  columns,
  optionClassName,
  trailing,
  className,
}: ChoiceGridProps<T>) {
  const labelId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabbable = selectedIndex >= 0 ? selectedIndex : 0

  function select(index: number) {
    const option = options[index]
    if (!option) return
    if (option.value !== value) onChange(option.value)
    buttons.current[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const steps: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }
    let target: number | undefined
    if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = options.length - 1
    else if (steps[event.key] !== undefined) target = Math.min(options.length - 1, Math.max(0, index + (steps[event.key] ?? 0)))
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div className={className ? `grid gap-2.5 ${className}` : 'grid gap-2.5'}>
      <span id={labelId} className="text-sm font-medium text-fg">
        {label}
      </span>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        <div role="radiogroup" aria-labelledby={labelId} className="contents">
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
                aria-label={option.name}
                title={option.name}
                tabIndex={index === tabbable ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={optionClassName}
              >
                {option.content(checked)}
              </button>
            )
          })}
        </div>
        {trailing}
      </div>
    </div>
  )
}
