import type { ReactNode } from 'react'
import { Container } from '../components/layout/Container'
import { PageHeader } from '../components/layout/PageHeader'

function TextSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      {/* tabIndex -1: links com âncora (ex.: "Como funciona") levam o foco até aqui. */}
      <h2 id={id} tabIndex={-1} className="scroll-mt-20 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="grid gap-3 text-base text-fg-muted">{children}</div>
    </section>
  )
}

export function AboutPage() {
  return (
    <>
      <title>Sobre · Media Tools</title>
      <Container className="grid gap-10 py-10 md:py-14">
        <PageHeader
          title="Sobre o Media Tools"
          description="Ferramentas gratuitas para converter, comprimir e editar imagens e vídeos, sem criar conta."
        />
        <div className="grid max-w-2xl gap-10">
          <TextSection id="processamento-local" title="Processamento local">
            <p>
              Os arquivos são abertos e processados pelo próprio navegador, no seu aparelho. Eles não são enviados para
              nenhum servidor.
            </p>
            <p>
              Nada fica guardado no site. Ao fechar a página, as cópias usadas durante o processamento são descartadas;
              fica só o que você baixou.
            </p>
          </TextSection>
          <TextSection id="formatos" title="Formatos">
            <p>Imagens: JPG, PNG e WEBP. As ferramentas de vídeo estão a caminho.</p>
          </TextSection>
          <TextSection id="limites" title="Limites">
            <p>
              Como o trabalho acontece no seu aparelho, arquivos muito grandes podem demorar mais ou não caber na memória,
              principalmente em celulares. Cada ferramenta informa os limites antes de começar.
            </p>
          </TextSection>
        </div>
      </Container>
    </>
  )
}
