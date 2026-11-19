import { Crop } from 'lucide-react'
import { FilePreview } from '../../../components/tool/FilePreview'
import { ImageToolPage } from '../shared/ImageToolPage'
import { CropArea } from './CropArea'
import { CropOptions } from './CropOptions'
import { CROP_LABELS, CROP_ZIP_NAME } from './settings'
import { useCropTool } from './useCropTool'

export function CropPage() {
  const tool = useCropTool()
  const { items, summary, webpSupported } = tool.batch
  const { editor } = tool
  const rejected = items[0]?.status === 'rejected'

  return (
    <ImageToolPage
      title="Recortar imagem"
      description="Mantenha só a parte que importa de uma imagem JPG, PNG ou WEBP, arrastando a área ou digitando as medidas. A imagem não sai do seu dispositivo."
      labels={CROP_LABELS}
      actionIcon={Crop}
      batch={tool.batch}
      onStart={tool.apply}
      zipName={CROP_ZIP_NAME}
      singleImage
      renderPreview={(item) =>
        editor && item.previewUrl ? (
          <CropArea
            src={item.previewUrl}
            alt={`Pré-visualização de ${item.name}`}
            image={editor.image}
            crop={editor.crop}
            ratio={tool.ratio}
            onChange={tool.changeCrop}
            disabled={summary.isProcessing || summary.hasResults}
          />
        ) : (
          item.previewUrl && <FilePreview src={item.previewUrl} alt={`Pré-visualização de ${item.name}`} />
        )
      }
      options={
        editor ? (
          <CropOptions
            image={editor.image}
            aspect={tool.aspect}
            onAspectChange={tool.changeAspect}
            fields={editor.fields}
            onFieldChange={tool.changeField}
            crop={editor.crop}
            onReset={tool.resetCrop}
            error={tool.error}
            focusRequest={tool.focusRequest}
            formats={summary.formats}
            webpSupported={webpSupported}
            disabled={summary.isProcessing}
          />
        ) : (
          <p className="text-sm text-fg-muted">{rejected ? 'Escolha outra imagem para recortar.' : 'Abrindo a imagem…'}</p>
        )
      }
    />
  )
}
