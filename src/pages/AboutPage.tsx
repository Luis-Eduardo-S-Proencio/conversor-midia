import { ArchiveX, AudioLines, Film, Image as ImageIcon, MonitorSmartphone, Share2, UserRoundX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMark } from '../components/brand/Logo'
import { Container } from '../components/layout/Container'
import { InstallButton } from '../components/layout/InstallButton'
import { SiteNote } from '../components/layout/SiteNote'
import { TopAppBar } from '../components/layout/TopAppBar'
import { Accordion, type AccordionItem } from '../components/ui/Accordion'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cx } from '../components/ui/cx'
import { Icon } from '../components/ui/Icon'
import { useToast } from '../components/ui/toast-context'
import { formatBytes } from '../core/format'
import { IMAGE_FORMATS, OUTPUT_FORMATS, OUTPUT_FORMAT_INFO } from '../core/image/formats'
import { IMAGE_LIMITS } from '../core/image/inspect'
import { AUDIO_FORMATS } from '../core/video/audio'
import { VIDEO_FORMATS } from '../core/video/formats'
import { MAX_GIF_SECONDS } from '../core/video/gif'
import { VIDEO_LIMITS } from '../core/video/inspect'

const LINK = 'text-accent underline underline-offset-4 transition-colors hover:text-fg'

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
  { subject: 'Imagem', limit: `até ${formatBytes(IMAGE_LIMITS.maxFileBytes)} e ${IMAGE_LIMITS.maxPixels / 1_000_000} megapixels` },
  { subject: 'Várias imagens', limit: `até ${IMAGE_LIMITS.maxFiles} de uma vez` },
  { subject: 'GIF', limit: `até ${MAX_GIF_SECONDS} segundos de vídeo` },
] as const

const PRIVACY: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: MonitorSmartphone,
    title: 'Processado no seu aparelho',
    text: 'As fotos e os vídeos são abertos e processados pelo próprio navegador. Nenhum arquivo é enviado para servidor.',
  },
  {
    icon: ArchiveX,
    title: 'Nada fica guardado',
    text: 'Ao fechar a página, as cópias usadas no processamento somem. Fica só o que você baixou.',
  },
  { icon: UserRoundX, title: 'Sem conta', text: 'Não precisa de cadastro nem de login.' },
]

const FAQ: readonly AccordionItem[] = [
  {
    id: 'servidor',
    title: 'Meus arquivos vão para algum servidor?',
    content: (
      <p>
        Não. O Media Tools abre e processa as fotos e os vídeos no próprio navegador, no seu aparelho. Nenhum arquivo é enviado,
        e nada fica guardado depois que você fecha a página.
      </p>
    ),
  },
  {
    id: 'demora',
    title: 'Por que meu vídeo demora?',
    content: (
      <p>
        Comprimir, converter ou recortar refaz o vídeo quadro a quadro, com o processador do seu aparelho. Vídeos longos ou em
        alta resolução levam mais tempo, principalmente no celular. Cortar um trecho e trocar entre MP4 e MOV costumam ser
        rápidos, porque copiam o vídeo sem refazer.
      </p>
    ),
  },
  {
    id: 'offline',
    title: 'Funciona sem internet?',
    content: (
      <p>
        Ainda não. O site precisa de internet para abrir e para carregar cada ferramenta na primeira vez. Depois de aberta, a
        ferramenta trabalha no aparelho, sem enviar nada.
      </p>
    ),
  },
  {
    id: 'instalar',
    title: 'Como instalar no Android e no iPhone?',
    content: (
      <ul className="grid gap-2">
        <li>
          <strong className="font-semibold text-fg">Android (Chrome):</strong> toque em Instalar, no alto do Início, ou no menu
          do navegador e em Instalar app.
        </li>
        <li>
          <strong className="font-semibold text-fg">iPhone e iPad (Safari):</strong> toque em Compartilhar e depois em Adicionar à
          Tela de Início.
        </li>
      </ul>
    ),
  },
]

/** Seção em cartão; o título aceita âncora (ex.: o selo "Processamento local" leva a #privacidade). */
function Section({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id} className={cx('grid content-start gap-4', className)}>
      {/* tabIndex -1: links com âncora levam o foco até aqui, e o leitor de tela começa pela seção pedida. */}
      <h2 id={id} tabIndex={-1} className="font-sans text-section focus:outline-none">
        {title}
      </h2>
      {children}
    </Card>
  )
}

function FormatList({ label, formats }: { label: string; formats: readonly string[] }) {
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-2">
      <dt className="text-caption font-normal text-fg-muted">{label}</dt>
      <dd>
        <ul className="flex flex-wrap gap-1.5">
          {formats.map((format) => (
            <li key={format} className="rounded-sm border border-border bg-surface-3 px-2 py-0.5 text-xs font-semibold text-fg">
              {format}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  )
}

/** Compartilhar o endereço do app (folha do sistema; sem ela, copia o link). */
function ShareButton() {
  const toast = useToast()

  async function share() {
    const url = `${window.location.origin}/`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Media Tools', text: 'Converta, comprima e edite fotos e vídeos direto no navegador.', url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return // a pessoa fechou a folha
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast({ message: 'Link copiado.', tone: 'success' })
    } catch {
      toast({ message: `Endereço do app: ${url}` })
    }
  }

  return (
    <Button icon={Share2} onClick={() => void share()}>
      Compartilhar
    </Button>
  )
}

/**
 * Sobre: o app (ícone, nome, versão, instalar e compartilhar), privacidade, formatos, limites, perguntas
 * frequentes e créditos, em cartões. Carregada sob demanda (os formatos e os limites vêm de `core/`).
 */
export function AboutPage() {
  return (
    <>
      <title>Sobre · Media Tools</title>
      <TopAppBar title="Sobre" backTo="/" />
      <Container className="pt-4 pb-10 md:pt-6 md:pb-14">
        <div className="mx-auto grid max-w-240 grid-cols-1 gap-4 md:gap-5">
          <header className="grid gap-4 pb-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-5">
            <LogoMark className="size-16" />
            <div className="grid gap-1">
              <p className="font-display text-title text-fg">Media Tools</p>
              <p className="text-caption font-normal text-fg-subtle tabular-nums">{`Versão ${__APP_VERSION__}`}</p>
              <p className="max-w-text text-body text-fg-muted">Converta, comprima e edite fotos e vídeos no seu aparelho, sem enviar nada.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <InstallButton variant="button" />
              <ShareButton />
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <Section id="privacidade" title="Privacidade">
              <ul className="grid gap-4">
                {PRIVACY.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-3 text-fg-muted">
                      <Icon icon={item.icon} />
                    </span>
                    <div className="grid gap-0.5">
                      <h3 className="text-label text-fg">{item.title}</h3>
                      <p className="text-secondary text-fg-muted">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="limites" title="Limites">
              <dl className="grid divide-y divide-border text-secondary">
                {LIMITS.map((row) => (
                  <div key={row.subject} className="grid gap-0.5 py-2.5 first:pt-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3">
                    <dt className="text-fg-muted">{row.subject}</dt>
                    <dd className="font-medium text-fg tabular-nums">{row.limit}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-caption font-normal text-fg-subtle">
                Como o trabalho acontece no seu aparelho, arquivos muito grandes podem demorar mais ou não caber na memória,
                principalmente em celulares.
              </p>
            </Section>
          </div>

          <Section id="formatos" title="Formatos">
            <ul className="grid gap-4 md:grid-cols-3">
              {FORMAT_ROWS.map((row) => (
                <li key={row.media} className="grid content-start gap-2.5">
                  <h3 className="flex items-center gap-2 text-label text-fg">
                    <Icon icon={row.icon} size="sm" className="text-fg-muted" />
                    {row.media}
                  </h3>
                  <dl className="grid gap-2">
                    {row.opens && <FormatList label="Abre" formats={row.opens} />}
                    <FormatList label="Salva" formats={row.saves} />
                  </dl>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="perguntas" title="Perguntas frequentes">
            {/* As perguntas vão de borda a borda do cartão, como uma lista. */}
            <Accordion items={FAQ} className="-mx-4 -mb-4 border-t border-border md:-mx-5 md:-mb-5" />
          </Section>

          <Section id="creditos" title="Créditos e licenças">
            <ul className="grid gap-3 text-secondary text-fg-muted">
              {/* Frases com links no meio: a exceção de alvo pequeno da WCAG 2.5.8 vale para texto corrido. */}
              <li>
                <p>
                  Os vídeos são lidos e gerados com o{' '}
                  <a href="https://github.com/Vanilagy/mediabunny" rel="noopener noreferrer" className={LINK}>
                    Mediabunny
                  </a>{' '}
                  (licença MPL-2.0, código-fonte no link).
                </p>
              </li>
              <li>
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
              <li>
                <p>Fontes Inter e Bricolage Grotesque (licença OFL) e ícones Lucide (licença ISC).</p>
              </li>
            </ul>
          </Section>

          <SiteNote className="mt-6" />
        </div>
      </Container>
    </>
  )
}
