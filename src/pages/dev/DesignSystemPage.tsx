import { ArrowLeftRight, Check, Lock, LockOpen, Plus, Trash2, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { LogoMark, Logo } from '../../components/brand/Logo'
import { ActionBar } from '../../components/layout/ActionBar'
import { Container } from '../../components/layout/Container'
import { PageHeader } from '../../components/layout/PageHeader'
import { DownloadActions } from '../../components/tool/DownloadActions'
import { Dropzone } from '../../components/tool/Dropzone'
import { FileInfo } from '../../components/tool/FileInfo'
import { FilePreview } from '../../components/tool/FilePreview'
import { ResultSummary } from '../../components/tool/ResultSummary'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Slider } from '../../components/ui/Slider'

const COLOR_TOKENS = [
  'bg',
  'surface',
  'surface-raised',
  'border',
  'border-strong',
  'fg',
  'fg-muted',
  'fg-subtle',
  'accent',
  'accent-emphasis',
  'accent-soft',
  'accent-subtle',
  'success',
  'warning',
  'danger',
] as const

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
] as const

type OutputFormat = (typeof FORMAT_OPTIONS)[number]['value']

const SAMPLE_FILE = new File(['Arquivo de exemplo da vitrine do Media Tools.'], 'exemplo.txt', { type: 'text/plain' })

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-5 rounded-lg border border-border bg-surface p-5">{children}</div>
}

/** Vitrine interna (só em desenvolvimento): todos os componentes e estados num só lugar. */
export function DesignSystemPage() {
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(82)
  const [keepRatio, setKeepRatio] = useState(true)
  const [selection, setSelection] = useState('')

  return (
    <>
      <title>Design System · Media Tools</title>
      <Container className="grid gap-12 py-10 md:py-14">
        <PageHeader
          title="Design System"
          description="Vitrine interna dos componentes. Só existe em desenvolvimento. Regras de uso em docs/design-system.md."
        />

        <Section title="Marca">
          <Panel>
            <div className="flex flex-wrap items-end gap-6">
              <LogoMark className="size-24" />
              <LogoMark className="size-12" />
              <LogoMark className="size-8" />
              <LogoMark className="size-4" />
              <Logo />
              <Logo size="sm" />
            </div>
          </Panel>
        </Section>

        <Section title="Cores">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
            {COLOR_TOKENS.map((token) => (
              <li key={token} className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="h-14 border-b border-border" style={{ background: `var(--color-${token})` }} />
                <p className="px-3 py-2 font-mono text-xs text-fg-muted">{token}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Tipografia">
          <Panel>
            <p className="text-4xl font-semibold tracking-tight">Imagens e vídeos no navegador</p>
            <p className="text-3xl font-semibold tracking-tight">Converter imagem</p>
            <p className="text-xl font-semibold tracking-tight">Ferramentas populares</p>
            <p className="text-base">Escolha o formato de saída. A qualidade só aparece para JPG e WEBP.</p>
            <p className="text-sm text-fg-muted">Arraste imagens para cá ou selecione no seu dispositivo.</p>
            <p className="text-xs text-fg-subtle">Os arquivos não saem do seu dispositivo.</p>
            <p className="font-mono text-sm text-fg-muted">WEBP · 3024 × 4032 · 8,6 MB</p>
          </Panel>
        </Section>

        <Section title="Botões e selos">
          <Panel>
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
              <Button variant="primary" loading>
                Convertendo…
              </Button>
              <Button variant="primary" disabled>
                Desativado
              </Button>
              <Button variant="primary" size="lg">
                Ação principal no celular
              </Button>
              <IconButton icon={X} label="Remover arquivo" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Em breve</Badge>
              <Badge variant="accent">Novo</Badge>
              <Badge variant="success" icon={Check}>
                Pronto
              </Badge>
              <Badge variant="warning">Arquivo grande</Badge>
              <Badge variant="danger">Erro</Badge>
            </div>
          </Panel>
        </Section>

        <Section title="Opções da ferramenta">
          <Panel>
            <SegmentedControl label="Converter para" options={FORMAT_OPTIONS} value={format} onChange={setFormat} mono />
            <Slider
              label="Qualidade"
              value={quality}
              onChange={setQuality}
              min={10}
              max={100}
              formatValue={(value) => `${value}%`}
              hint="Valores menores geram arquivos menores, com mais perda de detalhes."
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <Field label="Largura">{(control) => <Input {...control} inputMode="numeric" defaultValue="1920" unit="px" />}</Field>
              <IconButton
                icon={keepRatio ? Lock : LockOpen}
                label="Manter proporção"
                variant="secondary"
                aria-pressed={keepRatio}
                onClick={() => setKeepRatio((current) => !current)}
              />
              <Field label="Altura">{(control) => <Input {...control} inputMode="numeric" defaultValue="1080" unit="px" />}</Field>
            </div>
            <Field label="Nome do arquivo" error="Use apenas letras, números, hífen e sublinhado." hint="A extensão é adicionada automaticamente.">
              {(control) => <Input {...control} defaultValue="minha foto?" />}
            </Field>
          </Panel>
        </Section>

        <Section title="Seleção e pré-visualização">
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
            <Panel>
              <FilePreview src="/icons/icon-512.png" alt="Pré-visualização de icon-512.png, 512 por 512" />
              <FileInfo name="icon-512.png" format="png" width={512} height={512} sizeBytes={9_656} />
            </Panel>
          </div>
        </Section>

        <Section title="Processamento e mensagens">
          <Panel>
            <ProgressBar label="Convertendo logo-transparente.png" value={64} />
            <ProgressBar label="Preparando arquivos" />
            <Alert variant="error" title="Formato não suportado" live={false}>
              “documento.pdf” não é uma imagem. Escolha um arquivo JPG, PNG ou WEBP.
            </Alert>
            <Alert variant="warning" title="A transparência será perdida" live={false}>
              JPG não tem transparência. As áreas transparentes ficarão brancas.
            </Alert>
            <Alert variant="success" title="3 imagens convertidas" live={false}>
              Os arquivos estão prontos para baixar.
            </Alert>
            <Alert variant="info" title="Processamento local" live={false}>
              A imagem é convertida no seu navegador e não é enviada para nenhum servidor.
            </Alert>
          </Panel>
        </Section>

        <Section title="Resultado e download">
          <Panel>
            <FileInfo name="praia-2026.webp" format="webp" width={3024} height={4032} sizeBytes={1_992_294} />
            <ResultSummary beforeBytes={9_017_753} afterBytes={1_992_294} />
            <ResultSummary beforeBytes={1_000_000} afterBytes={1_120_000} />
            <DownloadActions getFiles={() => [SAMPLE_FILE]} downloadLabel="Baixar exemplo" />
          </Panel>
        </Section>

        <Section title="Barra de ação">
          <p className="text-sm text-fg-muted">
            No celular ela fica fixa no rodapé, e esta rota esconde a barra de navegação, como farão as ferramentas.
          </p>
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
