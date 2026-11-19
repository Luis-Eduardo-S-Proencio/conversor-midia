import { CircleAlert, Info, Maximize } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { Icon } from '../../../components/ui/Icon'
import { Input } from '../../../components/ui/Input'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { formatDimensions } from '../../../core/format'
import { isFullCrop, type CropRect } from '../../../core/image/crop'
import type { ImageFormat } from '../../../core/image/formats'
import type { Dimensions } from '../../../core/image/resize'
import {
  ASPECT_CHOICES,
  CROP_FIELDS,
  aspectLabel,
  type AspectChoice,
  type CropError,
  type CropField,
  type CropFields,
  type FocusRequest,
} from './settings'

const FIELD_LABELS: Record<CropField, string> = {
  x: 'Margem esquerda',
  y: 'Margem superior',
  width: 'Largura',
  height: 'Altura',
}

interface CropOptionsProps {
  /** Medidas da imagem original, já orientada. */
  image: Dimensions
  aspect: AspectChoice
  onAspectChange: (choice: AspectChoice) => void
  fields: CropFields
  onFieldChange: (field: CropField, text: string) => void
  /** Área válida mais recente: dá o tamanho final. */
  crop: CropRect
  onReset: () => void
  /** Erro dos campos ou aviso de tentativa, quando já deve aparecer. */
  error?: CropError
  focusRequest?: FocusRequest
  /** Formatos dos arquivos válidos: a nota sobre WEBP só aparece quando importa. */
  formats: readonly ImageFormat[]
  webpSupported: boolean | undefined
  disabled?: boolean
}

export function CropOptions({
  image,
  aspect,
  onAspectChange,
  fields,
  onFieldChange,
  crop,
  onReset,
  error,
  focusRequest,
  formats,
  webpSupported,
  disabled = false,
}: CropOptionsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef<Record<CropField, HTMLInputElement | null>>({ x: null, y: null, width: null, height: null })

  // O foco vai ao campo a corrigir só quando a pessoa tenta recortar; o leitor de tela lê o aviso junto.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus()
  }, [focusRequest])

  function handleReset() {
    onReset()
    inputs.current.width?.focus() // o botão some em seguida; o foco não se perde
  }

  const aspectOptions = ASPECT_CHOICES.map((value) => ({ value, label: aspectLabel(value, image) }))
  const invalid = (field: CropField) => error?.fields.includes(field) ?? false

  return (
    <div className="grid gap-5">
      <SegmentedControl label="Proporção" options={aspectOptions} value={aspect} onChange={onAspectChange} disabled={disabled} mono />

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {CROP_FIELDS.map((field) => (
            <Field key={field} label={FIELD_LABELS[field]}>
              {(control) => (
                <Input
                  {...control}
                  ref={(element) => {
                    inputs.current[field] = element
                  }}
                  value={fields[field]}
                  onChange={(event) => onFieldChange(field, event.currentTarget.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  unit="px"
                  disabled={disabled}
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
          Arraste a área e os cantos sobre a imagem, use as setas do teclado ou digite as medidas, em pixels da imagem original.
        </p>
      </div>

      <div className="grid gap-2">
        <dl className="flex items-baseline justify-between gap-3 text-sm">
          <dt className="text-fg-muted">Tamanho final</dt>
          <dd className="font-mono tabular-nums text-fg">{formatDimensions(crop.width, crop.height)}</dd>
        </dl>
        {!isFullCrop(crop, image) && (
          <Button variant="ghost" block icon={Maximize} onClick={handleReset} disabled={disabled}>
            Usar a imagem inteira
          </Button>
        )}
      </div>

      {webpSupported === false && formats.includes('webp') && (
        <p className="text-xs text-fg-subtle">Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.</p>
      )}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>O recorte remove metadados, como localização e data da foto.</span>
      </p>
    </div>
  )
}
