import { RotateCw } from 'lucide-react'
import { ImageToolPage } from '../shared/ImageToolPage'
import { RotateOptions } from './RotateOptions'
import { ROTATE_LABELS, ROTATE_ZIP_NAME } from './settings'
import { useRotateTool } from './useRotateTool'

export function RotatePage() {
  const tool = useRotateTool()
  const { summary, webpSupported } = tool.batch

  return (
    <ImageToolPage
      title="Girar e espelhar"
      adjustables={['Girar 90°', 'Espelhar']}
      overlayCompare={false}
      description="Gire em 90° e espelhe imagens JPG, PNG e WEBP, uma ou várias de uma vez. As imagens não saem do seu dispositivo."
      labels={ROTATE_LABELS}
      actionIcon={RotateCw}
      batch={tool.batch}
      onStart={tool.apply}
      zipName={ROTATE_ZIP_NAME}
      orientation={tool.orientation}
      options={
        <RotateOptions
          orientation={tool.orientation}
          onStep={tool.step}
          onReset={tool.resetOrientation}
          error={tool.error}
          focusRequest={tool.focusRequest}
          formats={summary.formats}
          webpSupported={webpSupported}
          disabled={summary.isProcessing}
        />
      }
    />
  )
}
