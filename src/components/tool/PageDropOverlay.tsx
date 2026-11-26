import { Upload } from 'lucide-react'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'

interface PageDropOverlayProps {
  active: boolean
  label?: string
}

/**
 * Arquivo arrastado sobre a página: o visor de câmera cobre a tela e as cantoneiras se fecham no
 * acento, com "Solte para abrir". Só visual (quem solta já sabe o que fez; o resultado é anunciado).
 */
export function PageDropOverlay({ active, label = 'Solte para abrir' }: PageDropOverlayProps) {
  return (
    <div
      aria-hidden="true"
      data-dragover={active || undefined}
      className={cx(
        'viewfinder pointer-events-none fixed inset-3 z-40 grid place-items-center rounded-xl transition-opacity duration-(--dur-2)',
        active ? 'opacity-100' : 'invisible opacity-0',
      )}
    >
      <div className="grid justify-items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon icon={Upload} size="lg" />
        </span>
        <p className="text-section text-fg">{label}</p>
      </div>
    </div>
  )
}
