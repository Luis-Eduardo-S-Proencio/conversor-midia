import { Film, Image as ImageIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { handOffFiles } from '../features/shared/file-handoff'
import { toolsFor } from '../app/tool-catalog'
import { Dropzone } from '../components/tool/Dropzone'
import { FilePickerButton } from '../components/tool/FilePickerButton'
import { usePageFileDrop } from '../components/tool/usePageFileDrop'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { ToolIcon } from '../components/ui/ToolIcon'
import { formatBytes } from '../core/format'
import { MEDIA_SIGNATURE_BYTES, detectMediaKind, planOpening, type MediaKind } from '../core/media-kind'

/** Filtro do seletor do sistema; o tipo de verdade é conferido pelo conteúdo. */
const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov'

/** Arquivos abertos no início, para que qualquer ferramenta do mesmo tipo os receba. */
export interface OpenedMedia {
  kind: MediaKind
  files: readonly File[]
}

interface Chosen {
  kind: MediaKind
  /** Nome do arquivo ou "as 3 imagens". */
  label: string
  detail: string
  count: number
}

async function readKind(file: File): Promise<MediaKind | null> {
  try {
    return detectMediaKind(new Uint8Array(await file.slice(0, MEDIA_SIGNATURE_BYTES).arrayBuffer()))
  } catch {
    return null // arquivo ilegível (ex.: apagado depois de escolhido): vira "não é imagem nem vídeo"
  }
}

function describe(kind: MediaKind, files: readonly File[]): Chosen {
  const total = files.reduce((sum, file) => sum + file.size, 0)
  const [first] = files
  if (kind === 'image' && files.length > 1) {
    return { kind, label: `as ${files.length} imagens`, detail: `${files.length} imagens · ${formatBytes(total)}`, count: files.length }
  }
  return { kind, label: first?.name ?? '', detail: `${kind === 'image' ? 'Imagem' : 'Vídeo'} · ${formatBytes(total)}`, count: 1 }
}

/**
 * Entrada da página inicial: abre uma foto ou um vídeo, reconhece o tipo pelos primeiros bytes
 * e pergunta o que fazer. A ferramenta escolhida recebe o arquivo já aberto (só na memória da aba).
 * `onOpened` avisa a página, para que os outros links de ferramenta também levem o arquivo.
 */
export function QuickOpen({ onOpened }: { onOpened: (opened: OpenedMedia | null) => void }) {
  const files = useRef<File[]>([])
  const request = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const [chosen, setChosen] = useState<Chosen | null>(null)
  const [error, setError] = useState('')

  const open = useCallback((incoming: File[]) => {
    const current = ++request.current
    void Promise.all(incoming.map(readKind)).then((kinds) => {
      if (current !== request.current) return // outro arquivo foi escolhido no meio da leitura
      const plan = planOpening(incoming.map((file, index) => ({ name: file.name, kind: kinds[index] ?? null })))
      if (!plan.ok) {
        files.current = []
        onOpened(null)
        setChosen(null)
        setError(plan.message)
        return
      }
      files.current = incoming
      onOpened({ kind: plan.kind, files: incoming })
      setError('')
      setChosen(describe(plan.kind, incoming))
    })
  }, [onOpened])

  usePageFileDrop(open, true)

  // Escolheu: o foco vai para a pergunta, que já diz qual arquivo foi aberto.
  useEffect(() => {
    if (chosen) heading.current?.focus()
  }, [chosen])

  if (!chosen) {
    return (
      <div className="grid gap-3">
        {error && (
          <Alert variant="error" title="Não deu para abrir">
            {error}
          </Alert>
        )}
        <Dropzone
          accept={ACCEPT}
          onFiles={open}
          size="lg"
          buttonLabel="Abrir foto ou vídeo"
          dragLabel="Arraste uma foto ou um vídeo para cá"
          hint="JPG, PNG, WEBP · MP4, MOV, WEBM até 1 GB"
          className="py-10"
        />
      </div>
    )
  }

  const tools = toolsFor(chosen.kind)
  return (
    <div className="grid animate-enter gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-raised text-fg-muted">
          <Icon icon={chosen.kind === 'image' ? ImageIcon : Film} />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h2 ref={heading} id={headingId} tabIndex={-1} className="text-lg font-bold tracking-tight [overflow-wrap:anywhere] focus:outline-none">
            O que fazer com {chosen.label}?
          </h2>
          <p className="text-sm text-fg-muted tabular-nums">{chosen.detail}</p>
        </div>
      </div>
      <ul aria-labelledby={headingId} className="grid gap-2 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              to={tool.to}
              onClick={() => handOffFiles(chosen.kind, files.current)}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm font-semibold text-fg transition-colors hover:border-border-strong hover:bg-surface-overlay"
            >
              <ToolIcon icon={tool.icon} tone={tool.tone} />
              {tool.title}
            </Link>
          </li>
        ))}
      </ul>
      {chosen.count > 1 && (
        <p className="text-xs text-fg-subtle">Recortar imagem trabalha com uma imagem de cada vez: abre só a primeira.</p>
      )}
      <FilePickerButton variant="ghost" accept={ACCEPT} onFiles={open} className="justify-self-start">
        Escolher outro arquivo
      </FilePickerButton>
    </div>
  )
}
