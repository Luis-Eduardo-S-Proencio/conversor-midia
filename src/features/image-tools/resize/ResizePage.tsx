import { Scaling } from 'lucide-react'
import { ImageToolPage } from '../shared/ImageToolPage'
import { ResizeOptions } from './ResizeOptions'
import { RESIZE_LABELS, RESIZE_ZIP_NAME } from './settings'
import { useResizeTool } from './useResizeTool'

export function ResizePage() {
  const tool = useResizeTool()
  const { summary, webpSupported } = tool.batch

  return (
    <ImageToolPage
      title="Redimensionar imagem"
      description="Mude a largura e a altura de imagens JPG, PNG e WEBP, por porcentagem ou em pixels, uma ou várias de uma vez. As imagens não saem do seu dispositivo."
      labels={RESIZE_LABELS}
      actionIcon={Scaling}
      batch={tool.batch}
      onStart={tool.resize}
      zipName={RESIZE_ZIP_NAME}
      options={
        <ResizeOptions
          settings={tool.settings}
          onChange={tool.updateSettings}
          error={tool.error}
          focusRequest={tool.focusRequest}
          outcome={tool.outcome}
          formats={summary.formats}
          webpSupported={webpSupported}
          disabled={summary.isProcessing}
        />
      }
    />
  )
}
