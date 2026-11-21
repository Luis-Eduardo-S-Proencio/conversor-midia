import { CircleAlert, Info } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Field } from '../../../components/ui/Field'
import { Icon } from '../../../components/ui/Icon'
import { Input } from '../../../components/ui/Input'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { VIDEO_FORMATS, codecLabel, type VideoFormat } from '../../../core/video/formats'
import { formatTime } from '../../../core/video/time'
import { TRIM_FIELDS, type TrimError, type TrimField, type TrimFocusRequest, type TrimMode } from '../../../core/video/trim'
import type { TrimEditor } from './useTrimTool'

const FIELD_LABELS: Record<TrimField, string> = { start: 'Início', end: 'Fim' }

const MODE_DESCRIPTIONS: Record<TrimMode, string> = {
  exact:
    'Corta exatamente nos tempos escolhidos. O vídeo costuma ser recodificado, em alta qualidade, o que demora mais em vídeos longos.',
  fast:
    'Não recodifica: é quase instantâneo e mantém a qualidade original. Alguns segundos antes do início ficam guardados no arquivo, escondidos; alguns aplicativos podem mostrá-los.',
}

interface TrimOptionsProps {
  editor: TrimEditor
  format: VideoFormat
  codec: string
  extraTracks: boolean
  onFieldChange: (field: TrimField, text: string) => void
  onModeChange: (mode: TrimMode) => void
  /** Erro dos campos ou aviso de tentativa, quando já deve aparecer. */
  error?: TrimError
  focusRequest?: TrimFocusRequest
  disabled?: boolean
}

function Note({ children }: { children: string }) {
  return (
    <p className="flex gap-2 text-xs text-fg-subtle">
      <Icon icon={Info} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  )
}

export function TrimOptions({ editor, format, codec, extraTracks, onFieldChange, onModeChange, error, focusRequest, disabled = false }: TrimOptionsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef<Record<TrimField, HTMLInputElement | null>>({ start: null, end: null })
  const { fields, validation, modes, mode } = editor

  // O foco vai ao campo a corrigir só quando a pessoa tenta cortar; o leitor de tela lê o aviso junto.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus()
  }, [focusRequest])

  if (!mode) {
    return (
      <Alert variant="error" title="Corte indisponível neste navegador">
        {`Este navegador não consegue cortar vídeos ${VIDEO_FORMATS[format].label} ${codecLabel(codec)}. Tente em outro navegador, como o Chrome, o Edge ou o Firefox.`}
      </Alert>
    )
  }

  const invalid = (field: TrimField) => error?.fields.includes(field) ?? false
  const modeOptions = (['exact', 'fast'] as const).map((value) => ({
    value,
    label: value === 'exact' ? 'Exato' : 'Rápido',
    disabled: !modes[value],
  }))

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {TRIM_FIELDS.map((field) => (
            <Field key={field} label={FIELD_LABELS[field]}>
              {(control) => (
                <Input
                  {...control}
                  ref={(element) => {
                    inputs.current[field] = element
                  }}
                  value={fields[field]}
                  onChange={(event) => onFieldChange(field, event.currentTarget.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  className="font-mono"
                  aria-invalid={invalid(field) || undefined}
                  aria-describedby={invalid(field) ? `${errorId} ${hintId}` : hintId}
                />
              )}
            </Field>
          ))}
        </div>
        {error && (
          // Valor errado aparece enquanto a pessoa digita, sem mudar o foco: é anunciado na hora.
          // Os avisos de tentativa levam o foco ao campo, e a descrição dele os lê.
          <p id={errorId} role={error.missing ? undefined : 'alert'} className="flex gap-1.5 text-sm text-danger">
            <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
            <span>{error.message}</span>
          </p>
        )}
        <p id={hintId} className="text-xs text-fg-subtle">
          Em minutos e segundos, como 1:05,30. Ou marque no vídeo, com os botões abaixo dele.
        </p>
      </div>

      <dl className="flex items-baseline justify-between gap-3 text-sm">
        <dt className="text-fg-muted">Duração do trecho</dt>
        <dd className="font-mono tabular-nums text-fg">{validation.ok ? formatTime(validation.range.end - validation.range.start) : '—'}</dd>
      </dl>

      <div className="grid gap-2">
        <SegmentedControl label="Modo" options={modeOptions} value={mode} onChange={onModeChange} disabled={disabled} />
        <p className="text-xs text-fg-muted">{MODE_DESCRIPTIONS[mode]}</p>
        {!modes.exact && modes.fast && (
          <Note>{`Este navegador não consegue recodificar vídeos ${codecLabel(codec)}: só o corte rápido está disponível.`}</Note>
        )}
        {!modes.fast && <Note>Em WEBM, o corte é sempre exato.</Note>}
      </div>

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
      <Note>O vídeo sai sem metadados, como localização e data da gravação.</Note>
    </div>
  )
}
