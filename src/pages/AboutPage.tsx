import { ArchiveX, AudioLines, Film, Image as ImageIcon, MonitorSmartphone, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMark } from '../components/brand/Logo'
import { Container } from '../components/layout/Container'
import { cx } from '../components/ui/cx'
import { Icon } from '../components/ui/Icon'
import { formatBytes } from '../core/format'
import { IMAGE_FORMATS, OUTPUT_FORMATS, OUTPUT_FORMAT_INFO } from '../core/image/formats'
import { IMAGE_LIMITS } from '../core/image/inspect'
import { AUDIO_FORMATS } from '../core/video/audio'
import { VIDEO_FORMATS } from '../core/video/formats'
import { MAX_GIF_SECONDS } from '../core/video/gif'
import { VIDEO_LIMITS } from '../core/video/inspect'

const LINK = 'text-accent underline underline-offset-4 transition-colors hover:text-fg'

/** Grupo de linhas separadas por um fio, como nas listas do app. */
const PANEL = 'divide-y divide-border rounded-xl border border-border bg-surface-1'

const labels = (formats: Record<string, { label: string }>) => Object.values(formats).map((format) => format.label)

// Formatos e limites vêm do núcleo: a página acompanha o que as ferramentas realmente aceitam.
const FORMAT_ROWS: ReadonlyArray<{ media: string; icon: LucideIcon; opens?: readonly string[]; saves: readonly string[] }> = [
  {
    media: 'Imagens',
    icon: ImageIcon,
    opens: labels(IMAGE_FORMATS),
    saves: OUTPUT_FORMATS.map((format) => OUTPUT_FORMAT_INFO[format].label),
  },
  { media: 'Vídeos', icon: Film, opens: labels(VIDEO_FORMATS), saves: [...labels(VIDEO_FORMATS), 'GIF'] },
  { media: 'Som do vídeo', icon: AudioLines, saves: labels(AUDIO_FORMATS) },
]

const LIMITS = [
  { subject: 'Vídeo', limit: `até ${formatBytes(VIDEO_LIMITS.maxFileBytes)}, um por vez` },
  {
    subject: 'Imagem',
    limit: `até ${formatBytes(IMAGE_LIMITS.maxFileBytes)} e ${IMAGE_LIMITS.maxPixels / 1_000_000} milhões de pixels`,
  },
  { subject: 'Várias imagens', limit: `até ${IMAGE_LIMITS.maxFiles} de uma vez` },
  { subject: 'GIF', limit: `até ${MAX_GIF_SECONDS} segundos de vídeo` },
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      {/* tabIndex -1: links com âncora (ex.: "Processamento local", no rodapé) levam o foco até aqui. */}
      <h2 id={id} tabIndex={-1} className="scroll-mt-20 text-base font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Linha com ícone: o texto começa alinhado ao meio do ícone. */
function IconRow({ icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex gap-4 p-4">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-fg-muted">
        <Icon icon={icon} />
      </span>
      <div className="grid min-w-0 flex-1 content-start gap-2 pt-2.5 text-sm">{children}</div>
    </li>
  )
}

function FormatList({ label, formats }: { label: string; formats: readonly string[] }) {
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-2">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd>
        <ul className="flex flex-wrap gap-1.5">
          {formats.map((format) => (
            <li key={format} className="rounded-sm border border-border bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg">
              {format}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  )
}

export function AboutPage() {
  return (
    <>
      <title>Sobre · Media Tools</title>
      <Container className="py-10 md:py-14">
        <div className="grid max-w-3xl gap-10 text-pretty">
          <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <LogoMark className="size-14 md:size-16" />
            <div className="grid gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">Sobre o Media Tools</h1>
              <p className="text-base text-fg-muted">
                Ferramentas gratuitas para converter, comprimir e editar imagens e vídeos, sem criar conta.
              </p>
            </div>
          </header>

          <Section id="processamento-local" title="Processamento local">
            <ul className={PANEL}>
              <IconRow icon={MonitorSmartphone}>
                <h3 className="font-semibold text-fg">Feito no seu aparelho</h3>
                <p className="text-fg-muted">
                  Os arquivos são abertos e processados pelo próprio navegador. Eles não são enviados para nenhum servidor.
                </p>
              </IconRow>
              <IconRow icon={ArchiveX}>
                <h3 className="font-semibold text-fg">Nada fica guardado</h3>
                <p className="text-fg-muted">
                  Ao fechar a página, as cópias usadas durante o processamento são descartadas. Fica só o que você baixou.
                </p>
              </IconRow>
            </ul>
          </Section>

          <Section id="formatos" title="Formatos">
            <ul className={PANEL}>
              {FORMAT_ROWS.map((row) => (
                <IconRow key={row.media} icon={row.icon}>
                  <h3 className="font-semibold text-fg">{row.media}</h3>
                  <dl className="grid gap-2">
                    {row.opens && <FormatList label="Abre" formats={row.opens} />}
                    <FormatList label="Salva" formats={row.saves} />
                  </dl>
                </IconRow>
              ))}
            </ul>
          </Section>

          <Section id="limites" title="Limites">
            <dl className={cx(PANEL, 'text-sm')}>
              {LIMITS.map((row) => (
                <div key={row.subject} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-fg-muted">{row.subject}</dt>
                  <dd className="font-medium text-fg">{row.limit}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-fg-muted">
              Como o trabalho acontece no seu aparelho, arquivos muito grandes podem demorar mais ou não caber na memória,
              principalmente em celulares. Cada ferramenta informa os limites antes de começar.
            </p>
          </Section>

          <Section id="creditos" title="Créditos e licenças">
            <ul className={cx(PANEL, 'text-sm text-fg-muted')}>
              {/* Frases com links no meio: a exceção de alvo pequeno da WCAG 2.5.8 vale para texto corrido. */}
              <li className="px-4 py-3">
                <p>
                  Os vídeos são lidos e gerados com o{' '}
                  <a href="https://mediabunny.dev" rel="noopener noreferrer" className={LINK}>
                    Mediabunny
                  </a>{' '}
                  (licença MPL-2.0).
                </p>
              </li>
              <li className="px-4 py-3">
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
            </ul>
          </Section>
        </div>
      </Container>
    </>
  )
}
