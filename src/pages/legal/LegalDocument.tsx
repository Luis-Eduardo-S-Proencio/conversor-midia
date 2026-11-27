import { Clock, FileText } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Container } from '../../components/layout/Container'
import { TopAppBar } from '../../components/layout/TopAppBar'
import { Icon } from '../../components/ui/Icon'

export interface LegalSection {
  /** Âncora da seção (vai no endereço: /termos#contato). */
  id: string
  title: string
  content: ReactNode
}

interface LegalDocumentProps {
  title: string
  /** Data da última atualização, por extenso ("26 de novembro de 2026"). */
  updated: string
  summary: ReactNode
  sections: readonly LegalSection[]
}

/**
 * Página de documento legal (Termos de uso, Política de privacidade): selo, título grande, data, resumo,
 * índice numerado e as seções numeradas, com bastante espaço para ler sem cansar.
 * O h1 é o título da barra superior; o título grande repete o nome só para quem vê a tela.
 */
export function LegalDocument({ title, updated, summary, sections }: LegalDocumentProps) {
  const tocId = useId()

  return (
    <>
      <title>{`${title} · Media Tools`}</title>
      <TopAppBar title={title} backTo="/" />
      <Container className="pt-4 pb-20 md:pt-10">
        <article className="mx-auto max-w-3xl">
          <header className="grid justify-items-start gap-5 pb-9">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-1 px-3 py-1 text-caption text-fg-muted">
              <Icon icon={FileText} size="sm" />
              Documento legal
            </span>
            <p aria-hidden="true" className="text-display text-fg">
              {title}
            </p>
            <p className="flex items-center gap-2 text-secondary text-fg-subtle">
              <Icon icon={Clock} size="sm" />
              {`Última atualização: ${updated}`}
            </p>
            <div className="max-w-2xl text-body leading-relaxed text-fg-muted">{summary}</div>
          </header>

          <div aria-hidden="true" className="flex items-center">
            <span className="h-0.5 w-14 rounded-full bg-accent" />
            <span className="h-px flex-1 bg-border" />
          </div>

          <nav aria-labelledby={tocId} className="mt-9 rounded-xl border border-border bg-surface-1 p-5 md:p-7">
            <h2 id={tocId} className="text-label font-semibold text-fg">
              Neste documento
            </h2>
            <ol className="mt-3 grid gap-x-10 md:grid-cols-2">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 text-secondary text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <span className="w-5 shrink-0 text-right text-fg-subtle tabular-nums">{index + 1}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-14 grid gap-14">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} tabIndex={-1} aria-labelledby={`${section.id}-titulo`} className="grid scroll-mt-24 gap-4 focus:outline-none">
                <h2 id={`${section.id}-titulo`} className="flex items-baseline gap-3 border-b border-border pb-3 text-section text-fg">
                  <span className="text-fg-subtle tabular-nums">{`${index + 1}.`}</span>
                  {section.title}
                </h2>
                <div className="grid gap-4 text-secondary leading-relaxed text-fg-muted">{section.content}</div>
              </section>
            ))}
          </div>
        </article>
      </Container>
    </>
  )
}

/** Lista com marcadores discretos, para os itens de uma seção. */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2.5 pl-5 marker:text-fg-subtle">{children}</ul>
}

/** Destaque dentro do texto (o que mais importa numa frase). */
export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>
}

export const LEGAL_LINK = 'text-accent underline underline-offset-4 transition-colors hover:text-fg'

/** Canal de contato do responsável pelo site, o mesmo nos dois documentos. */
export const LEGAL_CONTACT = 'luis.eduardo.proencio@gmail.com'

/** Data da versão atual de cada documento. */
export const TERMS_UPDATED = '26 de novembro de 2026'
export const PRIVACY_UPDATED = '27 de novembro de 2026'

export function ContactLink() {
  return (
    <a href={`mailto:${LEGAL_CONTACT}`} className={LEGAL_LINK}>
      {LEGAL_CONTACT}
    </a>
  )
}
