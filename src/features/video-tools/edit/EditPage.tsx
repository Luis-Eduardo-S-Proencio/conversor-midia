import { Save } from 'lucide-react'
import { formatTime } from '../../../core/video/time'
import { editedDuration } from '../../../core/video/timeline'
import { VideoToolPage } from '../shared/VideoToolPage'
import { EditOptions } from './EditOptions'
import { EDIT_LABELS } from './settings'
import { useEditTool } from './useEditTool'
import { VideoEditor } from './VideoEditor'

export function EditPage() {
  const editor = useEditTool()
  const { tool, edit, plan } = editor
  const { state } = tool
  const { info } = state
  const busy = state.phase === 'processing'

  return (
    <VideoToolPage
      title="Editar vídeo"
      description="Tire as partes que não quer e ponha textos, vendo na hora como fica."
      labels={EDIT_LABELS}
      actionIcon={Save}
      tool={tool}
      canStart={editor.canSave}
      onStart={editor.apply}
      preview={
        state.sourceUrl &&
        info &&
        edit && (
          <VideoEditor
            key={state.fileId}
            src={state.sourceUrl}
            name={state.file?.name ?? ''}
            duration={info.duration}
            edit={edit}
            selection={editor.selection}
            thumbnails={editor.thumbnails}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onSplit={editor.split}
            onDelete={editor.remove}
            onUndo={editor.undo}
            onRedo={editor.redo}
            onSelect={editor.select}
            onSelectionEdge={editor.moveSelection}
            texts={editor.texts}
            selectedText={editor.selectedText}
            onAddText={editor.addText}
            onSelectText={editor.selectText}
            onChangeText={editor.changeText}
            onTextTime={editor.setTextTime}
            onDuplicateText={editor.duplicateText}
            onDeleteText={editor.removeText}
            disabled={busy}
          />
        )
      }
      options={
        info &&
        edit &&
        plan && (
          <EditOptions
            edit={edit}
            selection={editor.selection}
            plan={plan}
            texts={editor.look?.texts.length ?? 0}
            saveBlocker={editor.saveBlocker}
            extraTracks={info.extraTracks}
          />
        )
      }
      resultDetails={
        edit && (
          <dl className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Vídeo final</dt>
            <dd className="tabular-nums text-fg">{formatTime(editedDuration(edit.pieces))}</dd>
          </dl>
        )
      }
    />
  )
}
