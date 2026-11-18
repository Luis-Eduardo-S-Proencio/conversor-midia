import { Info } from 'lucide-react'
import type { ImageFormat } from '../../../core/image/formats'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { COMPRESSION_LEVELS, type CompressionLevel } from './settings'

const LEVEL_OPTIONS = (Object.keys(COMPRESSION_LEVELS) as CompressionLevel[]).map((value) => ({
  value,
  label: COMPRESSION_LEVELS[value].label,
}))

interface CompressOptionsProps {
  level: CompressionLevel
  onChange: (level: CompressionLevel) => void
  /** Formatos dos arquivos válidos: a nota sobre PNG só aparece quando importa. */
  formats: readonly ImageFormat[]
  webpSupported: boolean | undefined
  disabled?: boolean
}

function formatNote(formats: readonly ImageFormat[], webpSupported: boolean | undefined): string | undefined {
  if (webpSupported !== false) {
    return formats.includes('png')
      ? 'PNG sai em WEBP: mantém a transparência e ocupa bem menos.'
      : undefined
  }
  return formats.some((format) => format !== 'jpeg')
    ? 'Neste navegador, PNG e WEBP sem transparência saem em JPG; com transparência, não podem ser reduzidos aqui.'
    : undefined
}

export function CompressOptions({ level, onChange, formats, webpSupported, disabled = false }: CompressOptionsProps) {
  const note = formatNote(formats, webpSupported)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <SegmentedControl label="Nível de compressão" options={LEVEL_OPTIONS} value={level} onChange={onChange} disabled={disabled} />
        <p className="text-xs text-fg-subtle">{COMPRESSION_LEVELS[level].hint}</p>
      </div>

      {note && <p className="text-xs text-fg-subtle">{note}</p>}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>A compressão remove metadados, como localização e data da foto. Se a versão reduzida ficar maior, a original é mantida.</span>
      </p>
    </div>
  )
}
