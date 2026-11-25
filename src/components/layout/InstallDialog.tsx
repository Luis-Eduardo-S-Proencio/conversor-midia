import { EllipsisVertical, MonitorDown, Share, SquarePlus, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** Ícone do botão do navegador citado na frase, para a pessoa reconhecê-lo. O nome vem escrito ao lado. */
function BrowserIcon({ icon }: { icon: LucideIcon }) {
  return <Icon icon={icon} size="sm" className="inline align-text-bottom text-fg" />
}

const STEPS: ReadonlyArray<{ device: string; how: ReactNode }> = [
  {
    device: 'iPhone e iPad',
    how: (
      <>
        Toque em <BrowserIcon icon={Share} /> Compartilhar e depois em <BrowserIcon icon={SquarePlus} /> Adicionar à Tela de
        Início.
      </>
    ),
  },
  {
    device: 'Android',
    how: (
      <>
        Toque no menu do navegador <BrowserIcon icon={EllipsisVertical} /> e em Instalar app (ou Adicionar à tela inicial).
      </>
    ),
  },
  {
    device: 'Computador',
    how: (
      <>
        No Chrome ou no Edge, clique em <BrowserIcon icon={MonitorDown} /> Instalar, na barra de endereço.
      </>
    ),
  },
]

interface InstallDialogProps {
  open: boolean
  /** Chamado quando o diálogo fecha, por qualquer caminho (botão, Esc ou toque fora). */
  onClose: () => void
}

/**
 * Como instalar o app pelo menu do navegador, quando ele não deixa o site abrir o pedido de instalação
 * (Safari, Firefox, ou o Chrome antes de liberar o pedido). Diálogo nativo (`showModal`): prende o foco
 * e fecha com Esc.
 */
export function InstallDialog({ open, onClose }: InstallDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // Tocar no fundo escurecido fecha: sem preenchimento no <dialog>, só esse toque cai nele mesmo.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-surface-1 p-0 text-fg shadow-2 backdrop:bg-bg/80 open:animate-enter"
    >
      <div className="grid gap-5 p-5">
        <div className="grid gap-1.5">
          <h2 id={titleId} className="text-lg font-bold tracking-tight">
            Instalar o app
          </h2>
          <p className="text-sm text-fg-muted">
            Instalado, o Media Tools abre pelo ícone na tela inicial, sem a barra do navegador.
          </p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border text-sm">
          {STEPS.map((step) => (
            <div key={step.device} className="grid gap-0.5 bg-surface-2 px-4 py-3">
              <dt className="font-semibold text-fg">{step.device}</dt>
              <dd className="text-fg-muted">{step.how}</dd>
            </div>
          ))}
        </dl>
        <Button block onClick={() => dialog.current?.close()}>
          Entendi
        </Button>
      </div>
    </dialog>
  )
}
