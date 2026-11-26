import { LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { toolsFor } from '../../app/tool-catalog'
import type { MediaKind } from '../../core/media-kind'
import { handOffOpenFiles } from '../../features/shared/file-handoff'
import { BottomSheet } from '../ui/BottomSheet'
import { IconButton } from '../ui/Button'
import { ToolList } from './ToolList'

const SHEET_TITLE: Record<MediaKind, string> = {
  image: 'Ferramentas de imagem',
  video: 'Ferramentas de vídeo',
}

/**
 * "Outras ferramentas", na barra da ferramenta: painel com as ferramentas do mesmo tipo (a atual marcada).
 * Indo para outra, os arquivos abertos vão junto, e ela toma o lugar do painel no histórico.
 */
export function ToolMenuButton({ media }: { media: MediaKind }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const title = SHEET_TITLE[media]

  return (
    <>
      <IconButton icon={LayoutGrid} label="Outras ferramentas" tooltipAlign="end" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel="Fechar">
        <nav aria-label={title}>
          <ToolList tools={toolsFor(media)} currentPath={pathname} replace raised onNavigate={() => handOffOpenFiles(media)} />
        </nav>
      </BottomSheet>
    </>
  )
}
