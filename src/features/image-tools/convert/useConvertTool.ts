import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { OUTPUT_FORMAT_INFO, defaultTargetFormat, parseOutputFormat } from '../../../core/image/formats'
import { reencodeQuality } from '../../../core/image/jpeg-quality'
import { outputFileName } from '../../../core/image/output-name'
import { useImageBatch } from '../shared/useImageBatch'
import { BACKGROUND_COLORS, CONVERT_LABELS, DEFAULT_PREFERENCES, type ConvertPreferences, type ConvertSettings } from './settings'

/** Converter imagem: formato sugerido pelos arquivos até a pessoa escolher; conversão em lote. */
export function useConvertTool() {
  const batch = useImageBatch(CONVERT_LABELS)
  const { summary, webpSupported, invalidateResults, run, reset: resetBatch } = batch
  // Um atalho pode pedir o formato ("Imagem para PDF" abre com ?formato=pdf).
  const [searchParams] = useSearchParams()
  const [preferences, setPreferences] = useState<ConvertPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    target: parseOutputFormat(searchParams.get('formato')),
  }))

  // Formato efetivo: a escolha da pessoa ou a sugestão pelos arquivos. Sem codificador WEBP
  // no navegador, a escolha por WEBP cai para a sugestão.
  const settings = useMemo<ConvertSettings>(() => {
    const canEncodeWebp = webpSupported !== false
    const chosen = preferences.target
    const usable = chosen !== undefined && (chosen !== 'webp' || canEncodeWebp)
    const target = usable ? chosen : defaultTargetFormat(summary.formats, canEncodeWebp)
    return { target, quality: preferences.quality, background: preferences.background }
  }, [preferences, summary.formats, webpSupported])

  const updateSettings = useCallback(
    (changes: Partial<ConvertSettings>) => {
      setPreferences((current) => ({ ...current, ...changes }))
      invalidateResults()
    },
    [invalidateResults],
  )

  const convert = useCallback(() => {
    const { target, quality, background } = settings
    // Fixa o formato usado: arquivos adicionados depois não mudam a sugestão e misturam resultados.
    setPreferences((current) => (current.target === target ? current : { ...current, target }))
    void run(async (file, item, { client, signal }) => {
      // Foto JPG não é regravada com qualidade maior que a dela: só ficaria mais pesada.
      const fileQuality = item.image ? reencodeQuality(quality / 100, item.image, target) : quality / 100
      const output = await client.run({ kind: 'convert', file, target, quality: fileQuality, background: BACKGROUND_COLORS[background] }, signal)
      return { blob: output.blob, name: outputFileName(item.name, target) }
    })
  }, [settings, run])

  // Recomeçar volta a sugerir o formato pelos próximos arquivos; qualidade e fundo continuam.
  const reset = useCallback(() => {
    resetBatch()
    setPreferences((current) => ({ ...current, target: undefined }))
  }, [resetBatch])

  // Formato sem transparência (JPG, BMP, PDF): a prévia já mostra o fundo que o arquivo terá.
  const backdrop = OUTPUT_FORMAT_INFO[settings.target].supportsAlpha ? undefined : BACKGROUND_COLORS[settings.background]

  return { batch: { ...batch, reset }, settings, updateSettings, convert, backdrop }
}
