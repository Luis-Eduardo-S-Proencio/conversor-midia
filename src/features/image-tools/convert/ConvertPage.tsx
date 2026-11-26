import { ArrowLeftRight } from 'lucide-react'
import { ToolShortcuts } from '../../../components/tool/ToolShortcuts'
import type { OutputFormat } from '../../../core/image/formats'
import { ImageToolPage } from '../shared/ImageToolPage'
import { ConvertOptions } from './ConvertOptions'
import { CONVERT_LABELS, CONVERT_ZIP_NAME } from './settings'
import { useConvertTool } from './useConvertTool'

/** Os destinos mais pedidos, já escolhidos antes de abrir as imagens. */
const QUICK_FORMATS: ReadonlyArray<{ value: OutputFormat; label: string }> = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'pdf', label: 'PDF' },
]

export function ConvertPage() {
  const tool = useConvertTool()
  const { summary, webpSupported } = tool.batch

  return (
    <ImageToolPage
      title="Converter imagem"
      description="Transforme fotos em JPG, PNG, WEBP, BMP, TIFF, ICO ou PDF, uma ou várias de uma vez."
      labels={CONVERT_LABELS}
      actionIcon={ArrowLeftRight}
      batch={tool.batch}
      onStart={tool.convert}
      zipName={CONVERT_ZIP_NAME}
      backdrop={tool.backdrop}
      shortcuts={
        <ToolShortcuts
          label="Converter para"
          options={QUICK_FORMATS}
          value={tool.chosenTarget && QUICK_FORMATS.some((format) => format.value === tool.chosenTarget) ? tool.chosenTarget : undefined}
          onChange={(target) => tool.updateSettings({ target })}
        />
      }
      options={
        <ConvertOptions
          settings={tool.settings}
          onChange={tool.updateSettings}
          webpSupported={webpSupported}
          hasTransparency={summary.hasTransparency}
          disabled={summary.isProcessing}
        />
      }
    />
  )
}
