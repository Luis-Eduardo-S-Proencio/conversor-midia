import { ArrowLeftRight, Check, Download, FolderOpen, Lock, LockOpen, Plus, Scissors, Trash2, Upload } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { VIDEO_TOOLS } from '../app/tool-catalog'
import { Logo, LogoMark } from '../components/brand/Logo'
import { ActionBar } from '../components/layout/ActionBar'
import { Container } from '../components/layout/Container'
import { TopAppBar } from '../components/layout/TopAppBar'
import { DownloadActions } from '../components/tool/DownloadActions'
import { Dropzone } from '../components/tool/Dropzone'
import { FileInfo } from '../components/tool/FileInfo'
import { FilePreview } from '../components/tool/FilePreview'
import { ResultSummary } from '../components/tool/ResultSummary'
import { ToolList } from '../components/tool/ToolList'
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
import { Tabs } from '../components/ui/Tabs'
import { Skeleton } from '../components/ui/Skeleton'
import { Slider } from '../components/ui/Slider'
import { useToast } from '../components/ui/toast-context'

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
      { name: 'bg', value: '#000000' },
      { name: 'surface-1', value: '#161618' },
      { name: 'surface-2', value: '#1F1F22' },
      { name: 'surface-3', value: '#29292D' },
      { name: 'surface-hover', value: '#333338' },
      { name: 'border', value: 'branco 8%' },
      { name: 'border-strong', value: 'branco 14%' },
      { name: 'stroke', value: '#76767F' },
    ],
  },
  {
    title: 'Texto',
    tokens: [
      { name: 'fg', alias: 'text-1', value: '#F5F5F7' },
      { name: 'fg-muted', alias: 'text-2', value: '#A8A8B0' },
      { name: 'fg-subtle', alias: 'text-3', value: '#9B9BA3' },
    ],
  },
  {
    title: 'Acento e marca',
    tokens: [
      { name: 'accent', value: '#FF6699' },
      { name: 'accent-solid', value: '#D62466' },
      { name: 'accent-soft', value: 'acento 10%' },
      { name: 'brand-start', value: '#8B5CF6' },
      { name: 'brand-end', value: '#EC4899' },
    ],
  },
  {
    title: 'Estados',
    tokens: [
      { name: 'success', value: '#3DD68C' },
      { name: 'warning', value: '#F5B841' },
      { name: 'danger', value: '#FF5C5C' },
    ],
  },
]

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
] as const

type OutputFormat = (typeof FORMAT_OPTIONS)[number]['value']

const RADII = [
  { name: 'sm', value: '8 px', className: 'rounded-sm' },
  { name: 'md', value: '12 px', className: 'rounded-md' },
  { name: 'lg', value: '16 px', className: 'rounded-lg' },
  { name: 'xl', value: '20 px', className: 'rounded-xl' },
  { name: 'full', value: 'pílula', className: 'rounded-full' },
]

const DURATIONS = [
  { name: 'dur-1', value: '120 ms', use: 'toque' },
  { name: 'dur-2', value: '200 ms', use: 'troca de estado' },
  { name: 'dur-3', value: '320 ms', use: 'painéis' },
  { name: 'dur-4', value: '480 ms', use: 'máximo' },
]

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

/** Área de soltar: o contorno fica no acento quando há um arquivo por cima. */
function DropTargetDemo() {
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
      className="drop-target grid min-h-56 place-items-center rounded-xl px-6 py-10 text-center"
    >
      <div className="grid justify-items-center gap-3">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-14 place-items-center rounded-full transition-colors duration-(--dur-2)',
            over ? 'bg-accent-solid text-on-accent' : 'bg-surface-3 text-fg',
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
 * Vitrine interna (/_design, fora da navegação): tokens e componentes num só lugar.
 * Regras de uso em docs/design-system.md.
 */
export function DesignPage() {
  const [tab, setTab] = useState<'layout' | 'border' | 'photos'>('layout')
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(82)
  const [keepRatio, setKeepRatio] = useState(true)
  const [selection, setSelection] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <>
      <title>Design System · Media Tools</title>
      <meta name="robots" content="noindex" />
      <TopAppBar title="Design System" backTo="/" />
      <Container className="grid grid-cols-1 gap-12 pt-4 pb-10 md:gap-14 md:pb-14">
        <header className="grid gap-2">
          <p className="max-w-text text-body text-fg-muted">
            Vitrine interna dos tokens e componentes do Media Tools, fora da navegação. Regras de uso em docs/design-system.md.
          </p>
        </header>

        <Section title="Marca">
          <Card className="flex flex-wrap items-end gap-6">
            <LogoMark className="size-24" />
            <LogoMark className="size-16" />
            <LogoMark className="size-8" />
            <Logo />
            <Logo size="sm" />
          </Card>
        </Section>

        <Section title="Cores" description="Preto de verdade no fundo, cinzas neutros em camadas e o rosa da marca só na ação principal, na seleção e no foco.">
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

        <Section title="Tipografia" description="Uma família só (Inter): a hierarquia vem do tamanho e do peso. Números sempre tabulares. Mínimo de 12 px.">
          <Card className="grid gap-5">
            <div className="grid gap-1">
              <p className="text-display">Edite fotos e vídeos</p>
              <p className="text-caption text-fg-subtle">Título do Início, Inter 700, de 28 a 38 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-title">Vídeos</p>
              <p className="text-caption text-fg-subtle">Título de página, Inter 700, de 26 a 32 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-section">Ferramentas de vídeo</p>
              <p className="text-caption text-fg-subtle">Título de seção, Inter 600, 18 px</p>
            </div>
            <div className="grid gap-1">
              <p className="max-w-text text-body">Escolha um vídeo para começar. Tudo é feito no seu aparelho.</p>
              <p className="text-caption text-fg-subtle">Corpo, Inter 400, 16 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-secondary text-fg-muted">Arquivo menor, mesma aparência.</p>
              <p className="text-caption text-fg-subtle">Secundário, 14 px</p>
            </div>
            <div className="grid gap-1">
              <p className="text-caption">Legenda e rótulo, 13 px, 500</p>
            </div>
            <div className="grid gap-1">
              <p className="text-body font-medium tabular-nums">00:06,2 / 00:13,4 · 1080 × 1920 · 22,4 MB · −58%</p>
              <p className="text-caption text-fg-subtle">Números e tempos com algarismos tabulares</p>
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

        <Section title="Lista de ferramentas" description="Lista agrupada, como nos apps do sistema: ícone num ladrilho neutro, nome, o que faz e a seta.">
          <div className="grid gap-4 md:grid-cols-2">
            <ToolList tools={VIDEO_TOOLS.slice(0, 3)} label="Exemplo de lista de ferramentas" />
            <Card className="grid content-start gap-2">
              <span className="text-label text-fg">Cartão</span>
              <span className="text-secondary text-fg-muted">Superfície plana com borda hairline, sem sombra nem degradê.</span>
            </Card>
          </div>
        </Section>

        <Section title="Controles de opção">
          <Card className="grid gap-5">
            <Tabs
              label="Opções de exemplo"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'layout', label: 'Layout', content: <p className="text-secondary text-fg-muted">Abas: o texto e um traço do acento embaixo da aberta. As setas trocam de aba.</p> },
                { value: 'border', label: 'Borda', content: <p className="text-secondary text-fg-muted">Cada aba mostra só o próprio painel.</p> },
                { value: 'photos', label: 'Fotos', content: <p className="text-secondary text-fg-muted">Use para agrupar opções de uma mesma tela.</p> },
              ]}
            />
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

        <Section title="Abrir arquivo" description="Superfície com borda; com o arquivo por cima, o contorno fica no acento.">
          <DropTargetDemo />
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

        <Section title="Componentes de ferramenta">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Dropzone
                accept="image/jpeg,image/png,image/webp"
                buttonLabel="Selecionar imagens"
                dragLabel="Arraste imagens para cá"
                hint="JPG, PNG ou WEBP, até 50 MB cada"
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
