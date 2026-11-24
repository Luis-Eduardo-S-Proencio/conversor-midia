import { Info } from 'lucide-react'
import { OUTPUT_FORMATS, OUTPUT_FORMAT_INFO, type OutputFormat } from '../../../core/image/formats'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Slider } from '../../../components/ui/Slider'
import type { BackgroundChoice, ConvertSettings } from './settings'

const BACKGROUND_OPTIONS: ReadonlyArray<{ value: BackgroundChoice; label: string }> = [
  { value: 'white', label: 'Branco' },
  { value: 'black', label: 'Preto' },
]

/** O que muda em cada formato além de "outro tipo de arquivo". */
const FORMAT_NOTES: Partial<Record<OutputFormat, string>> = {
  bmp: 'BMP não tem compressão: o arquivo fica bem maior.',
  tiff: 'TIFF sem compressão: não perde qualidade, mas o arquivo fica bem maior.',
  ico: 'Ícone com tamanhos de 16 a 256 px, para favicon e atalhos. Imagens não quadradas ganham margens transparentes.',
  pdf: 'Cada imagem vira um PDF de uma página, do tamanho da imagem.',
}

const noTransparencyNote = (target: OutputFormat) =>
  target === 'pdf' ? 'No PDF, a imagem vai em JPG, sem transparência.' : `${OUTPUT_FORMAT_INFO[target].label} não tem transparência.`

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
  const format = OUTPUT_FORMAT_INFO[settings.target]
  const note = FORMAT_NOTES[settings.target]
  const formatOptions = OUTPUT_FORMATS.map((value) => ({
    value,
    label: OUTPUT_FORMAT_INFO[value].label,
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
          columns={4}
          mono
        />
        {webpSupported === false && (
          <p className="text-xs text-fg-subtle">Este navegador não consegue gerar WEBP. Escolha JPG ou PNG.</p>
        )}
        {note && <p className="text-xs text-fg-subtle">{note}</p>}
      </div>

      {format.lossy && (
        <Slider
          label="Qualidade"
          value={settings.quality}
          min={10}
          max={100}
          onChange={(quality) => onChange({ quality })}
          formatValue={(value) => `${value}%`}
          hint="Valores menores geram arquivos menores, com mais perda de detalhes. Fotos JPG nunca saem com qualidade maior que a original: ficariam só mais pesadas."
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
          <p className="text-xs text-fg-subtle">{noTransparencyNote(settings.target)}</p>
        </div>
      )}

      <p className="flex gap-2 text-xs text-fg-subtle">
        <Icon icon={Info} size="sm" className="mt-px" />
        <span>A conversão remove metadados, como localização e data da foto.</span>
      </p>
    </div>
  )
}
