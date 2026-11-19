import { CircleAlert, Info, Lock, LockOpen } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { IconButton } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { Icon } from '../../../components/ui/Icon'
import { Input } from '../../../components/ui/Input'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Slider } from '../../../components/ui/Slider'
import { formatDimensions } from '../../../core/format'
import type { ImageFormat } from '../../../core/image/formats'
import type { Dimensions } from '../../../core/image/resize'
import { digitsOnly } from '../shared/number-input'
import { PERCENT_RANGE, type FocusRequest, type ResizeError, type ResizeMode, type ResizeSettings, type SizeField } from './settings'

const MODE_OPTIONS: ReadonlyArray<{ value: ResizeMode; label: string }> = [
  { value: 'percent', label: 'Porcentagem' },
  { value: 'pixels', label: 'Pixels' },
]

const FIELD_LABELS: Record<SizeField, string> = { width: 'Largura', height: 'Altura' }

type ChangeSettings = (changes: Partial<ResizeSettings>) => void

interface PixelFieldsProps {
  settings: ResizeSettings
  onChange: ChangeSettings
  error?: ResizeError
  focusRequest?: FocusRequest
  disabled: boolean
}

/** Largura, cadeado e altura numa linha; erro e explicação logo abaixo, ligados aos campos. */
function PixelFields({ settings, onChange, error, focusRequest, disabled }: PixelFieldsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef<Record<SizeField, HTMLInputElement | null>>({ width: null, height: null })

  // O foco vai ao campo a corrigir só quando a pessoa tenta redimensionar, nunca enquanto digita.
  // O leitor de tela lê o erro junto, pela descrição do campo.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus()
  }, [focusRequest])

  const invalid = (field: SizeField) => error?.fields.includes(field) ?? false
  const change = (field: SizeField, text: string) => onChange(field === 'width' ? { width: digitsOnly(text) } : { height: digitsOnly(text) })

  const sizeField = (field: SizeField) => (
    <Field label={FIELD_LABELS[field]}>
      {(control) => (
        <Input
          {...control}
          ref={(element) => {
            inputs.current[field] = element
          }}
          value={settings[field]}
          onChange={(event) => change(field, event.currentTarget.value)}
          inputMode="numeric"
          autoComplete="off"
          unit="px"
          disabled={disabled}
          aria-invalid={invalid(field) || undefined}
          aria-describedby={invalid(field) ? `${errorId} ${hintId}` : hintId}
        />
      )}
    </Field>
  )

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        {sizeField('width')}
        <IconButton
          icon={settings.keepRatio ? Lock : LockOpen}
          label="Manter proporção"
          variant="secondary"
          aria-pressed={settings.keepRatio}
          onClick={() => onChange({ keepRatio: !settings.keepRatio })}
          disabled={disabled}
        />
        {sizeField('height')}
      </div>
      {error && (
        // Valor errado aparece enquanto a pessoa digita, sem mudar o foco: é anunciado na hora.
        // Campo vazio só aparece ao tentar redimensionar, quando o foco vai ao campo e a descrição dele o lê.
        <p id={errorId} role={error.missing ? undefined : 'alert'} className="flex gap-1.5 text-sm text-danger">
          <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
          <span>{error.message}</span>
        </p>
      )}
      <p id={hintId} className="text-xs text-fg-subtle">
        {settings.keepRatio
          ? 'A imagem cabe nessas medidas sem deformar. Basta preencher uma.'
          : 'A imagem fica exatamente com essas medidas e pode deformar.'}
      </p>
    </div>
  )
}

function FinalSize({ from, to }: { from: Dimensions; to: Dimensions }) {
  const unchanged = from.width === to.width && from.height === to.height
  return (
    <div className="grid gap-1">
      <dl className="flex items-baseline justify-between gap-3 text-sm">
        <dt className="text-fg-muted">Tamanho final</dt>
        <dd className="font-mono tabular-nums text-fg">{formatDimensions(to.width, to.height)}</dd>
      </dl>
      {unchanged && <p className="text-xs text-fg-subtle">Já cabe no tamanho pedido: a imagem fica como está.</p>}
    </div>
  )
}

interface ResizeOptionsProps {
  settings: ResizeSettings
  onChange: ChangeSettings
  /** Erro dos campos de pixels, quando já deve aparecer. */
  error?: ResizeError
  focusRequest?: FocusRequest
  /** Medidas antes e depois, quando há uma imagem só. */
  outcome?: { from: Dimensions; to: Dimensions }
  /** Formatos dos arquivos válidos: a nota sobre WEBP só aparece quando importa. */
  formats: readonly ImageFormat[]
  webpSupported: boolean | undefined
  disabled?: boolean
}

export function ResizeOptions({ settings, onChange, error, focusRequest, outcome, formats, webpSupported, disabled = false }: ResizeOptionsProps) {
  return (
    <div className="grid gap-5">
      <SegmentedControl
        label="Redimensionar por"
        options={MODE_OPTIONS}
        value={settings.mode}
        onChange={(mode) => onChange({ mode })}
        disabled={disabled}
      />

      {settings.mode === 'percent' ? (
        <Slider
          label="Novo tamanho"
          value={settings.percent}
          min={PERCENT_RANGE.min}
          max={PERCENT_RANGE.max}
          step={PERCENT_RANGE.step}
          onChange={(percent) => onChange({ percent })}
          formatValue={(value) => `${value}%`}
          hint="Porcentagem da largura e da altura originais."
          disabled={disabled}
        />
      ) : (
        <PixelFields settings={settings} onChange={onChange} error={error} focusRequest={focusRequest} disabled={disabled} />
      )}

      {outcome && <FinalSize from={outcome.from} to={outcome.to} />}

      {webpSupported === false && formats.includes('webp') && (
        <p className="text-xs text-fg-subtle">Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.</p>
      )}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>
          O redimensionamento remove metadados, como localização e data da foto. Com a proporção mantida, nenhuma imagem é
          ampliada: a que já cabe fica como está.
        </span>
      </p>
    </div>
  )
}
