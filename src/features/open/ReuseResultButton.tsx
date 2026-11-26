import { Forward } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { MediaKind } from '../../core/media-kind'
import { FileActionSheet } from './FileActionSheet'
import type { OpenedMedia } from './useOpenMedia'

interface ReuseResultButtonProps {
  kind: MediaKind
  /** Arquivos do resultado, lidos só no toque (não ficam no estado do React). */
  getFiles: () => File[]
  size: 'md' | 'lg'
}

/**
 * "Usar em outra ferramenta": o resultado abre o mesmo painel "O que fazer com este arquivo?", e a
 * ferramenta escolhida o recebe já aberto, sem baixar e escolher de novo.
 */
export function ReuseResultButton({ kind, getFiles, size }: ReuseResultButtonProps) {
  const [opened, setOpened] = useState<OpenedMedia | null>(null)

  function open() {
    const files = getFiles()
    const [first] = files
    if (!first) return
    setOpened({ kind, files, formatLabel: first.name.split('.').pop()?.toUpperCase().replace('JPEG', 'JPG') ?? '' })
  }

  return (
    <>
      <Button size={size} block icon={Forward} onClick={open}>
        Usar em outra ferramenta
      </Button>
      <FileActionSheet opened={opened} onClose={() => setOpened(null)} />
    </>
  )
}
