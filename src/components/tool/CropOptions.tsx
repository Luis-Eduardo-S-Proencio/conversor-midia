import { CircleAlert, Info, Maximize } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import {
  ASPECT_CHOICES,
  CROP_FIELDS,
  aspectLabel,
  type AspectChoice,
  type CropError,
  type CropField,
  type CropFields,
  type CropSubject,
  type FocusRequest,
} from '../../core/crop-fields'
import { formatDimensions } from '../../core/format'
import { isFullCrop, type CropRect } from '../../core/image/crop'
import type { Dimensions } from '../../core/image/resize'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { SegmentedControl } from '../ui/SegmentedControl'

const FIELD_LABELS: Record<CropField, string> = {
  x: 'Margem esquerda',
  y: 'Margem superior',
  width: 'Largura',
  height: 'Altura',
}

/** Textos que mudam entre recortar imagem e recortar vídeo. */
const SUBJECT_TEXT: Record<CropSubject, { hint: string; reset: string; metadata: string }> = {
  image: {
    hint: 'Arraste a área e os cantos sobre a imagem, use as setas do teclado ou digite as medidas, em pixels da imagem original.',
    reset: 'Usar a imagem inteira',
    metadata: 'O recorte remove metadados, como localização e data da foto.',
  },
  video: {
    hint: 'Arraste a área e os cantos sobre o vídeo, use as setas do teclado ou digite as medidas, em pixels do vídeo original.',
    reset: 'Usar o vídeo inteiro',
    metadata: 'O vídeo sai sem metadados, como localização e data da gravação.',
  },
}

interface CropOptionsProps {
  /** O que está sendo recortado: muda os textos. */
  subject: CropSubject
  /** Medidas do quadro original, já orientado. */
  size: Dimensions
  aspect: AspectChoice
  onAspectChange: (choice: AspectChoice) => void
  fields: CropFields
  onFieldChange: (field: CropField, text: string) => void
  /** Área válida mais recente: dá o tamanho final. */
  crop: CropRect
  /** Medidas do resultado, quando diferem das da área (vídeo: largura e altura pares). */
  finalSize?: Dimensions
  onReset: () => void
  /** Erro dos campos ou aviso de tentativa, quando já deve aparecer. */
  error?: CropError
  focusRequest?: FocusRequest
  /** Observações da ferramenta, antes da nota sobre metadados (ex.: formato de saída no Safari). */
  notes?: ReactNode
  disabled?: boolean
}

export function CropOptions({
  subject,
  size,
  aspect,
  onAspectChange,
  fields,
  onFieldChange,
  crop,
  finalSize = crop,
  onReset,
  error,
  focusRequest,
  notes,
  disabled = false,
}: CropOptionsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef<Record<CropField, HTMLInputElement | null>>({ x: null, y: null, width: null, height: null })
  const text = SUBJECT_TEXT[subject]

  // O foco vai ao campo a corrigir só quando a pessoa tenta recortar; o leitor de tela lê o aviso junto.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus()
  }, [focusRequest])

  function handleReset() {
    onReset()
    inputs.current.width?.focus() // o botão some em seguida; o foco não se perde
  }

  const aspectOptions = ASPECT_CHOICES.map((value) => ({ value, label: aspectLabel(value, size) }))
  const invalid = (field: CropField) => error?.fields.includes(field) ?? false

  return (
    <div className="grid gap-5">
      <SegmentedControl label="Proporção" options={aspectOptions} value={aspect} onChange={onAspectChange} disabled={disabled} />

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
          {text.hint}
        </p>
      </div>

      <div className="grid gap-2">
        <dl className="flex items-baseline justify-between gap-3 text-sm">
          <dt className="text-fg-muted">Tamanho final</dt>
          <dd className="tabular-nums text-fg">{formatDimensions(finalSize.width, finalSize.height)}</dd>
        </dl>
        {!isFullCrop(crop, size) && (
          <Button variant="ghost" block icon={Maximize} onClick={handleReset} disabled={disabled}>
            {text.reset}
          </Button>
        )}
      </div>

      {notes}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>{text.metadata}</span>
      </p>
    </div>
  )
}
