import { Info } from 'lucide-react'
import { IMAGE_FORMATS, OUTPUT_FORMATS } from '../../../core/image/formats'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Slider } from '../../../components/ui/Slider'
import type { BackgroundChoice, ConvertSettings } from './settings'

const BACKGROUND_OPTIONS: ReadonlyArray<{ value: BackgroundChoice; label: string }> = [
  { value: 'white', label: 'Branco' },
  { value: 'black', label: 'Preto' },
]

interface ConvertOptionsProps {
  settings: ConvertSettings
  onChange: (changes: Partial<ConvertSettings>) => void
  /** `undefined` enquanto o navegador ainda está sendo testado. */
  webpSupported: boolean | undefined
  /** Algum arquivo tem transparência: a escolha de fundo passa a importar. */
  hasTransparency: boolean
  disabled?: boolean
}

/** Só as opções que fazem sentido para o formato escolhido. */
export function ConvertOptions({ settings, onChange, webpSupported, hasTransparency, disabled = false }: ConvertOptionsProps) {
  const format = IMAGE_FORMATS[settings.target]
  const formatOptions = OUTPUT_FORMATS.map((value) => ({
    value,
    label: IMAGE_FORMATS[value].label,
    disabled: value === 'webp' && webpSupported === false,
  }))

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <SegmentedControl
          label="Converter para"
          options={formatOptions}
          value={settings.target}
          onChange={(target) => onChange({ target })}
          disabled={disabled}
          mono
        />
        {webpSupported === false && (
          <p className="text-xs text-fg-subtle">Este navegador não consegue gerar WEBP. Escolha JPG ou PNG.</p>
        )}
      </div>

      {format.lossy && (
        <Slider
          label="Qualidade"
          value={settings.quality}
          min={10}
          max={100}
          onChange={(quality) => onChange({ quality })}
          formatValue={(value) => `${value}%`}
          hint="Valores menores geram arquivos menores, com mais perda de detalhes."
          disabled={disabled}
        />
      )}

      {hasTransparency && !format.supportsAlpha && (
        <div className="grid gap-2">
          <SegmentedControl
            label="Fundo das áreas transparentes"
            options={BACKGROUND_OPTIONS}
            value={settings.background}
            onChange={(background) => onChange({ background })}
            disabled={disabled}
          />
          <p className="text-xs text-fg-subtle">JPG não tem transparência.</p>
        </div>
      )}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>A conversão remove metadados, como localização e data da foto.</span>
      </p>
    </div>
  )
}
