import { Logo } from '../brand/Logo'
import { InstallButton } from './InstallButton'
import { TransitionLink } from './TransitionLink'
import { useScrolled } from './useScrolled'

/**
 * Cabeçalho das telas raiz no celular (Início, Imagens, Vídeos): a marca e "Instalar", quando der
 * para instalar. Ganha fundo com desfoque e borda só depois que a página rola. Fica parado na troca
 * de página (view-transition-name próprio).
 */
export function RootHeader() {
  const scrolled = useScrolled()
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-10 border-b border-transparent pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-(--dur-2) [view-transition-name:app-header] data-scrolled:glass-header data-scrolled:border-border md:hidden"
    >
      <div className="flex h-(--header-h) items-center justify-between gap-3 px-(--gutter)">
        <TransitionLink to="/" direction="tab" className="pressable -mx-1 flex h-11 items-center rounded-md px-1">
          <Logo className="font-display" />
        </TransitionLink>
        <InstallButton variant="header" />
      </div>
    </header>
  )
}
