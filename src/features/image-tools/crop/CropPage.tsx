import { Crop } from 'lucide-react'
import { CropArea } from '../../../components/tool/CropArea'
import { CropOptions } from '../../../components/tool/CropOptions'
import { FilePreview } from '../../../components/tool/FilePreview'
import { ImageToolPage } from '../shared/ImageToolPage'
import { CROP_LABELS, CROP_ZIP_NAME } from './settings'
import { useCropTool } from './useCropTool'

export function CropPage() {
  const tool = useCropTool()
  const { items, summary, webpSupported } = tool.batch
  const { editor } = tool
  const rejected = items[0]?.status === 'rejected'
  const webpNote = webpSupported === false && summary.formats.includes('webp')

  return (
    <ImageToolPage
      title="Recortar imagem"
      overlayCompare={false}
      description="Mantenha só a parte que importa, arrastando a área ou digitando as medidas."
      labels={CROP_LABELS}
      actionIcon={Crop}
      batch={tool.batch}
      onStart={tool.apply}
      zipName={CROP_ZIP_NAME}
      singleImage
      renderPreview={(item) =>
        editor && item.previewUrl ? (
          <CropArea
            size={editor.image}
            crop={editor.crop}
            ratio={tool.ratio}
            onChange={tool.changeCrop}
            disabled={summary.isProcessing || summary.hasResults}
          >
            <img src={item.previewUrl} alt={`Pré-visualização de ${item.name}`} decoding="async" className="bg-checker" />
          </CropArea>
        ) : (
          item.previewUrl && <FilePreview src={item.previewUrl} alt={`Pré-visualização de ${item.name}`} />
        )
      }
      options={
        editor ? (
          <CropOptions
            subject="image"
            size={editor.image}
            aspect={tool.aspect}
            onAspectChange={tool.changeAspect}
            fields={editor.fields}
            onFieldChange={tool.changeField}
            crop={editor.crop}
            onReset={tool.resetCrop}
            error={tool.error}
            focusRequest={tool.focusRequest}
            notes={webpNote && <p className="text-xs text-fg-subtle">Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.</p>}
            disabled={summary.isProcessing}
          />
        ) : (
          <p className="text-sm text-fg-muted">{rejected ? 'Escolha outra imagem para recortar.' : 'Abrindo a imagem…'}</p>
        )
      }
    />
  )
}
