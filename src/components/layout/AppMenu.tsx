import { Download, EllipsisVertical, Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { IconButton } from '../ui/Button'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { InstallDialog } from './InstallDialog'
import { requestInstall, useInstallMode } from './install-app'

const ITEM =
  'flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-fg transition-colors ' +
  'hover:bg-surface-3 focus-visible:-outline-offset-2'

/**
 * "Mais opções", no canto do cabeçalho do celular: instalar o app e a página Sobre.
 * Um botão que mostra e esconde a lista (padrão "disclosure"): Tab percorre os itens; Esc, tocar fora,
 * sair da lista com o Tab, escolher um item ou trocar de página fecham. Esc devolve o foco ao botão.
 */
export function AppMenu({ className }: { className?: string }) {
  const { pathname } = useLocation()
  // Aberto só na página em que foi aberto: voltar pelo navegador (ou ir a outra página) o fecha.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const [helpOpen, setHelpOpen] = useState(false)
  const mode = useInstallMode()
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      setOpenOn(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function install() {
    setOpenOn(null)
    if (mode !== 'prompt') {
      setHelpOpen(true)
      return
    }
    // Sem esperar nada antes: o navegador só abre o pedido dentro do toque da pessoa.
    void requestInstall().then(
      // O pedido do navegador fechou, e o item do menu já não existe: o foco volta ao botão do menu.
      () => button.current?.focus(),
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error)
        setHelpOpen(true) // o pedido não abriu: as instruções continuam valendo
      },
    )
  }

  return (
    <div
      ref={root}
      className={cx('relative', className)}
      onBlur={(event) => {
        // O foco saiu do menu (Tab depois do último item): fecha, como ao tocar fora.
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpenOn(null)
      }}
    >
      <IconButton
        ref={button}
        icon={EllipsisVertical}
        label="Mais opções"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="aria-expanded:bg-surface-2 aria-expanded:text-fg"
      />
      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-30 mt-2 w-60 animate-enter rounded-xl border border-border bg-surface-2 p-1.5 shadow-2"
        >
          <ul className="grid gap-0.5">
            {mode !== 'installed' && (
              <li>
                <button type="button" className={ITEM} onClick={install}>
                  <Icon icon={Download} className="text-fg-muted" />
                  Instalar o app
                </button>
              </li>
            )}
            <li>
              <Link to="/sobre" className={ITEM} onClick={() => setOpenOn(null)}>
                <Icon icon={Info} className="text-fg-muted" />
                Sobre o Media Tools
              </Link>
            </li>
          </ul>
        </div>
      )}
      <InstallDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false)
          button.current?.focus()
        }}
      />
    </div>
  )
}
