import { Crop } from 'lucide-react'
import { CropOptions } from '../../../components/tool/CropOptions'
import { Alert } from '../../../components/ui/Alert'
import { formatDimensions } from '../../../core/format'
import { encodableCrop, tooSmallToCrop } from '../../../core/video/crop'
import { codecLabel } from '../../../core/video/formats'
import { Note } from '../shared/Note'
import { VideoToolPage } from '../shared/VideoToolPage'
import { VIDEO_CROP_LABELS } from './settings'
import { useVideoCropTool } from './useVideoCropTool'
import { VideoCropPreview } from './VideoCropPreview'

export function VideoCropPage() {
  const crop = useVideoCropTool()
  const { tool, editor } = crop
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'
  const final = editor ? encodableCrop(editor.crop) : undefined
  const adjusted = editor && final ? final.width !== editor.crop.width || final.height !== editor.crop.height : false
  const blocker = !info
    ? undefined
    : !info.canTranscodeVideo
      ? `Recortar exige recodificar o vídeo, e este navegador não consegue recodificar vídeos ${codecLabel(info.codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Safari.`
      : tooSmallToCrop(info)
        ? 'Este vídeo é pequeno demais para recortar.'
        : undefined

  return (
    <VideoToolPage
      title="Recortar vídeo"
      description="Mantenha só a parte do quadro que importa, arrastando a área ou digitando as medidas. MP4, MOV ou WEBM; o vídeo não sai do seu dispositivo."
      labels={VIDEO_CROP_LABELS}
      actionIcon={Crop}
      tool={tool}
      canStart={Boolean(editor) && !blocker}
      onStart={crop.apply}
      preview={
        state.sourceUrl &&
        info &&
        editor && (
          <VideoCropPreview
            key={state.fileId}
            src={state.sourceUrl}
            name={state.file?.name ?? ''}
            size={editor.size}
            duration={info.duration}
            crop={editor.crop}
            ratio={crop.ratio}
            onChange={crop.changeCrop}
            disabled={busy || state.phase === 'done' || Boolean(blocker)}
          />
        )
      }
      options={
        blocker ? (
          <Alert variant="error" title="Recorte indisponível neste navegador">
            {blocker}
          </Alert>
        ) : (
          editor &&
          final && (
            <CropOptions
              subject="video"
              size={editor.size}
              aspect={crop.aspect}
              onAspectChange={crop.changeAspect}
              fields={editor.fields}
              onFieldChange={crop.changeField}
              crop={editor.crop}
              finalSize={final}
              onReset={crop.resetCrop}
              error={crop.error}
              focusRequest={crop.focusRequest}
              disabled={busy}
              notes={
                <>
                  {adjusted && <Note>Vídeos saem com largura e altura pares: a área perde 1 px onde a medida for ímpar.</Note>}
                  <Note>{`O vídeo é recodificado em alta qualidade, o que pode demorar em vídeos longos.${info?.hasAudio ? ' O som é mantido.' : ''}`}</Note>
                  {info?.extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
                </>
              }
            />
          )
        )
      }
      resultDetails={
        final && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Tamanho</dt>
            <dd className="tabular-nums text-fg">{formatDimensions(final.width, final.height)}</dd>
          </dl>
        )
      }
    />
  )
}
