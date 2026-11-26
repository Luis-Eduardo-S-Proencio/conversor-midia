import { ArchiveX, MonitorSmartphone, Share2, UserRoundX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMark } from '../components/brand/Logo'
import { Container } from '../components/layout/Container'
import { TopAppBar } from '../components/layout/TopAppBar'
import { Accordion, type AccordionItem } from '../components/ui/Accordion'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useToast } from '../components/ui/toast-context'
import { formatBytes } from '../core/format'
import { IMAGE_FORMATS, OUTPUT_FORMATS, OUTPUT_FORMAT_INFO } from '../core/image/formats'
import { IMAGE_LIMITS } from '../core/image/inspect'
import { AUDIO_FORMATS } from '../core/video/audio'
import { VIDEO_FORMATS } from '../core/video/formats'
import { MAX_GIF_SECONDS } from '../core/video/gif'
import { VIDEO_LIMITS } from '../core/video/inspect'

/** "JPG, PNG e WEBP": lista em português, para ler como frase. */
function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`
}

const labels = (formats: Record<string, { label: string }>) => Object.values(formats).map((format) => format.label)

const PRIVACY: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: MonitorSmartphone,
    title: 'Feito no seu aparelho',
    text: 'As fotos e os vídeos são abertos e processados pelo próprio navegador. Nenhum arquivo é enviado para servidor.',
  },
  {
    icon: ArchiveX,
    title: 'Nada fica guardado',
    text: 'Ao fechar a página, as cópias usadas no processamento somem. Fica só o que você baixou.',
  },
  { icon: UserRoundX, title: 'Sem conta', text: 'Não precisa de cadastro nem de login.' },
]

// Formatos e limites vêm do núcleo: a página acompanha o que as ferramentas realmente aceitam.
const FORMATS: ReadonlyArray<{ subject: string; value: string }> = [
  { subject: 'Fotos abertas', value: joinList(labels(IMAGE_FORMATS)) },
  { subject: 'Fotos salvas', value: joinList(OUTPUT_FORMATS.map((format) => OUTPUT_FORMAT_INFO[format].label)) },
  { subject: 'Vídeos abertos', value: joinList(labels(VIDEO_FORMATS)) },
  { subject: 'Vídeos salvos', value: joinList([...labels(VIDEO_FORMATS), 'GIF']) },
  { subject: 'Som do vídeo', value: joinList(labels(AUDIO_FORMATS)) },
]

const LIMITS: ReadonlyArray<{ subject: string; value: string }> = [
  { subject: 'Vídeo', value: `até ${formatBytes(VIDEO_LIMITS.maxFileBytes)}, um por vez` },
  { subject: 'Foto', value: `até ${formatBytes(IMAGE_LIMITS.maxFileBytes)} e ${IMAGE_LIMITS.maxPixels / 1_000_000} megapixels` },
  { subject: 'Várias fotos', value: `até ${IMAGE_LIMITS.maxFiles} de uma vez` },
  { subject: 'GIF', value: `até ${MAX_GIF_SECONDS} segundos de vídeo` },
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
    title: 'Como instalar no celular ou no computador?',
    content: (
      <p>
        Toque no menu, no canto de cima do Início, e depois em Instalar app. Quando o navegador não abre a instalação sozinho, o
        próprio menu mostra o passo a passo do seu aparelho.
      </p>
    ),
  },
]

/** Seção com título e o conteúdo num grupo; o título aceita âncora (ex.: /sobre#privacidade). */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      {/* tabIndex -1: links com âncora levam o foco até aqui, e o leitor de tela começa pela seção pedida. */}
      <h2 id={id} tabIndex={-1} className="text-section text-fg focus:outline-none">
        {title}
      </h2>
      {children}
    </section>
  )
}

const GROUP = 'overflow-hidden rounded-lg border border-border bg-surface-1'

/** Linhas de nome e valor (formatos, limites), com divisores. */
function FactList({ rows }: { rows: ReadonlyArray<{ subject: string; value: string }> }) {
  return (
    <dl className={`${GROUP} divide-y divide-border`}>
      {rows.map((row) => (
        <div key={row.subject} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-secondary text-fg-muted">{row.subject}</dt>
          <dd className="text-secondary font-medium text-fg tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
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
 * Sobre: o app (ícone, nome, versão e compartilhar), privacidade, formatos, limites e perguntas
 * frequentes, numa coluna. Carregada sob demanda (os formatos e os limites vêm de `core/`).
 */
export function AboutPage() {
  return (
    <>
      <title>Sobre · Media Tools</title>
      <TopAppBar title="Sobre" backTo="/" />
      <Container className="pt-4 pb-14 md:pt-8">
        <div className="mx-auto grid max-w-2xl gap-10">
          <header className="grid justify-items-start gap-4">
            <div className="flex items-center gap-4">
              <LogoMark className="size-16" />
              <div className="grid gap-0.5">
                <p className="text-title text-fg">Media Tools</p>
                <p className="text-secondary text-fg-subtle tabular-nums">{`Versão ${__APP_VERSION__}`}</p>
              </div>
            </div>
            <p className="max-w-text text-body text-fg-muted">
              Converta, comprima e edite fotos e vídeos no seu aparelho, sem enviar nada e sem criar conta.
            </p>
            <ShareButton />
          </header>

          <Section id="privacidade" title="Privacidade">
            <ul className={`${GROUP} divide-y divide-border`}>
              {PRIVACY.map((item) => (
                <li key={item.title} className="flex gap-3.5 px-4 py-4">
                  <Icon icon={item.icon} className="mt-0.5 text-fg-muted" />
                  <div className="grid gap-0.5">
                    <h3 className="text-label text-fg">{item.title}</h3>
                    <p className="text-secondary text-fg-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="formatos" title="Formatos">
            <FactList rows={FORMATS} />
          </Section>

          <Section id="limites" title="Limites">
            <FactList rows={LIMITS} />
            <p className="text-secondary text-fg-subtle">
              Como o trabalho acontece no seu aparelho, arquivos muito grandes podem demorar mais ou não caber na memória,
              principalmente em celulares.
            </p>
          </Section>

          <Section id="perguntas" title="Perguntas frequentes">
            <Accordion items={FAQ} className={`${GROUP} divide-y divide-border`} />
          </Section>
        </div>
      </Container>
    </>
  )
}
