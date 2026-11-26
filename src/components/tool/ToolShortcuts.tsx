import { useId } from 'react'
import { Chip } from '../ui/Chip'

interface ToolShortcut<T extends string> {
  value: T
  label: string
}

interface ToolShortcutsProps<T extends string> {
  /** "Enviar por", "Converter para": o que a escolha ajusta. */
  label: string
  options: readonly ToolShortcut<T>[]
  /** Escolhido agora (marcado); tocar de novo desfaz. */
  value: T | undefined
  onChange: (value: T | undefined) => void
}

/**
 * Atalhos da ferramenta embaixo da área de abrir: a escolha já fica feita antes do arquivo (ex.: comprimir
 * para o WhatsApp, converter para PDF) e aparece marcada nas opções depois.
 */
export function ToolShortcuts<T extends string>({ label, options, value, onChange }: ToolShortcutsProps<T>) {
  const labelId = useId()
  return (
    <div className="grid gap-2">
      <p id={labelId} className="text-caption text-fg-muted">
        {label}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.value} selected={option.value === value} onClick={() => onChange(option.value === value ? undefined : option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
