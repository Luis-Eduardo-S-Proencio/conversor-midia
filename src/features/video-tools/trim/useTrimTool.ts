import { useCallback, useMemo, useState } from 'react'
import { videoOutputName } from '../../../core/video/output-name'
import { formatTime } from '../../../core/video/time'
import {
  NOTHING_TRIMMED,
  availableTrimModes,
  fieldsOfRange,
  isWholeVideo,
  resolveTrimMode,
  validateTrim,
  wholeRange,
  type TrimError,
  type TrimField,
  type TrimFields,
  type TrimFocusRequest,
  type TrimMode,
  type TrimValidation,
} from '../../../core/video/trim'
import { useVideoTool } from '../shared/useVideoTool'
import { TRIM_LABELS, TRIM_SUFFIX } from './settings'

export interface TrimEditor {
  duration: number
  fields: TrimFields
  validation: TrimValidation
  modes: Record<TrimMode, boolean>
  /** Modo que será usado; `null` quando este navegador não consegue cortar este vídeo. */
  mode: TrimMode | null
}

/** Tentativa de cortar com problema: o aviso aparece e o foco vai ao campo. Vale só para o vídeo atual. */
interface Attempt {
  fileId: number
  focus: TrimFocusRequest
}

const FIELD_TITLES: Record<TrimField, string> = { start: 'Início', end: 'Fim' }

/** Valor errado aparece já ao digitar; campo vazio e "nada cortado", só depois de tentar. */
function visibleError({ validation, duration }: TrimEditor, attempted: boolean): TrimError | undefined {
  if (!validation.ok) return attempted || !validation.error.missing ? validation.error : undefined
  if (attempted && isWholeVideo(validation.range, duration)) return { message: NOTHING_TRIMMED, fields: ['start'], missing: true }
  return undefined
}

/** Cortar trecho: um vídeo por vez; início e fim digitados ou marcados no player. */
export function useTrimTool() {
  const tool = useVideoTool(TRIM_LABELS)
  const { info, fileId, file } = tool.state
  const { invalidateResult, setAnnouncement, run } = tool
  const [edit, setEdit] = useState<{ fileId: number; fields: TrimFields }>()
  const [preferredMode, setPreferredMode] = useState<TrimMode>('exact')
  const [attempt, setAttempt] = useState<Attempt>()

  const editor = useMemo<TrimEditor | undefined>(() => {
    if (!info) return undefined
    // Vídeo novo (ou trocado): o trecho recomeça como o vídeo inteiro.
    const fields = edit?.fileId === fileId ? edit.fields : fieldsOfRange(wholeRange(info.duration))
    const modes = availableTrimModes(info)
    return { duration: info.duration, fields, validation: validateTrim(fields, info.duration), modes, mode: resolveTrimMode(preferredMode, modes) }
  }, [info, fileId, edit, preferredMode])

  const update = useCallback(
    (fields: TrimFields) => {
      setEdit({ fileId, fields })
      setAttempt(undefined)
      invalidateResult()
    },
    [fileId, invalidateResult],
  )

  const changeField = useCallback(
    (field: TrimField, text: string) => {
      if (editor) update({ ...editor.fields, [field]: text })
    },
    [editor, update],
  )

  /** "Marcar início aqui" e "Marcar fim aqui": o tempo atual do player vira o valor do campo. */
  const markField = useCallback(
    (field: TrimField, time: number) => {
      if (!editor) return
      const text = formatTime(Math.min(Math.max(0, time), editor.duration))
      update({ ...editor.fields, [field]: text })
      setAnnouncement(`${FIELD_TITLES[field]} marcado em ${text}.`)
    },
    [editor, update, setAnnouncement],
  )

  const changeMode = useCallback(
    (mode: TrimMode) => {
      setPreferredMode(mode)
      invalidateResult()
    },
    [invalidateResult],
  )

  const apply = useCallback(() => {
    if (!editor?.mode || !info || !file) return
    const { validation, mode } = editor
    if (!validation.ok || isWholeVideo(validation.range, editor.duration)) {
      setAttempt({ fileId, focus: { field: validation.ok ? 'start' : (validation.error.fields[0] ?? 'start') } })
      return
    }
    const { start, end } = validation.range
    void run((chosen) => ({ kind: 'trim', file: chosen, start, end, mode }), videoOutputName(file.name, info.format, TRIM_SUFFIX))
  }, [editor, info, file, fileId, run])

  const current = attempt?.fileId === fileId ? attempt : undefined
  const error = editor ? visibleError(editor, current !== undefined) : undefined
  return { tool, editor, error, focusRequest: current?.focus, changeField, markField, changeMode, apply }
}
