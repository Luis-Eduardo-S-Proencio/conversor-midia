import { Minimize2 } from 'lucide-react'
import { ImageToolPage } from '../shared/ImageToolPage'
import { CompressOptions } from './CompressOptions'
import { COMPRESS_LABELS, COMPRESS_ZIP_NAME } from './settings'
import { useCompressTool } from './useCompressTool'

export function CompressPage() {
  const tool = useCompressTool()
  const { summary, webpSupported } = tool.batch

  return (
    <ImageToolPage
      title="Comprimir imagem"
      description="Reduza o tamanho das fotos com pouca perda de qualidade."
      labels={COMPRESS_LABELS}
      actionIcon={Minimize2}
      batch={tool.batch}
      onStart={tool.compress}
      zipName={COMPRESS_ZIP_NAME}
      options={
        <CompressOptions
          level={tool.level}
          onChange={tool.changeLevel}
          formats={summary.formats}
          webpSupported={webpSupported}
          disabled={summary.isProcessing}
        />
      }
    />
  )
}
