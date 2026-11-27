import { Container } from '../components/layout/Container'
import { TopAppBar } from '../components/layout/TopAppBar'

const LINK = 'text-accent underline underline-offset-4 transition-colors hover:text-fg'

/**
 * Licenças de código aberto: o aviso que as licenças das bibliotecas usadas pedem (LGPL do LAME, MPL do
 * Mediabunny). Fora do Sobre, a pedido; ligada pelo rodapé do menu (☰), como nos apps.
 */
export function LicensesPage() {
  return (
    <>
      <title>Licenças de código aberto · Media Tools</title>
      <TopAppBar title="Licenças de código aberto" backTo="/" />
      <Container className="pt-4 pb-14 md:pt-8">
        <div className="mx-auto max-w-2xl">
          {/* Frases com links no meio: a exceção de alvo pequeno da WCAG 2.5.8 vale para texto corrido. */}
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-1 text-secondary text-fg-muted">
            <li className="px-4 py-4">
              <p>
                Os vídeos são lidos e gerados com o{' '}
                <a href="https://github.com/Vanilagy/mediabunny" rel="noopener noreferrer" className={LINK}>
                  Mediabunny
                </a>
                , sob a licença MPL-2.0. O código-fonte está no link.
              </p>
            </li>
            <li className="px-4 py-4">
              <p>
                O MP3 é gerado pelo LAME, distribuído sob a{' '}
                <a href="/licencas/lame-lgpl.txt" className={LINK}>
                  licença LGPL
                </a>
                , com o código-fonte em{' '}
                <a href="https://lame.sourceforge.io" rel="noopener noreferrer" className={LINK}>
                  lame.sourceforge.io
                </a>
                .
              </p>
            </li>
            <li className="px-4 py-4">
              <p>
                As fontes Inter, Dancing Script, Playfair Display, Courier Prime, Fredoka, Bebas Neue e Caveat usam a licença OFL, e os
                ícones Lucide, a licença ISC.
              </p>
            </li>
          </ul>
        </div>
      </Container>
    </>
  )
}
