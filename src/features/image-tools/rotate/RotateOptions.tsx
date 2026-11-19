import {
  CircleAlert,
  Info,
  RotateCcw,
  RotateCw,
  TrianglesCenterlineDashedHorizontal,
  TrianglesCenterlineDashedVertical,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, type RefObject } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import type { ImageFormat } from '../../../core/image/formats'
import { describeOrientation, isUpright, type Orientation, type OrientationStep } from '../../../core/image/orientation'

interface StepButton {
  step: OrientationStep
  /** Nome acessível: a operação inteira. O texto visível, curto, está contido nele (WCAG 2.5.3). */
  label: string
  short: string
  icon: LucideIcon
}

const ROTATE_BUTTONS: readonly StepButton[] = [
  { step: 'rotate-left', label: 'Girar à esquerda', short: 'Esquerda', icon: RotateCcw },
  { step: 'rotate-right', label: 'Girar à direita', short: 'Direita', icon: RotateCw },
]

// Nos ícones, a linha tracejada é o eixo do espelho: vertical para espelhar na horizontal.
const FLIP_BUTTONS: readonly StepButton[] = [
  { step: 'flip-horizontal', label: 'Espelhar na horizontal', short: 'Horizontal', icon: TrianglesCenterlineDashedVertical },
  { step: 'flip-vertical', label: 'Espelhar na vertical', short: 'Vertical', icon: TrianglesCenterlineDashedHorizontal },
]

interface StepGroupProps {
  title: string
  buttons: readonly StepButton[]
  onStep: (step: OrientationStep) => void
  describedBy?: string
  disabled: boolean
  /** Recebe o primeiro botão do grupo (destino do foco depois de um erro ou de desfazer). */
  firstRef?: RefObject<HTMLButtonElement | null>
}

function StepGroup({ title, buttons, onStep, describedBy, disabled, firstRef }: StepGroupProps) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className="grid gap-2">
      <span id={titleId} className="text-sm font-medium text-fg">
        {title}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map((button, index) => (
          <Button
            key={button.step}
            ref={index === 0 ? firstRef : undefined}
            icon={button.icon}
            aria-label={button.label}
            aria-describedby={describedBy}
            onClick={() => onStep(button.step)}
            disabled={disabled}
          >
            {button.short}
          </Button>
        ))}
      </div>
    </div>
  )
}

interface RotateOptionsProps {
  orientation: Orientation
  onStep: (step: OrientationStep) => void
  onReset: () => void
  /** Aviso de que nada foi escolhido, depois de tentar ajustar. */
  error?: string
  /** Um objeto novo a cada tentativa sem nada escolhido: leva o foco ao primeiro botão. */
  focusRequest?: object
  /** Formatos dos arquivos válidos: a nota sobre WEBP só aparece quando importa. */
  formats: readonly ImageFormat[]
  webpSupported: boolean | undefined
  disabled?: boolean
}

export function RotateOptions({ orientation, onStep, onReset, error, focusRequest, formats, webpSupported, disabled = false }: RotateOptionsProps) {
  const errorId = useId()
  const firstButton = useRef<HTMLButtonElement>(null)
  const upright = isUpright(orientation)

  // O foco vai aos botões só quando a pessoa tenta ajustar sem escolher nada; o botão lê o aviso junto.
  useEffect(() => {
    if (focusRequest) firstButton.current?.focus()
  }, [focusRequest])

  function handleReset() {
    onReset()
    firstButton.current?.focus() // "Desfazer tudo" some em seguida; o foco não se perde
  }

  const describedBy = error ? errorId : undefined

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <StepGroup title="Girar" buttons={ROTATE_BUTTONS} onStep={onStep} describedBy={describedBy} disabled={disabled} firstRef={firstButton} />
        <StepGroup title="Espelhar" buttons={FLIP_BUTTONS} onStep={onStep} describedBy={describedBy} disabled={disabled} />
        {error && (
          <p id={errorId} className="flex gap-1.5 text-sm text-danger">
            <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>

      <div className="grid gap-2">
        {/* A prévia gira só na tela: quem usa leitor de tela ouve o resultado de cada clique. */}
        <p aria-live="polite" className="text-sm text-fg-muted">
          {upright ? 'Escolha como girar ou espelhar.' : `${describeOrientation(orientation)}.`}
        </p>
        {!upright && (
          <Button variant="ghost" block icon={Undo2} onClick={handleReset} disabled={disabled}>
            Desfazer tudo
          </Button>
        )}
      </div>

      {webpSupported === false && formats.includes('webp') && (
        <p className="text-xs text-fg-subtle">Neste navegador, WEBP sai em JPG, ou em PNG se tiver transparência.</p>
      )}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>Girar e espelhar remove metadados, como localização e data da foto.</span>
      </p>
    </div>
  )
}
