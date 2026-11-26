import { useState } from 'react'
import { RECOMMENDED_TOOL, toolsForOpened } from '../../app/tool-catalog'
import { FilePickerButton } from '../../components/tool/FilePickerButton'
import { ToolList } from '../../components/tool/ToolList'
import { Badge } from '../../components/ui/Badge'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { handOffFiles } from '../shared/file-handoff'
import { OPEN_ACCEPT } from './accept'
import { OpenedSummary } from './OpenedSummary'
import type { OpenedMedia } from './useOpenMedia'

interface FileActionSheetProps {
  /** O que foi aberto; `null` fecha o painel. */
  opened: OpenedMedia | null
  onClose: () => void
  /** "Escolher outro arquivo", sem sair do painel. Sem isso (resultado indo para outra ferramenta), o botão some. */
  onChooseAnother?: (files: File[]) => void
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
        onChooseAnother && (
          <FilePickerButton variant="ghost" accept={OPEN_ACCEPT} onFiles={onChooseAnother} className="-ml-2">
            Escolher outro arquivo
          </FilePickerButton>
        )
      }
    >
      <div className="grid gap-4">
        <OpenedSummary opened={shown} />
        {/* A ferramenta toma o lugar do passo do painel no histórico: voltar dela leva ao início, não ao painel. */}
        <ToolList
          tools={tools}
          label={title}
          replace
          raised
          onNavigate={() => handOffFiles(shown.kind, shown.files)}
          badgeFor={(tool) => tool.id === recommended && <Badge variant="accent">Recomendado</Badge>}
        />
        {count > 1 && <p className="text-caption font-normal text-fg-subtle">Para recortar, abra uma imagem de cada vez.</p>}
      </div>
    </BottomSheet>
  )
}
