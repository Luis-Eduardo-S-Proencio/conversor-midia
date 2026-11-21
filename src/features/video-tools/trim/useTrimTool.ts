import { useCallback, useMemo, useRef, useState } from 'react'
import { videoOutputName } from '../../../core/video/output-name'
import { MAX_REMOVED_PARTS, previewKept, totalDuration, validateRemovals, type RemovalPart, type RemovalValidation } from '../../../core/video/remove'
import { formatTime } from '../../../core/video/time'
import {
  NOTHING_TRIMMED,
  availableTrimModes,
  canRemoveParts,
  fieldsOfRange,
  isWholeVideo,
  resolveTrimMode,
  validateTrim,
  wholeRange,
  type TrimAction,
  type TrimError,
  type TrimField,
  type TrimFields,
  type TrimFocusRequest,
  type TrimMode,
  type TrimRange,
  type TrimValidation,
} from '../../../core/video/trim'
import { useVideoTool } from '../shared/useVideoTool'
import { REMOVE_SUFFIX, TRIM_LABELS, TRIM_SUFFIX } from './settings'

export interface TrimEditor {
  duration: number
  /** O que dá para fazer com este vídeo neste navegador. */
  actions: Record<TrimAction, boolean>
  /** O que será feito; `null` quando este navegador não consegue cortar este vídeo. */
  action: TrimAction | null
  keep: {
    fields: TrimFields
    validation: TrimValidation
    modes: Record<TrimMode, boolean>
    /** Modo que será usado; `null` sem nenhum disponível. */
    mode: TrimMode | null
  }
  remove: {
    parts: RemovalPart[]
    /** A parte que os botões do player marcam. */
    active: number
    validation: RemovalValidation
  }
  /** O que fica do vídeo, para a linha do tempo e para "Ver como fica" (só o que já está certo). */
  kept: TrimRange[]
  /** Duração do resultado; `null` enquanto algum campo estiver errado ou vazio. */
  finalDuration: number | null
}

/** Erro visível; ao remover partes, `part` é o `id` da parte com problema. */
export type VisibleTrimError = TrimError & { part?: number }

const FIELD_TITLES: Record<TrimField, string> = { start: 'Início', end: 'Fim' }

const emptyPart = (id: number): RemovalPart => ({ id, start: '', end: '' })

/** A lista de partes começa com uma, vazia; as acrescentadas recebem números a partir de 1. */
const FIRST_PART = 0

function resolveAction(preferred: TrimAction, actions: Record<TrimAction, boolean>): TrimAction | null {
  if (actions[preferred]) return preferred
  if (actions.keep) return 'keep'
  return actions.remove ? 'remove' : null
}

/** Valor errado aparece já ao digitar; campo vazio e "nada cortado", só depois de tentar. */
function visibleError(editor: TrimEditor, attempted: boolean): VisibleTrimError | undefined {
  if (editor.action === 'remove') {
    const { validation, parts } = editor.remove
    if (validation.ok || (validation.error.missing && !attempted)) return undefined
    return { ...validation.error, part: parts[validation.error.part]?.id }
  }
  const { validation } = editor.keep
  if (!validation.ok) return attempted || !validation.error.missing ? validation.error : undefined
  if (attempted && isWholeVideo(validation.range, editor.duration)) return { message: NOTHING_TRIMMED, fields: ['start'], missing: true }
  return undefined
}

/**
 * Cortar trecho: um vídeo por vez. Manter um trecho (início e fim) ou remover partes e juntar o resto;
 * os tempos são digitados ou marcados no player.
 */
export function useTrimTool() {
  const tool = useVideoTool(TRIM_LABELS)
  const { info, fileId, file } = tool.state
  const { invalidateResult, setAnnouncement, run } = tool
  const [keepEdit, setKeepEdit] = useState<{ fileId: number; fields: TrimFields }>()
  const [removal, setRemoval] = useState<{ fileId: number; parts: RemovalPart[]; active: number }>()
  const [preferredAction, setPreferredAction] = useState<TrimAction>('keep')
  const [preferredMode, setPreferredMode] = useState<TrimMode>('exact')
  // Tentativa de cortar com problema e pedido de foco valem só para o vídeo atual.
  const [attemptedFile, setAttemptedFile] = useState<number>()
  const [focus, setFocus] = useState<{ fileId: number; request: TrimFocusRequest }>()
  const lastPartId = useRef(FIRST_PART)

  const editor = useMemo<TrimEditor | undefined>(() => {
    if (!info) return undefined
    const { duration } = info
    // Vídeo novo (ou trocado): o trecho recomeça como o vídeo inteiro, e a lista de partes, com uma vazia.
    const keepFields = keepEdit?.fileId === fileId ? keepEdit.fields : fieldsOfRange(wholeRange(duration))
    const current = removal?.fileId === fileId ? removal : { parts: [emptyPart(FIRST_PART)], active: FIRST_PART }
    const modes = availableTrimModes(info)
    const mode = resolveTrimMode(preferredMode, modes)
    const actions = { keep: mode !== null, remove: canRemoveParts(info) }
    const action = resolveAction(preferredAction, actions)
    const keepValidation = validateTrim(keepFields, duration)
    const removeValidation = validateRemovals(current.parts, duration)

    const kept = action === 'remove' ? previewKept(current.parts, duration) : keepValidation.ok ? [keepValidation.range] : []
    const finalDuration =
      action === 'remove'
        ? removeValidation.ok
          ? totalDuration(removeValidation.kept)
          : null
        : keepValidation.ok
          ? keepValidation.range.end - keepValidation.range.start
          : null
    return {
      duration,
      actions,
      action,
      keep: { fields: keepFields, validation: keepValidation, modes, mode },
      remove: { parts: current.parts, active: current.active, validation: removeValidation },
      kept,
      finalDuration,
    }
  }, [info, fileId, keepEdit, removal, preferredAction, preferredMode])

  /** Qualquer mudança nas escolhas descarta o resultado anterior e o aviso de tentativa. */
  const touched = useCallback(() => {
    setAttemptedFile(undefined)
    invalidateResult()
  }, [invalidateResult])

  const updateKeep = useCallback(
    (fields: TrimFields) => {
      setKeepEdit({ fileId, fields })
      touched()
    },
    [fileId, touched],
  )

  const updateParts = useCallback(
    (parts: RemovalPart[], active: number) => {
      setRemoval({ fileId, parts, active })
      touched()
    },
    [fileId, touched],
  )

  const changeField = useCallback(
    (field: TrimField, text: string) => {
      if (editor) updateKeep({ ...editor.keep.fields, [field]: text })
    },
    [editor, updateKeep],
  )

  const changePartField = useCallback(
    (part: number, field: TrimField, text: string) => {
      if (!editor) return
      const parts = editor.remove.parts.map((item) => (item.id === part ? { ...item, [field]: text } : item))
      updateParts(parts, part)
    },
    [editor, updateParts],
  )

  /** A parte em que a pessoa entrou passa a ser a que os botões do player marcam. */
  const activatePart = useCallback(
    (part: number) => {
      if (!editor || editor.remove.active === part) return
      setRemoval({ fileId, parts: editor.remove.parts, active: part })
    },
    [editor, fileId],
  )

  const addPart = useCallback(() => {
    if (!editor || editor.remove.parts.length >= MAX_REMOVED_PARTS) return
    lastPartId.current += 1
    const id = lastPartId.current
    updateParts([...editor.remove.parts, emptyPart(id)], id)
    setFocus({ fileId, request: { part: id, field: 'start' } })
  }, [editor, fileId, updateParts])

  const removePart = useCallback(
    (part: number) => {
      if (!editor || editor.remove.parts.length <= 1) return
      const index = editor.remove.parts.findIndex((item) => item.id === part)
      const parts = editor.remove.parts.filter((item) => item.id !== part)
      // O botão some com a parte: o foco vai para a parte de antes (ou a nova primeira).
      const neighbor = parts[Math.max(0, index - 1)] ?? parts[0]
      if (!neighbor) return
      updateParts(parts, neighbor.id)
      setFocus({ fileId, request: { part: neighbor.id, field: 'start' } })
    },
    [editor, fileId, updateParts],
  )

  /** "Marcar início aqui" e "Marcar fim aqui": o tempo atual do player vai para o trecho ou para a parte ativa. */
  const markField = useCallback(
    (field: TrimField, time: number) => {
      if (!editor?.action) return
      const text = formatTime(Math.min(Math.max(0, time), editor.duration))
      if (editor.action === 'keep') {
        updateKeep({ ...editor.keep.fields, [field]: text })
        setAnnouncement(`${FIELD_TITLES[field]} marcado em ${text}.`)
        return
      }
      const { parts, active } = editor.remove
      const number = parts.findIndex((item) => item.id === active) + 1
      updateParts(
        parts.map((item) => (item.id === active ? { ...item, [field]: text } : item)),
        active,
      )
      setAnnouncement(`${FIELD_TITLES[field]} da parte ${number} marcado em ${text}.`)
    },
    [editor, updateKeep, updateParts, setAnnouncement],
  )

  const changeAction = useCallback(
    (action: TrimAction) => {
      setPreferredAction(action)
      touched()
    },
    [touched],
  )

  const changeMode = useCallback(
    (mode: TrimMode) => {
      setPreferredMode(mode)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!editor?.action || !info || !file) return
    const fail = (request: TrimFocusRequest) => {
      setAttemptedFile(fileId)
      setFocus({ fileId, request })
    }

    if (editor.action === 'keep') {
      const { validation, mode } = editor.keep
      if (!mode) return
      if (!validation.ok || isWholeVideo(validation.range, editor.duration)) {
        fail({ field: validation.ok ? 'start' : (validation.error.fields[0] ?? 'start') })
        return
      }
      const { start, end } = validation.range
      void run((chosen) => ({ kind: 'trim', file: chosen, start, end, mode }), videoOutputName(file.name, info.format, TRIM_SUFFIX))
      return
    }

    const { validation, parts } = editor.remove
    if (!validation.ok) {
      fail({ part: parts[validation.error.part]?.id, field: validation.error.fields[0] ?? 'start' })
      return
    }
    const { kept } = validation
    const name = videoOutputName(file.name, info.format, REMOVE_SUFFIX)
    const [only] = kept
    // Sobrou um pedaço só (a parte tirada era do começo ou do fim): é um corte comum, que pode copiar.
    if (kept.length === 1 && only) {
      void run((chosen) => ({ kind: 'trim', file: chosen, start: only.start, end: only.end, mode: 'exact' }), name)
      return
    }
    void run((chosen) => ({ kind: 'join', file: chosen, ranges: kept }), name)
  }, [editor, info, file, fileId, run])

  const attempted = attemptedFile === fileId
  const error = editor ? visibleError(editor, attempted) : undefined
  const focusRequest = focus?.fileId === fileId ? focus.request : undefined
  return {
    tool,
    editor,
    error,
    focusRequest,
    changeAction,
    changeField,
    changePartField,
    activatePart,
    addPart,
    removePart,
    markField,
    changeMode,
    apply,
  }
}
