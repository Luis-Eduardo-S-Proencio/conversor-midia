import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { RECOMMENDED_TOOL, toolsForOpened } from '../../app/tool-catalog'
import { TransitionLink } from '../../components/layout/TransitionLink'
import { FilePickerButton } from '../../components/tool/FilePickerButton'
import { Badge } from '../../components/ui/Badge'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Icon } from '../../components/ui/Icon'
import { ToolIcon } from '../../components/ui/ToolIcon'
import { handOffFiles } from '../../features/shared/file-handoff'
import { OPEN_ACCEPT } from './accept'
import { OpenedSummary } from './OpenedSummary'
import type { OpenedMedia } from './useOpenMedia'

interface FileActionSheetProps {
  /** O que foi aberto; `null` fecha o painel. */
  opened: OpenedMedia | null
  onClose: () => void
  /** "Escolher outro arquivo", sem sair do painel. */
  onChooseAnother: (files: File[]) => void
}

/**
 * "O que fazer com este arquivo?": sobe de baixo depois de escolher o arquivo, com a miniatura, os
 * dados dele e as ferramentas que o abrem. A escolhida recebe o arquivo já aberto (só na memória da aba).
 */
export function FileActionSheet({ opened, onClose, onChooseAnother }: FileActionSheetProps) {
  // Mantém o último conteúdo enquanto o painel desce (com `opened` nulo, ele sumiria no meio da saída).
  const [shown, setShown] = useState(opened)
  if (opened && opened !== shown) setShown(opened)
  if (!shown) return null

  const count = shown.files.length
  const tools = toolsForOpened(shown.kind, count)
  const recommended = RECOMMENDED_TOOL[shown.kind]
  const title = count > 1 ? 'O que fazer com estas imagens?' : 'O que fazer com este arquivo?'

  return (
    <BottomSheet
      open={opened !== null}
      onClose={onClose}
      closeLabel="Fechar"
      title={title}
      footer={
        <FilePickerButton variant="ghost" accept={OPEN_ACCEPT} onFiles={onChooseAnother} className="-ml-2">
          Escolher outro arquivo
        </FilePickerButton>
      }
    >
      <div className="grid gap-4">
        <OpenedSummary opened={shown} />
        <ul aria-label={title} className="grid gap-1.5 md:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.id} className={tool.id === recommended ? 'md:col-span-2' : undefined}>
              <TransitionLink
                to={tool.to}
                // A ferramenta toma o lugar do passo do painel no histórico: voltar dela leva ao início, não ao painel.
                replace
                onClick={() => handOffFiles(shown.kind, shown.files)}
                className="pressable group flex min-h-15 items-center gap-3 rounded-md border border-border bg-surface-3 px-3 py-2 hover:pointer-fine:border-border-strong hover:pointer-fine:bg-surface-hover"
              >
                <ToolIcon icon={tool.icon} tone={tool.tone} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                    {tool.title}
                    {tool.id === recommended && <Badge variant="accent">Recomendado</Badge>}
                  </span>
                  <span className="truncate text-secondary text-fg-muted">{tool.description}</span>
                </span>
                <Icon icon={ChevronRight} size="sm" className="text-fg-subtle" />
              </TransitionLink>
            </li>
          ))}
        </ul>
        {count > 1 && <p className="text-caption font-normal text-fg-subtle">Para recortar, abra uma imagem de cada vez.</p>}
      </div>
    </BottomSheet>
  )
}
