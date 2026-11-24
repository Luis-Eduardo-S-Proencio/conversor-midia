import { useCallback, useEffect, useMemo, useState } from 'react'
import { videoOutputName } from '../../../core/video/output-name'
import { formatTime } from '../../../core/video/time'
import {
  commit,
  deletePiece,
  editedDuration,
  initialEdit,
  moveEdge,
  redo,
  savePlan,
  splitAt,
  startHistory,
  undo,
  type Edge,
  type Edit,
  type History,
  type SavePlan,
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
  /** Enquanto uma ponta é arrastada: a edição provisória, que vira um passo só ao soltar. */
  draft?: Edit
  selected?: number
}

/**
 * Editar vídeo: um vídeo por vez. A pessoa divide, exclui pedaços e ajusta as pontas na barra, vendo o
 * resultado no player na hora; só ao salvar o arquivo é gerado (um trecho pode ser copiado sem refazer;
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
  const edit = session ? (session.draft ?? session.history.present) : undefined
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
      update((current) => ({ ...current, history: commit(current.history, next) }))
      setAnnouncement(`Dividido em ${formatTime(editedTime)}. Toque num pedaço para selecionar.`)
    },
    [session, update, setAnnouncement],
  )

  const remove = useCallback(() => {
    if (!session?.selected) return
    const next = deletePiece(session.history.present, session.selected)
    if (!next) return
    update((current) => ({ ...current, history: commit(current.history, next), selected: undefined }))
    setAnnouncement(`Pedaço excluído. O vídeo agora tem ${formatTime(editedDuration(next.pieces))}.`)
  }, [session, update, setAnnouncement])

  const select = useCallback(
    (id: number | undefined) => {
      if (session) setStored({ ...session, selected: id })
    },
    [session],
  )

  /** Arrastar uma ponta muda a edição provisória; soltar (`done`) vira um passo para desfazer. */
  const moveSelectedEdge = useCallback(
    (id: number, edge: Edge, sourceTime: number, done: boolean) => {
      update((current) => {
        const next = moveEdge(current.history.present, id, edge, sourceTime, duration)
        return done ? { ...current, history: commit(current.history, next), draft: undefined } : { ...current, draft: next }
      })
    },
    [update, duration],
  )

  /** Ajuste fino: as duas pontas de uma vez, pelos campos de tempo. */
  const setSelectedRange = useCallback(
    (id: number, start: number, end: number) => {
      update((current) => {
        const withStart = moveEdge(current.history.present, id, 'start', Math.min(start, end), duration)
        return { ...current, history: commit(current.history, moveEdge(withStart, id, 'end', end, duration)) }
      })
    },
    [update, duration],
  )

  const undoEdit = useCallback(() => {
    update((current) => ({ ...current, history: undo(current.history), selected: undefined }))
    setAnnouncement('Desfeito.')
  }, [update, setAnnouncement])

  const redoEdit = useCallback(() => {
    update((current) => ({ ...current, history: redo(current.history), selected: undefined }))
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
    selected: session?.selected,
    canUndo: (session?.history.past.length ?? 0) > 0,
    canRedo: (session?.history.future.length ?? 0) > 0,
    thumbnails: thumbnails?.fileId === fileId ? thumbnails.value : undefined,
    plan,
    saveBlocker,
    split,
    remove,
    select,
    moveSelectedEdge,
    setSelectedRange,
    undo: undoEdit,
    redo: redoEdit,
    apply,
  }
}
