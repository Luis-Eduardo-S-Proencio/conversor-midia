import { Link } from 'react-router'
import { Logo } from '../brand/Logo'
import { Container } from './Container'

const FOOTER_LINKS = [
  { to: '/imagens', label: 'Imagens' },
  { to: '/videos', label: 'Vídeos' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/sobre#processamento-local', label: 'Processamento local' },
] as const

// Calculado uma vez, fora do render: o ano não muda durante uma visita.
const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="grid gap-6 py-8 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-2">
          <Logo size="sm" />
          <p className="text-sm text-fg-muted">Ferramentas gratuitas para imagens e vídeos, direto no navegador.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-11 items-center text-fg-muted transition-colors hover:text-fg pointer-fine:min-h-8"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-fg-subtle md:col-span-2">© {CURRENT_YEAR} Media Tools</p>
      </Container>
    </footer>
  )
}
