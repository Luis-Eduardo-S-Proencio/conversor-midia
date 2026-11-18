import { ArrowLeftRight } from 'lucide-react'
import { ImageToolPage } from '../shared/ImageToolPage'
import { ConvertOptions } from './ConvertOptions'
import { CONVERT_LABELS, CONVERT_ZIP_NAME } from './settings'
import { useConvertTool } from './useConvertTool'

export function ConvertPage() {
  const tool = useConvertTool()
  const { summary, webpSupported } = tool.batch

  return (
    <ImageToolPage
      title="Converter imagem"
      description="Transforme JPG, PNG e WEBP em JPG, PNG, WEBP, GIF, BMP, TIFF, ICO ou PDF, um ou vários arquivos de uma vez. As imagens não saem do seu dispositivo."
      labels={CONVERT_LABELS}
      actionIcon={ArrowLeftRight}
      batch={tool.batch}
      onStart={tool.convert}
      zipName={CONVERT_ZIP_NAME}
      backdrop={tool.backdrop}
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
