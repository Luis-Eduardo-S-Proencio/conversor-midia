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
  sourceTimeAt,
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
import { TEXT_LIMITS, newText, setTextEdge, textsInRanges, type VideoText } from '../../../core/video/text'
import type { VideoLook } from '../../../core/video/look'
import { NO_EFFECTS, hasColorChange, type VideoEffects } from '../../../core/video/effects'
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

/** O que se desfaz: os cortes, os textos e os efeitos, juntos. */
interface EditorState {
  cut: Edit
  texts: VideoText[]
  nextTextId: number
  effects: VideoEffects
}

interface Session {
  fileId: number
  history: History<EditorState>
  /** A parte marcada para sair (as alças a ajustam; só "Excluir" muda o vídeo). */
  selection?: Selection
  /** O texto aberto para editar. */
  textId?: number
  /**
   * O texto aberto já mudou desde que foi aberto: as próximas mudanças (cada letra, cada arraste) ficam no
   * mesmo passo de desfazer, em vez de um passo por letra.
   */
  textDirty?: boolean
  /**
   * O último passo dos efeitos e o controle que o fez: mexer seguido no mesmo controle deslizante (cada passo
   * do arraste, cada seta) fica nesse passo, em vez de um passo de desfazer por valor.
   */
  effectsStep?: { key: string; state: EditorState }
}

const startEditor = (duration: number): History<EditorState> => startHistory({ cut: initialEdit(duration), texts: [], nextTextId: 1, effects: NO_EFFECTS })

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
    return stored?.fileId === fileId ? stored : { fileId, history: startEditor(info.duration) }
  }, [info, fileId, stored])
  const edit = session?.history.present.cut
  const texts = session?.history.present.texts
  const effects = session?.history.present.effects ?? NO_EFFECTS
  const { speed } = effects
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

  /** Um passo novo de desfazer com os cortes mudados (os textos continuam). */
  const commitCut = useCallback(
    (cut: Edit) => update((current) => ({ ...current, history: commit(current.history, { ...current.history.present, cut }), selection: undefined, textDirty: false })),
    [update],
  )

  const split = useCallback(
    (editedTime: number) => {
      if (!session) return
      const next = splitAt(session.history.present.cut, editedTime)
      if (!next) return
      commitCut(next)
      setAnnouncement(`Dividido em ${formatTime(editedTime)}. Toque num pedaço para marcá-lo.`)
    },
    [session, commitCut, setAnnouncement],
  )

  /** Tira do vídeo a parte marcada (um passo para desfazer). */
  const remove = useCallback(() => {
    if (!session?.selection) return
    const { start, end } = session.selection
    const next = removeSelection(session.history.present.cut, session.selection)
    if (!next) return
    commitCut(next)
    setAnnouncement(`Parte de ${formatTime(start)} a ${formatTime(end)} excluída. O vídeo agora tem ${formatTime(editedDuration(next.pieces))}.`)
  }, [session, commitCut, setAnnouncement])

  /** Tocar num pedaço marca ele inteiro; tocar de novo no marcado desmarca. */
  const select = useCallback(
    (id: number | undefined) => {
      if (!session) return
      const selection = id === undefined || session.selection?.id === id ? undefined : selectPiece(session.history.present.cut, id)
      setStored({ ...session, selection, textId: undefined, textDirty: false })
    },
    [session],
  )

  /** Arrastar uma alça muda só a marca: o vídeo não muda até "Excluir". */
  const moveSelection = useCallback(
    (edge: Edge, sourceTime: number) => {
      if (!session?.selection) return
      setStored({ ...session, selection: moveSelectionEdge(session.history.present.cut, session.selection, edge, sourceTime) })
    },
    [session],
  )

  /* Textos */

  /** Texto novo no ponto da linha, já aberto para escrever (um passo para desfazer). */
  const addText = useCallback(
    (editedTime: number) => {
      if (!session) return
      const present = session.history.present
      if (present.texts.length >= TEXT_LIMITS.maxTexts) {
        setAnnouncement(`O limite é de ${TEXT_LIMITS.maxTexts} textos por vídeo.`)
        return
      }
      const start = sourceTimeAt(present.cut.pieces, editedTime).time
      const text = newText(present.nextTextId, start, duration)
      update((current) => ({
        ...current,
        history: commit(current.history, { ...present, texts: [...present.texts, text], nextTextId: present.nextTextId + 1 }),
        selection: undefined,
        textId: text.id,
        // Escrever no texto novo faz parte do mesmo passo: desfazer tira o texto inteiro.
        textDirty: true,
      }))
      setAnnouncement(`Texto novo, de ${formatTime(text.start)} a ${formatTime(text.end)} do vídeo original. Escreva no campo Texto.`)
    },
    [session, duration, update, setAnnouncement],
  )

  const selectText = useCallback(
    (id: number | undefined) => {
      if (!session || session.textId === id) return
      setStored({ ...session, textId: id, selection: undefined, textDirty: false })
    },
    [session],
  )

  /**
   * Muda o texto aberto. A primeira mudança abre um passo de desfazer; as seguintes (cada letra, cada
   * arraste) ficam nele, até a pessoa fechar o texto ou abrir outro.
   */
  const changeText = useCallback(
    (id: number, change: (text: VideoText) => VideoText) => {
      if (!session) return
      const present = session.history.present
      const next = { ...present, texts: present.texts.map((text) => (text.id === id ? change(text) : text)) }
      const history = session.textDirty && session.textId === id ? { ...session.history, present: next } : commit(session.history, next)
      setStored({ ...session, history, textId: id, textDirty: true, selection: undefined })
      invalidateResult()
    },
    [session, invalidateResult],
  )

  const setTextTime = useCallback(
    (id: number, edge: 'start' | 'end', sourceTime: number) => changeText(id, (text) => setTextEdge(text, edge, sourceTime, duration)),
    [changeText, duration],
  )

  const removeText = useCallback(
    (id: number) => {
      if (!session) return
      const present = session.history.present
      update((current) => ({
        ...current,
        history: commit(current.history, { ...present, texts: present.texts.filter((text) => text.id !== id) }),
        textId: undefined,
        textDirty: false,
      }))
      setAnnouncement('Texto excluído.')
    },
    [session, update, setAnnouncement],
  )

  /** Cópia do texto, um pouco abaixo, aberta para editar. */
  const duplicateText = useCallback(
    (id: number) => {
      if (!session) return
      const present = session.history.present
      const original = present.texts.find((text) => text.id === id)
      if (!original || present.texts.length >= TEXT_LIMITS.maxTexts) return
      const copy = { ...original, id: present.nextTextId, y: Math.min(0.95, original.y + 0.1) }
      update((current) => ({
        ...current,
        history: commit(current.history, { ...present, texts: [...present.texts, copy], nextTextId: present.nextTextId + 1 }),
        textId: copy.id,
        textDirty: true,
      }))
      setAnnouncement('Texto duplicado.')
    },
    [session, update, setAnnouncement],
  )

  /* Efeitos */

  /**
   * Muda os efeitos (um passo de desfazer). Com `key` (um controle deslizante), as mudanças seguidas no mesmo
   * controle ficam no mesmo passo.
   */
  const changeEffects = useCallback(
    (change: (current: VideoEffects) => VideoEffects, key?: string) => {
      if (!session) return
      const present = session.history.present
      const next = { ...present, effects: change(present.effects) }
      const continuing = key !== undefined && session.effectsStep?.key === key && session.effectsStep.state === present
      const history = continuing ? { ...session.history, present: next } : commit(session.history, next)
      setStored({ ...session, history, effectsStep: key === undefined ? undefined : { key, state: next }, selection: undefined, textDirty: false })
      invalidateResult()
    },
    [session, invalidateResult],
  )

  const undoEdit = useCallback(() => {
    update((current) => ({ ...current, history: undo(current.history), selection: undefined, textDirty: false }))
    setAnnouncement('Desfeito.')
  }, [update, setAnnouncement])

  const redoEdit = useCallback(() => {
    update((current) => ({ ...current, history: redo(current.history), selection: undefined, textDirty: false }))
    setAnnouncement('Refeito.')
  }, [update, setAnnouncement])

  const plan = useMemo<SavePlan | undefined>(() => (edit ? savePlan(edit, duration) : undefined), [edit, duration])

  /** O que vai para os quadros: os textos com letras que aparecem em alguma parte que fica e a cor, se muda algo. */
  const look = useMemo<VideoLook | undefined>(() => {
    if (!plan || !texts) return undefined
    const ranges = plan.kind === 'trim' ? [plan.range] : plan.kind === 'join' ? plan.ranges : [{ start: 0, end: duration }]
    const kept = textsInRanges(texts, ranges)
    const color = hasColorChange(effects.color) ? effects.color : undefined
    if (kept.length === 0 && !color) return undefined
    return color ? { texts: kept, color } : { texts: kept }
  }, [plan, texts, duration, effects.color])

  /** Há o que salvar além do vídeo como era. */
  const changed = plan !== undefined && (plan.kind !== 'unchanged' || look !== undefined || speed !== 1)

  /** Por que este navegador não consegue salvar a edição atual; `undefined` quando consegue. */
  const saveBlocker = useMemo(() => {
    if (!info || !plan || !changed) return undefined
    const codec = codecLabel(info.codec)
    if (look && !info.canTranscodeVideo) {
      const reason = look.texts.length > 0 ? 'Para salvar com texto' : 'Com filtro ou ajustes'
      return `${reason}, o vídeo é refeito, e este navegador não consegue refazer vídeos ${codec}. Tente no Chrome, no Edge ou no Safari.`
    }
    if (speed !== 1 && !canRemoveParts(info)) {
      return info.canTranscodeVideo
        ? 'Para mudar a velocidade, o som também é refeito, e este navegador não consegue refazer o som deste vídeo. Tente no Chrome, no Edge ou no Safari.'
        : `Para mudar a velocidade, o vídeo é refeito, e este navegador não consegue refazer vídeos ${codec}. Tente no Chrome, no Edge ou no Safari.`
    }
    if (plan.kind === 'join' && !canRemoveParts(info)) {
      return info.canTranscodeVideo
        ? 'Para salvar mais de um pedaço, o som também é refeito, e este navegador não consegue refazer o som deste vídeo. Tente no Chrome, no Edge ou no Safari.'
        : `Para salvar mais de um pedaço, o vídeo é refeito, e este navegador não consegue refazer vídeos ${codec}. Aqui dá para tirar só o final do vídeo.`
    }
    // Um trecho que começa no início é copiado sem refazer; começando no meio, pode precisar refazer.
    if (plan.kind === 'trim' && !look && plan.range.start > TIME_TOLERANCE && !availableTrimModes(info).exact) {
      return `Começar depois do início refaz o vídeo, e este navegador não consegue refazer vídeos ${codec}. Aqui dá para tirar só o final do vídeo.`
    }
    return undefined
  }, [info, plan, look, speed, changed])

  /** Há o que salvar (cortes, textos ou efeitos) e este navegador consegue. */
  const canSave = changed && !saveBlocker

  const apply = useCallback(() => {
    if (!info || !plan || !canSave) return
    const deliver = (output: { blob: Blob }, original: File) => ({ blob: output.blob, name: videoOutputName(original.name, info.format, EDIT_SUFFIX) })
    // Em outra velocidade, o som é sempre refeito: mesmo um trecho só vai pelo juntar.
    if (plan.kind === 'join' || speed !== 1) {
      const ranges = plan.kind === 'join' ? plan.ranges : plan.kind === 'trim' ? [plan.range] : [{ start: 0, end: info.duration }]
      void run((file) => ({ kind: 'join', file, ranges, look, ...(speed !== 1 && { speed }) }), deliver)
      return
    }
    // Sem cortes, só com textos ou cor: o vídeo inteiro, refeito com eles.
    const { start, end } = plan.kind === 'trim' ? plan.range : { start: 0, end: info.duration }
    void run((file) => ({ kind: 'trim', file, start, end, mode: 'exact', look }), deliver)
  }, [info, plan, canSave, look, speed, run])

  const selectedText = texts?.find((text) => text.id === session?.textId)

  return {
    tool,
    edit,
    texts: texts ?? [],
    selectedText,
    look,
    effects,
    changeEffects,
    /** Duração do vídeo salvo: o que fica, na velocidade escolhida. */
    finalDuration: edit ? editedDuration(edit.pieces) / speed : 0,
    canSave,
    addText,
    selectText,
    changeText,
    setTextTime,
    removeText,
    duplicateText,
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
    undo: undoEdit,
    redo: redoEdit,
    apply,
  }
}
