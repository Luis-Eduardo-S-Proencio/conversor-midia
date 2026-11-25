import { ArrowLeftRight, Check, Download, FolderOpen, Lock, LockOpen, Plus, Scissors, Share2, Trash2, Upload } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { IMAGE_TOOLS, VIDEO_TOOLS, switcherTools } from '../app/tool-catalog'
import { Logo, LogoMark } from '../components/brand/Logo'
import { ActionBar } from '../components/layout/ActionBar'
import { AppMenu } from '../components/layout/AppMenu'
import { Container } from '../components/layout/Container'
import { DownloadActions } from '../components/tool/DownloadActions'
import { Dropzone } from '../components/tool/Dropzone'
import { FileInfo } from '../components/tool/FileInfo'
import { FilePreview } from '../components/tool/FilePreview'
import { ResultSummary } from '../components/tool/ResultSummary'
import { ToolSwitcher } from '../components/tool/ToolSwitcher'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { cx } from '../components/ui/cx'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { MetaChips } from '../components/ui/MetaChips'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ProgressRing } from '../components/ui/ProgressRing'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Skeleton } from '../components/ui/Skeleton'
import { Slider } from '../components/ui/Slider'
import { useToast } from '../components/ui/toast-context'
import { ToolIcon, type ToolTone } from '../components/ui/ToolIcon'

interface ColorToken {
  name: string
  /** Nome curto do guia de redesenho, quando diferente. */
  alias?: string
  value: string
}

const COLOR_GROUPS: Array<{ title: string; tokens: ColorToken[] }> = [
  {
    title: 'Superfícies',
    tokens: [
      { name: 'bg', value: '#0A0A0D' },
      { name: 'surface-1', value: '#111116' },
      { name: 'surface-2', value: '#17171D' },
      { name: 'surface-3', value: '#1F1F27' },
      { name: 'surface-hover', value: '#25252E' },
      { name: 'stage', value: '#000000' },
      { name: 'border', value: 'branco 7%' },
      { name: 'border-strong', value: 'branco 12%' },
      { name: 'stroke', value: '#6B6B78' },
    ],
  },
  {
    title: 'Texto',
    tokens: [
      { name: 'fg', alias: 'text-1', value: '#F5F5F7' },
      { name: 'fg-muted', alias: 'text-2', value: '#A6A6B0' },
      { name: 'fg-subtle', alias: 'text-3', value: '#8A8A94' },
    ],
  },
  {
    title: 'Acento e marca',
    tokens: [
      { name: 'accent', value: '#FF4F8B' },
      { name: 'accent-solid', value: '#D62466' },
      { name: 'accent-soft', value: 'acento 14%' },
      { name: 'brand-start', value: '#8B5CF6' },
      { name: 'brand-end', value: '#EC4899' },
    ],
  },
  {
    title: 'Estados e categorias',
    tokens: [
      { name: 'success', value: '#3DD68C' },
      { name: 'warning', value: '#F5B841' },
      { name: 'danger', value: '#FF5C5C' },
      { name: 'cat-edit', alias: 'cat-editar', value: '#A495FF' },
      { name: 'cat-convert', alias: 'cat-converter', value: '#6AA7FF' },
      { name: 'cat-compress', alias: 'cat-comprimir', value: '#4FD1A1' },
      { name: 'cat-audio', value: '#FFA06B' },
    ],
  },
]

const CATEGORY_LABELS: Record<ToolTone, string> = {
  edit: 'Editar: editar vídeo, recortar, girar, GIF',
  convert: 'Converter: imagem e vídeo',
  compress: 'Deixar menor: comprimir, redimensionar, resolução',
  audio: 'Áudio: extrair áudio',
}

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
] as const

type OutputFormat = (typeof FORMAT_OPTIONS)[number]['value']

const QUALITY_OPTIONS = [
  { value: 'high', label: 'Alta' },
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'small', label: 'Menor' },
] as const

type QualityLevel = (typeof QUALITY_OPTIONS)[number]['value']

const RADII = [
  { name: 'sm', value: '8 px', className: 'rounded-sm' },
  { name: 'md', value: '12 px', className: 'rounded-md' },
  { name: 'lg', value: '16 px', className: 'rounded-lg' },
  { name: 'xl', value: '24 px', className: 'rounded-xl' },
  { name: 'full', value: 'pílula', className: 'rounded-full' },
]

const DURATIONS = [
  { name: 'dur-1', value: '120 ms', use: 'toque' },
  { name: 'dur-2', value: '200 ms', use: 'troca de estado' },
  { name: 'dur-3', value: '320 ms', use: 'painéis' },
  { name: 'dur-4', value: '480 ms', use: 'máximo' },
]

const SHORTCUTS = ['WhatsApp', 'Vídeo para MP3', 'Imagem para PDF', 'Criar GIF', 'Story 9:16', 'E-mail', 'Discord']

/** Uma ferramenta de cada categoria, com o selo de imagem ou vídeo. */
const CATEGORY_SAMPLES = [...VIDEO_TOOLS, ...IMAGE_TOOLS].filter(
  (tool, index, all) => all.findIndex((other) => other.tone === tool.tone) === index,
)

const SAMPLE_FILE = new File(['Arquivo de exemplo da vitrine do Media Tools.'], 'exemplo.txt', { type: 'text/plain' })

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-4">
      <div className="grid gap-1">
        <h2 id={id} className="text-section">
          {title}
        </h2>
        {description && <p className="max-w-text text-secondary text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Os mesmos controles com um acento, para comparar lado a lado. */
function AccentSample({ name, short, accent, note }: { name: string; short: string; accent?: 'violet'; note: string }) {
  const [quality, setQuality] = useState<QualityLevel>('balanced')
  const [level, setLevel] = useState(70)
  const [filter, setFilter] = useState('video')
  return (
    <Card data-accent={accent} className="grid min-w-0 content-start gap-5">
      <div className="grid gap-1">
        <h3 className="font-display text-lg font-semibold">{name}</h3>
        <p className="text-secondary text-fg-muted">{note}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={Download}>
          Baixar
        </Button>
        <Button icon={Share2}>Compartilhar</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Filtro de exemplo, ${short}`}>
        {['todas', 'video', 'imagem'].map((value) => (
          <Chip key={value} selected={filter === value} onClick={() => setFilter(value)}>
            {value === 'todas' ? 'Todas' : value === 'video' ? 'Vídeo' : 'Imagem'}
          </Chip>
        ))}
      </div>
      <SegmentedControl label={`Qualidade · ${short}`} options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
      <Slider label={`Intensidade · ${short}`} value={level} onChange={setLevel} resetTo={50} formatValue={(value) => `${value}%`} />
      <div className="flex items-center gap-4">
        <ProgressRing label={`Exportando · ${short}`} value={42} size={56} />
        <ProgressBar label="Codificando vídeo…" value={42} className="flex-1" />
      </div>
      <p className="text-secondary text-fg-muted">
        Texto com <a href="#acento" className="font-medium text-accent underline underline-offset-4">link no acento</a> e{' '}
        <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-accent">seleção</span>.
      </p>
    </Card>
  )
}

/** Visor de câmera: as cantoneiras se fecham quando há um arquivo por cima. */
function ViewfinderDemo() {
  const [over, setOver] = useState(false)
  return (
    <div
      data-dragover={over || undefined}
      onDragEnter={() => setOver(true)}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      className="viewfinder grid min-h-56 place-items-center rounded-xl px-6 py-10 text-center"
    >
      <div className="grid justify-items-center gap-3">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-12 place-items-center rounded-lg bg-surface-3 text-fg transition-[translate] duration-(--dur-2)',
            over && '-translate-y-1 text-accent',
          )}
        >
          <Icon icon={Upload} size="lg" />
        </span>
        <p className="text-body font-medium">{over ? 'Solte para abrir' : 'Arraste um arquivo ou toque para abrir'}</p>
        <Button size="sm" aria-pressed={over} onClick={() => setOver((current) => !current)}>
          {over ? 'Tirar arquivo de cima' : 'Simular arquivo por cima'}
        </Button>
      </div>
    </div>
  )
}

function OverlayDemos() {
  const [sheet, setSheet] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [speed, setSpeed] = useState(100)
  const [applied, setApplied] = useState(100)
  const toast = useToast()

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="grid content-start gap-3">
        <h3 className="font-semibold">Bottom sheet</h3>
        <p className="text-secondary text-fg-muted">
          Sobe de baixo; fecha arrastando para baixo, no ✕, com Esc, tocando fora ou com o voltar do Android. O ✓ aplica.
        </p>
        <p className="text-secondary text-fg-muted tabular-nums">Velocidade aplicada: {(applied / 100).toFixed(2).replace('.', ',')}×</p>
        <Button onClick={() => setSheet(true)} className="justify-self-start">
          Abrir painel de velocidade
        </Button>
        <BottomSheet
          open={sheet}
          title="Velocidade"
          onClose={() => {
            setSpeed(applied)
            setSheet(false)
          }}
          onApply={() => {
            setApplied(speed)
            setSheet(false)
          }}
        >
          <Slider
            label="Velocidade"
            value={speed}
            onChange={setSpeed}
            min={25}
            max={400}
            step={25}
            resetTo={100}
            formatValue={(value) => `${(value / 100).toFixed(2).replace('.', ',')}×`}
            hint="Toque duas vezes na barra para voltar a 1×."
          />
        </BottomSheet>
      </Card>
      <Card className="grid content-start gap-3">
        <h3 className="font-semibold">Diálogo e avisos</h3>
        <p className="text-secondary text-fg-muted">Confirmação antes de perder algo; avisos que somem em 3 s.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
            Sair do editor
          </Button>
          <Button onClick={() => toast({ message: 'Pronto! Seu vídeo ficou 58% menor.', tone: 'success' })}>Aviso de sucesso</Button>
          <Button
            onClick={() =>
              toast({ message: 'Nova versão disponível', action: { label: 'Atualizar', onClick: () => toast({ message: 'Atualizado.' }) } })
            }
          >
            Aviso com ação
          </Button>
        </div>
        <ConfirmDialog
          open={confirm}
          title="Descartar edição?"
          description="As mudanças neste vídeo ainda não foram salvas."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          destructive
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false)
            toast({ message: 'Edição descartada.' })
          }}
        />
      </Card>
    </div>
  )
}

/**
 * Vitrine interna (/_design, fora da navegação): tokens e componentes num só lugar, e a escolha
 * do acento lado a lado. Regras de uso em docs/design-system.md.
 */
export function DesignPage() {
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(82)
  const [keepRatio, setKeepRatio] = useState(true)
  const [selection, setSelection] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <>
      <title>Design System · Media Tools</title>
      <meta name="robots" content="noindex" />
      <Container className="grid grid-cols-1 gap-12 py-10 md:gap-14 md:py-14">
        <header className="grid gap-2">
          <h1 className="text-title">Design System</h1>
          <p className="max-w-text text-body text-fg-muted">
            Vitrine interna dos tokens e componentes do Media Tools, fora da navegação. Regras de uso em docs/design-system.md.
          </p>
        </header>

        <Section
          title="Acento: rosa ou violeta"
          description="Os mesmos controles com cada acento. O degradê da marca fica só no logo; todo o resto usa um acento só. Escolha um dos dois."
        >
          <div id="acento" className="grid gap-4 md:grid-cols-2">
            <AccentSample name="Rosa (padrão)" short="rosa" note="--accent #FF4F8B · --accent-solid #D62466" />
            <AccentSample name="Violeta" short="violeta" accent="violet" note="--accent #9D8CFF · --accent-solid #6D4AFF" />
          </div>
        </Section>

        <Section title="Marca">
          <Card className="flex flex-wrap items-end gap-6">
            <LogoMark className="size-24" />
            <LogoMark className="size-16" />
            <LogoMark className="size-8" />
            <Logo />
            <Logo size="sm" />
          </Card>
        </Section>

        <Section title="Cores" description="Superfícies de grafite em camadas, bordas hairline e só quatro cores de categoria.">
          <div className="grid gap-6">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="grid gap-2">
                <h3 className="text-caption text-fg-muted">{group.title}</h3>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
                  {group.tokens.map((token) => (
                    <li key={token.name} className="overflow-hidden rounded-md border border-border bg-surface-1">
                      <div className="h-14 border-b border-border" style={{ background: `var(--color-${token.name})` }} />
                      <div className="grid px-3 py-2 text-caption">
                        <span className="text-fg">{token.name}</span>
                        <span className="text-fg-subtle tabular-nums">{token.alias ? `${token.alias} · ${token.value}` : token.value}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Tipografia"
          description="Títulos em Bricolage Grotesque (uma grotesca com personalidade); texto em Inter; números sempre tabulares. Mínimo de 12 px."
        >
          <Card className="grid gap-5">
            <div className="grid gap-1">
              <p className="font-display text-display">Edite fotos e vídeos direto no navegador</p>
              <p className="text-caption text-fg-subtle">Display · Bricolage 700 · 30 → 44 px</p>
            </div>
            <div className="grid gap-1">
              <p className="font-display text-title">Comprimir vídeo</p>
              <p className="text-caption text-fg-subtle">Título de página · Bricolage 650 · 24 → 32 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-section">Ferramentas</p>
              <p className="text-caption text-fg-subtle">Título de seção · Inter 600 · 18 → 20 px</p>
            </div>
            <div className="grid gap-1">
              <p className="max-w-text text-body">Escolha um vídeo para começar. Tudo acontece no seu aparelho: nada é enviado.</p>
              <p className="text-caption text-fg-subtle">Corpo · Inter 400 · 15 → 16 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-secondary text-fg-muted">Arquivo menor, mesma cara. Por porcentagem ou em pixels.</p>
              <p className="text-caption text-fg-subtle">Secundário · 14 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-caption">Legenda e rótulo · 13 px · 500</p>
            </div>
            <div className="grid gap-1">
              <p className="text-body font-medium tabular-nums">00:06,2 / 00:13,4 · 1080 × 1920 · 22,4 MB · −58%</p>
              <p className="text-caption text-fg-subtle">Números e timecodes · algarismos tabulares</p>
            </div>
          </Card>
        </Section>

        <Section title="Raios, sombras e movimento">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="grid content-start gap-3">
              <h3 className="text-caption text-fg-muted">Raios</h3>
              <ul className="flex flex-wrap gap-3">
                {RADII.map((radius) => (
                  <li key={radius.name} className="grid justify-items-center gap-1 text-caption text-fg-muted">
                    <span className={cx('size-12 border border-border-strong bg-surface-3', radius.className)} />
                    {radius.name} · {radius.value}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="grid content-start gap-3">
              <h3 className="text-caption text-fg-muted">Sombras</h3>
              <div className="grid grid-cols-2 gap-3 text-caption text-fg-muted">
                <div className="grid h-16 place-items-center rounded-md bg-surface-2 shadow-1">shadow-1</div>
                <div className="grid h-16 place-items-center rounded-md bg-surface-2 shadow-2">shadow-2</div>
              </div>
            </Card>
            <Card className="grid content-start gap-3">
              <h3 className="text-caption text-fg-muted">Durações (nada acima de 500 ms)</h3>
              <ul className="grid gap-1 text-caption text-fg-muted tabular-nums">
                {DURATIONS.map((duration) => (
                  <li key={duration.name} className="flex justify-between gap-3">
                    <span className="text-fg">{duration.name}</span>
                    <span>
                      {duration.value} · {duration.use}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>

        <Section title="Botões" description="Alturas de 36, 44 e 52 px. Desligado fica com 40% de opacidade e cursor de proibido.">
          <Card className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={ArrowLeftRight}>
                Converter
              </Button>
              <Button icon={Plus}>Adicionar arquivos</Button>
              <Button variant="ghost">Limpar</Button>
              <Button variant="danger" icon={Trash2}>
                Remover todos
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">
                Pequeno · 36
              </Button>
              <Button variant="primary">Médio · 44</Button>
              <Button variant="primary" size="lg">
                Grande · 52
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled>
                Salvar vídeo
              </Button>
              <Button variant="primary" loading={loading} icon={Download} onClick={() => setLoading(true)}>
                Exportar
              </Button>
              <Button loading={loading} onClick={() => setLoading(true)}>
                Comprimir
              </Button>
              {loading && (
                <Button variant="ghost" size="sm" onClick={() => setLoading(false)}>
                  Parar carregamento
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <IconButton icon={Scissors} label="Dividir" shortcut="S" />
              <IconButton icon={Trash2} label="Excluir trecho" shortcut="Delete" />
              <IconButton icon={FolderOpen} label="Abrir arquivo" variant="secondary" />
              <IconButton
                icon={keepRatio ? Lock : LockOpen}
                label="Manter proporção"
                variant="secondary"
                aria-pressed={keepRatio}
                onClick={() => setKeepRatio((current) => !current)}
              />
              <span className="text-caption text-fg-subtle">Com mouse, passe o ponteiro para ver a dica com o atalho.</span>
            </div>
          </Card>
        </Section>

        <Section title="Chips, selos e dados do arquivo">
          <Card className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Chip selected>Todas</Chip>
              <Chip>Vídeo</Chip>
              <Chip>Imagem</Chip>
              <Chip disabled>Indisponível</Chip>
            </div>
            <MetaChips
              items={[
                { label: 'Formato', value: 'MP4' },
                { label: 'Resolução', value: '1080 × 1920' },
                { label: 'Duração', value: '0:42' },
                { label: 'Tamanho', value: '22,4 MB' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Original</Badge>
              <Badge variant="accent">Recomendado</Badge>
              <Badge variant="success" icon={Check}>
                Pronto
              </Badge>
              <Badge variant="warning">Arquivo grande</Badge>
              <Badge variant="danger">Erro</Badge>
            </div>
          </Card>
        </Section>

        <Section
          title="Cartões e ícones de ferramenta"
          description="Quatro cores de categoria; o selo no canto diferencia a versão de imagem da de vídeo."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="grid content-start gap-3">
              <ul className="grid gap-3">
                {CATEGORY_SAMPLES.map((tool) => (
                  <li key={tool.tone} className="flex items-center gap-3 text-secondary text-fg-muted">
                    <ToolIcon icon={tool.icon} tone={tool.tone} media={tool.media} />
                    {CATEGORY_LABELS[tool.tone]}
                  </li>
                ))}
              </ul>
              <div className="flex gap-4 pt-2">
                <ToolIcon icon={IMAGE_TOOLS[3]?.icon ?? Scissors} tone="edit" size="lg" media="image" />
                <ToolIcon icon={VIDEO_TOOLS[1]?.icon ?? Scissors} tone="edit" size="lg" media="video" />
              </div>
            </Card>
            <Card as="a" href="#acento" interactive className="grid content-start gap-2 no-underline">
              <ToolIcon icon={ArrowLeftRight} tone="convert" media="video" />
              <span className="text-body font-semibold text-fg">Cartão clicável</span>
              <span className="text-secondary text-fg-muted">Com mouse, sobe 2 px e a borda clareia. Ao tocar, afunda.</span>
            </Card>
          </div>
        </Section>

        <Section title="Controles de opção">
          <Card className="grid gap-5">
            <SegmentedControl label="Converter para" options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
            <Slider
              label="Qualidade"
              value={quality}
              onChange={setQuality}
              min={10}
              max={100}
              resetTo={82}
              formatValue={(value) => `${value}%`}
              hint="Toque duas vezes na barra para voltar ao padrão (82%)."
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <Field label="Largura">{(control) => <Input {...control} inputMode="numeric" defaultValue="1920" unit="px" />}</Field>
              <IconButton
                icon={keepRatio ? Lock : LockOpen}
                label="Manter proporção das medidas"
                variant="secondary"
                aria-pressed={keepRatio}
                onClick={() => setKeepRatio((current) => !current)}
              />
              <Field label="Altura">{(control) => <Input {...control} inputMode="numeric" defaultValue="1080" unit="px" />}</Field>
            </div>
            <Field label="Nome do arquivo" error="Use apenas letras, números, hífen e sublinhado." hint="A extensão é adicionada automaticamente.">
              {(control) => <Input {...control} defaultValue="minha foto?" />}
            </Field>
          </Card>
        </Section>

        <Section title="Abrir arquivo" description="Cantos de visor de câmera no lugar da borda tracejada.">
          <ViewfinderDemo />
        </Section>

        <Section title="Carrossel" description="Sem barra de rolagem visível, com encaixe e fade nas bordas.">
          <div className="-mx-(--gutter)">
            <ul className="scroller-x" aria-label="Atalhos rápidos (exemplo)">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut}>
                  <Chip>{shortcut}</Chip>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Progresso e carregamento">
          <Card className="grid gap-5">
            <ProgressBar label="Codificando vídeo…" value={64} />
            <ProgressBar label="Preparando arquivos" />
            <div className="flex flex-wrap items-center gap-6">
              <ProgressRing label="Exportando" value={42} />
              <ProgressRing label="Abrindo o vídeo" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-1">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="h-12 flex-1 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Mensagens e vazio">
          <Card className="grid gap-4">
            <Alert variant="error" title="Não deu para abrir este arquivo" live={false}>
              Aceitamos MP4, MOV e WEBM.
            </Alert>
            <Alert variant="warning" title="A transparência será perdida" live={false}>
              JPG não tem transparência. As áreas transparentes ficarão brancas.
            </Alert>
            <Alert variant="success" title="3 imagens convertidas" live={false}>
              Os arquivos estão prontos para baixar.
            </Alert>
            <Alert variant="info" title="Processamento local" live={false}>
              O arquivo é processado no seu aparelho e não é enviado para nenhum servidor.
            </Alert>
            <EmptyState
              icon={FolderOpen}
              title="Escolha um vídeo para começar"
              description="MP4, MOV ou WEBM de até 1 GB."
              action={<Button variant="primary">Abrir vídeo</Button>}
            />
          </Card>
        </Section>

        <Section title="Painéis e diálogos">
          <OverlayDemos />
        </Section>

        <Section title="Componentes de ferramenta (atuais)" description="Ainda no visual antigo de layout: mudam nas fases de telas e ferramentas.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Dropzone
                accept="image/jpeg,image/png,image/webp"
                buttonLabel="Selecionar imagens"
                dragLabel="Arraste imagens para cá"
                hint="JPG, PNG ou WEBP · até 50 MB por arquivo"
                onFiles={(files) =>
                  setSelection(`${files.length} ${files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}.`)
                }
              />
              <p role="status" className="text-sm text-fg-muted">
                {selection}
              </p>
            </div>
            <Card className="grid gap-4">
              <FilePreview src="/icons/icon-512.png" alt="Pré-visualização de icon-512.png, 512 por 512" />
              <FileInfo name="icon-512.png" format="png" width={512} height={512} sizeBytes={9_656} />
            </Card>
            <Card className="grid gap-4">
              <ResultSummary beforeBytes={9_017_753} afterBytes={1_992_294} />
              <ResultSummary beforeBytes={1_000_000} afterBytes={1_120_000} />
              <DownloadActions getFiles={() => [SAMPLE_FILE]} downloadLabel="Baixar exemplo" />
            </Card>
            <Card className="grid content-start gap-4">
              <ToolSwitcher label="Troca de ferramenta (exemplo)" tools={switcherTools('image')} onSwitch={() => {}} />
              <div className="flex items-center justify-between gap-3">
                <p className="text-secondary text-fg-muted">Menu do cabeçalho do celular (sai na fase de navegação).</p>
                <AppMenu />
              </div>
            </Card>
          </div>
          <ActionBar>
            <Button variant="primary" size="lg" block>
              Converter
            </Button>
          </ActionBar>
        </Section>
      </Container>
    </>
  )
}
