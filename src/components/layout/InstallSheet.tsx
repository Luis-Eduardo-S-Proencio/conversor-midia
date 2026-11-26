import { Share, SquarePlus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** Ícone do botão do navegador citado no passo, para a pessoa reconhecê-lo. O nome vem escrito ao lado. */
function BrowserIcon({ icon }: { icon: LucideIcon }) {
  return <Icon icon={icon} size="sm" className="inline align-text-bottom text-fg" />
}

const STEPS: readonly ReactNode[] = [
  <>
    Toque em <BrowserIcon icon={Share} /> <strong className="font-semibold text-fg">Compartilhar</strong>, na barra do Safari.
  </>,
  <>
    Role a lista e toque em <BrowserIcon icon={SquarePlus} />{' '}
    <strong className="font-semibold text-fg">Adicionar à Tela de Início</strong>.
  </>,
  <>
    Toque em <strong className="font-semibold text-fg">Adicionar</strong>. O ícone do Media Tools aparece na tela inicial.
  </>,
]

interface InstallSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Instalação guiada no iPhone e no iPad: o Safari não deixa o site abrir um pedido de instalação,
 * então o painel mostra o caminho pelo próprio Safari.
 */
export function InstallSheet({ open, onClose }: InstallSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      closeLabel="Fechar"
      title="Instalar o app"
      description="Instalado, o Media Tools abre pelo ícone da tela inicial, em tela cheia, como um app."
      footer={
        <Button block onClick={onClose}>
          Entendi
        </Button>
      }
    >
      <ol className="grid gap-3">
        {STEPS.map((step, index) => (
          <li key={index} className="flex items-start gap-3 rounded-md bg-surface-3 px-4 py-3 text-secondary text-fg-muted">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-accent tabular-nums"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </BottomSheet>
  )
}
