import { StrictMode, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MediaKind } from '../../core/media-kind'
import { clearHandOff, handOffFiles, peekHandOff, useHandedOffFiles } from './file-handoff'

/** Ferramenta de mentira: mostra os nomes recebidos e anota cada recebimento e cada desfazer. */
function Receiver({ kind, log }: { kind: MediaKind; log: string[] }) {
  const [names, setNames] = useState<string[]>([])
  useHandedOffFiles(
    kind,
    (files) => {
      log.push('recebeu')
      setNames(files.map((file) => file.name))
    },
    () => {
      log.push('desfez')
      setNames([])
    },
  )
  return <p>{names.length > 0 ? names.join(', ') : 'nada recebido'}</p>
}

afterEach(() => {
  for (const kind of ['image', 'video'] as const) clearHandOff(peekHandOff(kind) ?? [])
})

describe('entrega de arquivos entre telas', () => {
  it('a ferramenta recebe os arquivos uma vez só, mesmo com a montagem repetida do modo estrito', async () => {
    const files = [new File(['a'], 'praia.jpg'), new File(['b'], 'logo.png')]
    handOffFiles('image', files)
    const log: string[] = []

    const screen = await render(
      <StrictMode>
        <Receiver kind="image" log={log} />
      </StrictMode>,
    )

    await expect.element(screen.getByText('praia.jpg, logo.png')).toBeVisible()
    await expect.poll(() => peekHandOff('image')).toBeNull()
    // Cada recebimento desfeito pela desmontagem de teste é refeito: no fim, um recebimento valendo.
    const received = log.filter((entry) => entry === 'recebeu').length
    const undone = log.filter((entry) => entry === 'desfez').length
    expect(received - undone).toBe(1)
    expect(log.at(-1)).toBe('recebeu')
  })

  it('arquivos de outro tipo ficam esperando a ferramenta certa', async () => {
    const video = [new File(['v'], 'viagem.mp4')]
    handOffFiles('video', video)

    const screen = await render(<Receiver kind="image" log={[]} />)

    await expect.element(screen.getByText('nada recebido')).toBeVisible()
    expect(peekHandOff('video')).toEqual(video)
  })

  it('a entrega guarda uma cópia da lista e some quando não há arquivos', () => {
    const files = [new File(['a'], 'a.jpg')]
    handOffFiles('image', files)
    files.push(new File(['b'], 'b.jpg'))
    expect(peekHandOff('image')).toHaveLength(1)

    handOffFiles('image', [])
    expect(peekHandOff('image')).toBeNull()
  })
})
