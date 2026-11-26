import { ChevronLeft, ChevronRight, Download, Share2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Logo } from '../brand/Logo'
import { Button, IconButton } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/toast-context'
import { useModalDialog } from '../ui/useModalDialog'
import { installPlatform, requestInstall, useInstallMode } from './install-app'
import { InstallSteps } from './InstallSteps'
import { appUrl, shareApp } from './share-app'
import { TransitionLink } from './TransitionLink'

const ROW =
  'flex min-h-13 w-full items-center gap-3.5 px-4 py-2 text-left text-label text-fg transition-colors duration-(--dur-1) hover:pointer-fine:bg-surface-3 focus-visible:-outline-offset-2 active:bg-surface-hover'

function RowContent({ icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <>
      <Icon icon={icon} className="text-fg-muted" />
      <span className="min-w-0 flex-1">{children}</span>
      <Icon icon={ChevronRight} size="sm" className="text-fg-subtle" />
    </>
  )
}

const FOOTER_LINK =
  '-mx-1 flex min-h-11 items-center rounded-sm px-1 text-secondary text-fg-muted underline-offset-4 hover:text-fg hover:underline'

const FOOTER_LINKS = [
  { to: '/sobre', label: 'Sobre o Media Tools' },
  { to: '/termos', label: 'Termos de uso' },
  { to: '/privacidade', label: 'Política de privacidade' },
] as const

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * Menu (☰): gaveta que entra pela esquerda com "Instalar app" (enquanto o app não está instalado) e
 * "Compartilhar app" (folha do sistema; sem ela, copia o link); no rodapé,
 * Sobre o Media Tools, Termos de uso e Política de privacidade. Sem o pedido de instalação
 * do navegador, "Instalar app" mostra o passo a passo do aparelho dentro da própria gaveta.
 * Os links substituem a entrada do menu no histórico: voltar da página aberta leva de volta à tela de antes.
 */
export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const menuTitleId = useId()
  const installTitleId = useId()
  const [view, setView] = useState<'menu' | 'install'>('menu')
  const [wasOpen, setWasOpen] = useState(open)
  const installMode = useInstallMode()
  const toast = useToast()
  const { ref, onCancel, onClick } = useModalDialog(open, onClose)
  const installRow = useRef<HTMLButtonElement>(null)
  const installHeading = useRef<HTMLHeadingElement>(null)
  const switched = useRef(false)

  // Cada abertura começa pelo menu.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setView('menu')
  }

  // Ao trocar de vista dentro da gaveta, o foco acompanha (título do passo a passo, ou de volta ao item).
  useEffect(() => {
    if (!switched.current) return
    switched.current = false
    if (view === 'install') installHeading.current?.focus()
    else installRow.current?.focus()
  }, [view])

  function showView(next: 'menu' | 'install') {
    switched.current = true
    setView(next)
  }

  function install() {
    if (installMode !== 'prompt') {
      showView('install')
      return
    }
    // Sem esperar nada antes: o navegador só abre o pedido dentro do toque da pessoa.
    requestInstall().then(
      (outcome) => {
        if (outcome === 'accepted') toast({ message: 'Pronto! O Media Tools está instalado.', tone: 'success' })
      },
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error)
        toast({ message: 'Não deu para abrir a instalação. Use o menu do navegador e toque em Instalar app.' })
      },
    )
    onClose()
  }

  function share() {
    // A folha do sistema abre já no toque; o menu fecha junto, e o aviso aparece fora da gaveta.
    const outcome = shareApp()
    onClose()
    outcome.then(
      (result) => {
        if (result === 'copied') toast({ message: 'Link copiado.', tone: 'success' })
        if (result === 'failed') toast({ message: `Endereço do app: ${appUrl()}` })
      },
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error)
      },
    )
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={view === 'menu' ? menuTitleId : installTitleId}
      onCancel={onCancel}
      onClick={onClick}
      className="drawer-dialog"
    >
      <div className="drawer-panel flex h-full flex-col border-r border-border bg-surface-1 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-fg shadow-2">
        {view === 'menu' ? (
          <>
            <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-2 pr-2 pl-5">
              <h2 id={menuTitleId} className="sr-only">
                Menu
              </h2>
              <Logo />

              <IconButton icon={X} label="Fechar menu" onClick={onClose} />
            </div>
            <div className="px-3 pt-2">
              <ul className="overflow-hidden rounded-lg bg-surface-2">
                {installMode !== 'installed' && (
                  <li className="border-b border-border">
                    <button ref={installRow} type="button" onClick={install} className={ROW}>
                      <RowContent icon={Download}>Instalar app</RowContent>
                    </button>
                  </li>
                )}
                <li>
                  <button type="button" onClick={share} className={ROW}>
                    <RowContent icon={Share2}>Compartilhar app</RowContent>
                  </button>
                </li>
              </ul>
            </div>
            <nav aria-label="Sobre e documentos" className="mt-auto px-5 pt-6 pb-5">
              <ul className="grid justify-items-start gap-0.5">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.to}>
                    <TransitionLink to={link.to} replace className={FOOTER_LINK}>
                      {link.label}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        ) : (
          <>
            <div className="flex h-(--header-h) shrink-0 items-center gap-1 px-2">
              <IconButton icon={ChevronLeft} label="Voltar ao menu" onClick={() => showView('menu')} />
              <h2 ref={installHeading} id={installTitleId} tabIndex={-1} className="text-label font-semibold focus:outline-none">
                Instalar o app
              </h2>
            </div>
            <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto overscroll-contain px-4 pt-2 pb-5">
              <p className="text-secondary text-fg-muted">
                Instalado, o Media Tools abre pelo ícone na tela inicial, em tela cheia, como os outros apps.
              </p>
              <InstallSteps platform={installPlatform()} />
              <Button block onClick={onClose}>
                Entendi
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
