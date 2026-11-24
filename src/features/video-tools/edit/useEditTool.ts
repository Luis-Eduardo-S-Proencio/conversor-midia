import { useCallback, useEffect, useMemo, useState } from 'react'
import { videoOutputName } from '../../../core/video/output-name'
import { formatTime } from '../../../core/video/time'
import {
  commit,
  editedDuration,
  initialEdit,
  moveSelectionEdge,
  redo,
  removeSelection,
  savePlan,
  selectPiece,
  splitAt,
  startHistory,
  undo,
  type Edge,
  type Edit,
  type History,
  type SavePlan,
  type Selection,
} from '../../../core/video/timeline'
import { TIME_TOLERANCE, availableTrimModes, canRemoveParts } from '../../../core/video/trim'
import { codecLabel } from '../../../core/video/formats'
import { isAbortError } from '../../../workers/video-client'
import { useVideoTool } from '../shared/useVideoTool'
import { EDIT_LABELS, EDIT_SUFFIX, THUMBNAIL_HEIGHT, thumbnailCount } from './settings'

/** Miniaturas lado a lado numa imagem só, com as medidas de cada uma. */
export interface Thumbnails {
  url: string
  count: number
  width: number
  height: number
}

interface Session {
  fileId: number
  history: History<Edit>
  /** A parte marcada para sair (as alças a ajustam; só "Excluir" muda o vídeo). */
  selection?: Selection
}

/**
 * Editar vídeo: um vídeo por vez. A pessoa marca na barra a parte que quer tirar (tocando num pedaço e
 * arrastando as alças) e exclui, ou divide o vídeo em pedaços, vendo o resultado no player na hora; só ao salvar o arquivo é gerado (um trecho pode ser copiado sem refazer;
 * vários são juntados). Cada mudança pode ser desfeita.
 */
export function useEditTool() {
  const tool = useVideoTool(EDIT_LABELS)
  const { info, fileId } = tool.state
  const { invalidateResult, run, runAside, setAnnouncement } = tool
  const [stored, setStored] = useState<Session>()
  const [thumbnails, setThumbnails] = useState<{ fileId: number; value: Thumbnails }>()

  // Vídeo novo: a edição recomeça com o vídeo inteiro.
  const session = useMemo<Session | undefined>(() => {
    if (!info) return undefined
    return stored?.fileId === fileId ? stored : { fileId, history: startHistory(initialEdit(info.duration)) }
  }, [info, fileId, stored])
  const edit = session?.history.present
  const duration = info?.duration ?? 0

  // Miniaturas da barra, geradas logo depois de abrir. Sem elas (vídeo que o navegador não lê), a barra funciona igual.
  useEffect(() => {
    if (!info?.canDecodeVideo) return
    const controller = new AbortController()
    let url: string | null = null
    runAside((file) => ({ kind: 'thumbnails', file, count: thumbnailCount(info.duration), height: THUMBNAIL_HEIGHT }), controller.signal).then(
      (output) => {
        if (!output || controller.signal.aborted) return
        url = URL.createObjectURL(output.blob)
        setThumbnails({ fileId, value: { url, count: output.count, width: output.width, height: output.height } })
      },
      (error: unknown) => {
        // Falhar aqui só deixa a barra sem miniaturas; o detalhe técnico fica no console de desenvolvimento.
        if (!isAbortError(error) && import.meta.env.DEV) console.error(error)
      },
    )
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [info, fileId, runAside])

  const update = useCallback(
    (change: (current: Session) => Session) => {
      if (!session) return
      setStored(change(session))
      invalidateResult()
    },
    [session, invalidateResult],
  )

  const split = useCallback(
    (editedTime: number) => {
      if (!session) return
      const next = splitAt(session.history.present, editedTime)
      if (!next) return
      update((current) => ({ ...current, history: commit(current.history, next), selection: undefined }))
      setAnnouncement(`Dividido em ${formatTime(editedTime)}. Toque num pedaço para marcá-lo.`)
    },
    [session, update, setAnnouncement],
  )

  /** Tira do vídeo a parte marcada (um passo para desfazer). */
  const remove = useCallback(() => {
    if (!session?.selection) return
    const { start, end } = session.selection
    const next = removeSelection(session.history.present, session.selection)
    if (!next) return
    update((current) => ({ ...current, history: commit(current.history, next), selection: undefined }))
    setAnnouncement(`Parte de ${formatTime(start)} a ${formatTime(end)} excluída. O vídeo agora tem ${formatTime(editedDuration(next.pieces))}.`)
  }, [session, update, setAnnouncement])

  /** Tocar num pedaço marca ele inteiro; tocar de novo no marcado desmarca. */
  const select = useCallback(
    (id: number | undefined) => {
      if (!session) return
      const selection = id === undefined || session.selection?.id === id ? undefined : selectPiece(session.history.present, id)
      setStored({ ...session, selection })
    },
    [session],
  )

  /** Arrastar uma alça muda só a marca: o vídeo não muda até "Excluir". */
  const moveSelection = useCallback(
    (edge: Edge, sourceTime: number) => {
      if (!session?.selection) return
      setStored({ ...session, selection: moveSelectionEdge(session.history.present, session.selection, edge, sourceTime) })
    },
    [session],
  )

  /** Ajuste fino: as duas pontas da marca de uma vez, pelos campos de tempo. */
  const setSelectionRange = useCallback(
    (start: number, end: number) => {
      if (!session?.selection) return
      const present = session.history.present
      // A ponta que encolhe primeiro: assim a outra não fica presa à posição antiga.
      const widened = { ...session.selection, start: Math.min(start, session.selection.start), end: Math.max(end, session.selection.end) }
      const withStart = moveSelectionEdge(present, widened, 'start', start)
      setStored({ ...session, selection: moveSelectionEdge(present, withStart, 'end', end) })
    },
    [session],
  )

  const undoEdit = useCallback(() => {
    update((current) => ({ ...current, history: undo(current.history), selection: undefined }))
    setAnnouncement('Desfeito.')
  }, [update, setAnnouncement])

  const redoEdit = useCallback(() => {
    update((current) => ({ ...current, history: redo(current.history), selection: undefined }))
    setAnnouncement('Refeito.')
  }, [update, setAnnouncement])

  const plan = useMemo<SavePlan | undefined>(() => (edit ? savePlan(edit, duration) : undefined), [edit, duration])

  /** Por que este navegador não consegue salvar a edição atual; `undefined` quando consegue. */
  const saveBlocker = useMemo(() => {
    if (!info || !plan || plan.kind === 'unchanged') return undefined
    const codec = codecLabel(info.codec)
    if (plan.kind === 'join' && !canRemoveParts(info)) {
      return info.canTranscodeVideo
        ? 'Para salvar mais de um pedaço, o som também é refeito, e este navegador não consegue refazer o som deste vídeo. Tente no Chrome, no Edge ou no Safari.'
        : `Para salvar mais de um pedaço, o vídeo é refeito, e este navegador não consegue refazer vídeos ${codec}. Aqui dá para tirar só o final do vídeo.`
    }
    // Um trecho que começa no início é copiado sem refazer; começando no meio, pode precisar refazer.
    if (plan.kind === 'trim' && plan.range.start > TIME_TOLERANCE && !availableTrimModes(info).exact) {
      return `Começar depois do início refaz o vídeo, e este navegador não consegue refazer vídeos ${codec}. Aqui dá para tirar só o final do vídeo.`
    }
    return undefined
  }, [info, plan])

  const apply = useCallback(() => {
    if (!info || !plan || plan.kind === 'unchanged' || saveBlocker) return
    const deliver = (output: { blob: Blob }, original: File) => ({ blob: output.blob, name: videoOutputName(original.name, info.format, EDIT_SUFFIX) })
    if (plan.kind === 'trim') {
      const { start, end } = plan.range
      void run((file) => ({ kind: 'trim', file, start, end, mode: 'exact' }), deliver)
    } else {
      const { ranges } = plan
      void run((file) => ({ kind: 'join', file, ranges }), deliver)
    }
  }, [info, plan, saveBlocker, run])

  return {
    tool,
    edit,
    selection: session?.selection,
    canUndo: (session?.history.past.length ?? 0) > 0,
    canRedo: (session?.history.future.length ?? 0) > 0,
    thumbnails: thumbnails?.fileId === fileId ? thumbnails.value : undefined,
    plan,
    saveBlocker,
    split,
    remove,
    select,
    moveSelection,
    setSelectionRange,
    undo: undoEdit,
    redo: redoEdit,
    apply,
  }
}
