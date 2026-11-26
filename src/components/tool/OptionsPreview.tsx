import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'

interface OptionsPreviewProps {
  /** O que vai dar para ajustar, na ordem do painel ("Converter para", "Qualidade"). */
  adjustables: readonly string[]
  /** "uma imagem", "um vídeo": completa "Abra … para ajustar". */
  subject: string
  actionLabel: string
  actionIcon: LucideIcon
  className?: string
}

/**
 * Computador, antes de abrir o arquivo: o painel de opções já aparece, desligado, mostrando o que vai
 * dar para ajustar (no lugar de um palco vazio enorme).
 */
export function OptionsPreview({ adjustables, subject, actionLabel, actionIcon, className }: OptionsPreviewProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cx('surface-card grid content-start gap-5 rounded-xl p-5 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start', className)}>
      <div className="grid gap-1">
        <h2 id={headingId} className="font-sans text-section">
          Opções
        </h2>
        <p className="text-secondary text-fg-muted">{`Abra ${subject} para ajustar.`}</p>
      </div>
      <ul className="grid gap-2" aria-label="O que dá para ajustar">
        {adjustables.map((name) => (
          <li key={name} className="flex h-11 items-center justify-between gap-3 rounded-md border border-border bg-surface-1 px-3 text-sm text-fg-muted">
            {name}
            <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-surface-3" />
          </li>
        ))}
      </ul>
      <Button variant="primary" size="lg" block icon={actionIcon} disabled>
        {actionLabel}
      </Button>
    </section>
  )
}
