import { Film, Image as ImageIcon, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { POPULAR_TOOLS } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { NavCard } from '../components/ui/NavCard'
import { NavList } from '../components/ui/NavList'

export function HomePage() {
  return (
    <>
      <title>Media Tools · Imagens e vídeos no navegador</title>
      <Container className="grid gap-12 py-10 md:gap-16 md:py-16">
        <section aria-labelledby="home-title" className="grid gap-3">
          <h1 id="home-title" className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Converta e edite imagens e vídeos no navegador
          </h1>
          <p className="max-w-2xl text-base text-fg-muted md:text-lg">
            Gratuito e sem cadastro. Escolha um arquivo, ajuste o que precisa e baixe o resultado.
          </p>
        </section>

        <section aria-labelledby="categories-title">
          <h2 id="categories-title" className="sr-only">
            Categorias
          </h2>
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <NavCard
              to="/imagens"
              icon={ImageIcon}
              title="Imagens"
              description="Converter, comprimir, redimensionar, recortar, girar e espelhar."
              meta="JPG · PNG · WEBP"
            />
            <NavCard
              to="/videos"
              icon={Film}
              title="Vídeos"
              description="Converter, comprimir, cortar trechos e extrair áudio."
              badge={<Badge>Em breve</Badge>}
            />
          </div>
        </section>

        <section aria-labelledby="popular-title" className="grid gap-4">
          <h2 id="popular-title" className="text-xl font-semibold tracking-tight">
            Ferramentas populares
          </h2>
          <NavList items={POPULAR_TOOLS} columns={2} />
        </section>

        <p className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 text-sm text-fg-muted">
          <Icon icon={ShieldCheck} className="text-success" />
          <span>
            As imagens são abertas e convertidas pelo seu navegador. Nenhum arquivo é enviado para servidores.{' '}
            <Link
              to="/sobre#processamento-local"
              className="whitespace-nowrap text-accent-soft underline underline-offset-4 transition-colors hover:text-fg"
            >
              Como funciona
            </Link>
          </span>
        </p>
      </Container>
    </>
  )
}
