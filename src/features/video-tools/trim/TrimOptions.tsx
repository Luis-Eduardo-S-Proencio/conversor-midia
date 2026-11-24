import { CircleAlert } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { VIDEO_FORMATS, codecLabel, type VideoFormat } from '../../../core/video/formats'
import { formatTime } from '../../../core/video/time'
import type { TrimAction, TrimField, TrimFocusRequest, TrimMode } from '../../../core/video/trim'
import { Note } from '../shared/Note'
import { RemovalParts } from './RemovalParts'
import { TimeFields } from '../shared/TimeFields'
import type { TrimEditor, VisibleTrimError } from './useTrimTool'

const ACTION_OPTIONS: ReadonlyArray<{ value: TrimAction; label: string }> = [
  { value: 'keep', label: 'Manter trecho' },
  { value: 'remove', label: 'Remover partes' },
]

const ACTION_DESCRIPTIONS: Record<TrimAction, string> = {
  keep: 'Fica só a parte entre o início e o fim.',
  remove: 'Tira as partes escolhidas e junta o que sobra, como se elas nunca tivessem sido gravadas.',
}

const MODE_DESCRIPTIONS: Record<TrimMode, string> = {
  exact: 'Começa e termina no ponto exato. Pode refazer o vídeo, o que demora mais em vídeos longos.',
  fast: 'Instantâneo e com a qualidade original, mas o vídeo pode começar alguns segundos antes do ponto escolhido.',
}

const HINTS: Record<TrimAction, string> = {
  keep: 'Digite como 1:05,30 ou use os botões abaixo do vídeo.',
  remove: 'Digite como 1:05,30 ou use os botões abaixo do vídeo: eles marcam a parte destacada.',
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-fg">{children}</h3>
}

export interface TrimHandlers {
  onActionChange: (action: TrimAction) => void
  onFieldChange: (field: TrimField, text: string) => void
  onPartFieldChange: (part: number, field: TrimField, text: string) => void
  onPartActivate: (part: number) => void
  onPartAdd: () => void
  onPartRemove: (part: number) => void
  onModeChange: (mode: TrimMode) => void
}

interface TrimOptionsProps extends TrimHandlers {
  editor: TrimEditor
  format: VideoFormat
  codec: string
  canTranscodeVideo: boolean
  extraTracks: boolean
  /** Erro dos campos ou aviso de tentativa, quando já deve aparecer. */
  error?: VisibleTrimError
  focusRequest?: TrimFocusRequest
  disabled?: boolean
}

const inputKey = (part: number | undefined, field: TrimField) => `${part ?? 'trecho'}:${field}`

/**
 * Opções do Cortar trecho, na ordem em que a pessoa decide: o que fazer, quais tempos, como cortar.
 * O resultado (duração final) aparece antes do botão.
 */
export function TrimOptions({ editor, format, codec, canTranscodeVideo, extraTracks, error, focusRequest, disabled = false, ...handlers }: TrimOptionsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const { action, actions, keep, remove, finalDuration } = editor

  // O foco vai ao campo pedido: ao tentar cortar com problema (o leitor de tela lê o aviso junto) ou ao criar uma parte.
  useEffect(() => {
    if (focusRequest) inputs.current.get(inputKey(focusRequest.part, focusRequest.field))?.focus()
  }, [focusRequest])

  if (!action) {
    return (
      <Alert variant="error" title="Corte indisponível neste navegador">
        {`Este navegador não consegue cortar vídeos ${VIDEO_FORMATS[format].label} ${codecLabel(codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Firefox.`}
      </Alert>
    )
  }

  const register = (part: number | undefined, field: TrimField, element: HTMLInputElement | null) => {
    const key = inputKey(part, field)
    if (element) inputs.current.set(key, element)
    else inputs.current.delete(key)
  }
  const actionOptions = ACTION_OPTIONS.map((option) => ({ ...option, disabled: !actions[option.value] }))
  const modeOptions = (['exact', 'fast'] as const).map((value) => ({ value, label: value === 'exact' ? 'Exato' : 'Rápido', disabled: !keep.modes[value] }))
  const removeUnavailable = canTranscodeVideo
    ? 'Para remover partes, o som também é refeito, e este navegador não consegue refazer o som deste vídeo. Use o Chrome, o Edge ou o Safari.'
    : `Para remover partes, o vídeo é refeito, e este navegador não consegue refazer vídeos ${codecLabel(codec)}.`

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <SegmentedControl label="O que fazer" options={actionOptions} value={action} onChange={handlers.onActionChange} disabled={disabled} />
        <p className="text-xs text-fg-muted">{ACTION_DESCRIPTIONS[action]}</p>
        {!actions.remove && <Note>{removeUnavailable}</Note>}
      </div>

      <div className="grid gap-3">
        <SectionTitle>{action === 'keep' ? 'Trecho que fica' : 'Partes a remover'}</SectionTitle>
        {action === 'keep' ? (
          <TimeFields
            values={keep.fields}
            onChange={handlers.onFieldChange}
            invalid={error?.fields ?? []}
            errorId={errorId}
            hintId={hintId}
            inputRef={(field, element) => register(undefined, field, element)}
            disabled={disabled}
          />
        ) : (
          <RemovalParts
            parts={remove.parts}
            active={remove.active}
            invalid={error && { part: error.part, fields: error.fields }}
            errorId={errorId}
            hintId={hintId}
            onFieldChange={handlers.onPartFieldChange}
            onActivate={handlers.onPartActivate}
            onAdd={handlers.onPartAdd}
            onRemove={handlers.onPartRemove}
            inputRef={register}
            disabled={disabled}
          />
        )}
        {error && (
          // Valor errado aparece enquanto a pessoa digita, sem mudar o foco: é anunciado na hora.
          // Os avisos de tentativa levam o foco ao campo, e a descrição dele os lê.
          <p id={errorId} role={error.missing ? undefined : 'alert'} className="flex gap-1.5 text-sm text-danger">
            <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
            <span>{error.message}</span>
          </p>
        )}
        <p id={hintId} className="text-xs text-fg-subtle">
          {HINTS[action]}
        </p>
      </div>

      <dl className="flex items-baseline justify-between gap-3 border-t border-border pt-4 text-sm">
        <dt className="text-fg-muted">Vídeo final</dt>
        <dd className="font-mono tabular-nums text-fg">{finalDuration === null ? '—' : formatTime(finalDuration)}</dd>
      </dl>

      {action === 'keep' && keep.mode ? (
        <div className="grid gap-2">
          <SegmentedControl label="Como cortar" options={modeOptions} value={keep.mode} onChange={handlers.onModeChange} disabled={disabled} />
          <p className="text-xs text-fg-muted">{MODE_DESCRIPTIONS[keep.mode]}</p>
          {!keep.modes.exact && keep.modes.fast && (
            <Note>{`Este navegador não consegue refazer vídeos ${codecLabel(codec)}: só o corte rápido está disponível.`}</Note>
          )}
          {!keep.modes.fast && <Note>Em WEBM, o corte é sempre exato.</Note>}
        </div>
      ) : (
        <Note>Remover partes sempre corta no ponto exato e refaz o vídeo, o que pode demorar em vídeos longos.</Note>
      )}

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
