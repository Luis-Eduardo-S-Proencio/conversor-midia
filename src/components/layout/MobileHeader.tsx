import { Link } from 'react-router'
import { Logo } from '../brand/Logo'
import { AppMenu } from './AppMenu'
import { Container } from './Container'

/**
 * Cabeçalho do celular: a marca e, no canto, o menu "Mais opções" (instalar o app, Sobre).
 * A navegação fica na barra inferior; a partir de 768 px, na lateral.
 */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg pt-[env(safe-area-inset-top)] md:hidden">
      <Container className="flex h-14 items-center justify-between gap-3">
        <Link to="/" className="-mx-1 flex h-11 items-center rounded-md px-1">
          <Logo />
        </Link>
        <AppMenu className="-mr-2" />
      </Container>
    </header>
  )
}
