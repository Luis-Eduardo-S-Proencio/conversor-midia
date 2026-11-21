import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { VIDEO_MODES, convertPlan, defaultVideoMode, targetChoices, type ConvertSource, type VideoMode } from '../../../core/video/convert'
import type { VideoFormat } from '../../../core/video/formats'
import { ConvertOptions } from './ConvertOptions'

// Os navegadores de teste não leem nem geram HEVC: a escolha "compatível" ou "rápido" é conferida aqui,
// com o painel montado a partir das mesmas regras que a página usa.

const all = { video: true, audio: true }
const capable = { mp4: all, mov: all, webm: all }

/** Vídeo do iPhone: MOV com HEVC e som AAC. */
const iphone: ConvertSource = { format: 'mov', codec: 'hevc', audioCodec: 'aac', rotated: false, reencodable: capable }

function renderOptions(source: ConvertSource, target: VideoFormat, mode: VideoMode = defaultVideoMode(source, target), handlers = {}) {
  const choices = targetChoices(source)
  const modeChoices =
    source.codec === 'hevc' && target !== 'webm' ? VIDEO_MODES.map((item) => ({ mode: item, available: convertPlan(source, target, item).blocked === null })) : []
  const unavailablePlans = choices.filter((choice) => !choice.available).map((choice) => convertPlan(source, choice.target, defaultVideoMode(source, choice.target)))
  return render(
    <ConvertOptions
      choices={choices}
      plan={convertPlan(source, target, mode)}
      onTargetChange={() => {}}
      modeChoices={modeChoices}
      mode={mode}
      onModeChange={() => {}}
      unavailablePlans={unavailablePlans}
      codec={source.codec}
      audioBitrate={192_000}
      extraTracks={false}
      {...handlers}
    />,
  )
}

/** Texto do detalhe ("Vídeo", "Som") abaixo das opções. */
const detail = (screen: Awaited<ReturnType<typeof renderOptions>>, term: string) =>
  screen
    .getByRole('definition')
    .elements()
    .find((element) => element.previousElementSibling?.textContent === term)?.textContent

describe('ConvertOptions', () => {
  it('HEVC para MP4: "Compatível" já vem marcado e refaz em H.264; o som é copiado', async () => {
    const screen = await renderOptions(iphone, 'mp4')
    await expect.element(screen.getByRole('radiogroup', { name: 'Vídeo HEVC (do iPhone)' })).toBeVisible()
    await expect.element(screen.getByRole('radio', { name: 'Compatível' })).toBeChecked()
    await expect.element(screen.getByText(/^Refaz o vídeo em H\.264, que toca em todo lugar/)).toBeVisible()
    expect(detail(screen, 'Vídeo')).toBe('Refeito em H.264')
    expect(detail(screen, 'Som')).toBe('Copiado, sem perder qualidade')
  })

  it('"Rápido" mantém o HEVC, copiado, e avisa onde pode não tocar', async () => {
    const onModeChange = vi.fn()
    const screen = await renderOptions(iphone, 'mp4', 'compatible', { onModeChange })
    await screen.getByRole('radio', { name: 'Rápido' }).click()
    expect(onModeChange).toHaveBeenCalledWith('fast')

    await screen.rerender(
      <ConvertOptions
        choices={targetChoices(iphone)}
        plan={convertPlan(iphone, 'mp4', 'fast')}
        onTargetChange={() => {}}
        modeChoices={VIDEO_MODES.map((mode) => ({ mode, available: true }))}
        mode="fast"
        onModeChange={() => {}}
        unavailablePlans={[]}
        codec="hevc"
        audioBitrate={192_000}
        extraTracks={false}
      />,
    )
    await expect.element(screen.getByText(/^Mantém o vídeo em HEVC.*alguns computadores com Windows e aparelhos antigos podem não tocar/)).toBeVisible()
    expect(detail(screen, 'Vídeo')).toBe('Copiado, sem perder qualidade')
  })

  it('navegador que não lê HEVC: "Compatível" desligado, com o motivo, e "Rápido" marcado', async () => {
    const none = { video: false, audio: false }
    const source = { ...iphone, reencodable: { mp4: none, mov: none, webm: none } }
    const screen = await renderOptions(source, 'mp4')
    await expect.element(screen.getByRole('radio', { name: 'Compatível' })).toBeDisabled()
    await expect.element(screen.getByRole('radio', { name: 'Rápido' })).toBeChecked()
    await expect.element(screen.getByText(/^Compatível indisponível: este navegador não consegue refazer vídeos HEVC/)).toBeVisible()
    // WEBM não comporta HEVC: precisaria refazer, e o navegador não consegue.
    await expect.element(screen.getByRole('radio', { name: 'WEBM' })).toBeDisabled()
    await expect.element(screen.getByText(/^WEBM indisponível: o vídeo precisa ser refeito em VP9, e este navegador não consegue refazer vídeos HEVC/)).toBeVisible()
  })

  it('para WEBM não há escolha de modo: o HEVC é sempre refeito, e o som na taxa calculada', async () => {
    const screen = await renderOptions(iphone, 'webm', 'compatible', { audioBitrate: 128_000 })
    expect(screen.getByRole('radiogroup', { name: 'Vídeo HEVC (do iPhone)' }).elements()).toHaveLength(0)
    expect(detail(screen, 'Vídeo')).toBe('Refeito em VP9')
    expect(detail(screen, 'Som')).toBe('Refeito em Opus, a 128 kbit/s')
    await expect.element(screen.getByText(/iPhones e Macs mais antigos podem não tocar WEBM/)).toBeVisible()
  })

  it('H.264 entre MOV e MP4: só troca o formato, sem escolha de modo', async () => {
    const screen = await renderOptions({ ...iphone, codec: 'avc' }, 'mp4')
    expect(screen.getByRole('radiogroup', { name: 'Vídeo HEVC (do iPhone)' }).elements()).toHaveLength(0)
    await expect.element(screen.getByText(/^Só troca o formato do arquivo: é rápido, mesmo em vídeos longos/)).toBeVisible()
    await expect.element(screen.getByRole('radio', { name: 'MP4' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'MOV' }).elements()).toHaveLength(0) // o formato do original não é oferecido
  })

  it('formato desligado por falta de AAC: explica o motivo e sugere outro navegador', async () => {
    const noAac = { mp4: { video: true, audio: false }, mov: { video: true, audio: false }, webm: all }
    const screen = await renderOptions({ format: 'mov', codec: 'avc', audioCodec: 'pcm-s16', rotated: false, reencodable: noAac }, 'webm')
    await expect.element(screen.getByRole('radio', { name: 'MP4' })).toBeDisabled()
    await expect
      .element(screen.getByText('MP4 indisponível: o som precisa ser refeito em AAC, e este navegador não gera esse formato de som. Tente no Chrome, no Edge ou no Safari.'))
      .toBeVisible()
  })

  it('informa a escolha de formato', async () => {
    const onTargetChange = vi.fn()
    const screen = await renderOptions({ ...iphone, codec: 'avc' }, 'mp4', 'compatible', { onTargetChange })
    await screen.getByRole('radio', { name: 'WEBM' }).click()
    expect(onTargetChange).toHaveBeenCalledWith('webm')
  })

  it('desligado durante a conversão', async () => {
    const screen = await renderOptions(iphone, 'mp4', 'compatible', { disabled: true })
    await expect.element(screen.getByRole('radio', { name: 'WEBM' })).toBeDisabled()
    await expect.element(screen.getByRole('radio', { name: 'Rápido' })).toBeDisabled()
  })
})
