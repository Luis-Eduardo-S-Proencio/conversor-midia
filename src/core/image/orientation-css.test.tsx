import { describe, expect, it } from 'vitest'
import { ORIENTATION_STEPS, UPRIGHT, applyStep, orientationCss, orientationMatrix, type Orientation } from './orientation'

// No navegador: o DOMMatrix lê o CSS do jeito que a tela vai aplicar, para comparar com a matriz do arquivo.
// Um clique e dois cliques: juntos, chegam às 8 orientações (só com dois, metade delas fica de fora).
const ONE_STEP: Orientation[] = ORIENTATION_STEPS.map((step) => applyStep(UPRIGHT, step))
const TWO_STEPS: Orientation[] = ONE_STEP.flatMap((first) => ORIENTATION_STEPS.map((second) => applyStep(first, second)))

describe('prévia × arquivo', () => {
  it('o giro em CSS da prévia é o mesmo do arquivo nas 8 orientações', () => {
    const seen = new Set<string>()
    for (const orientation of [UPRIGHT, ...ONE_STEP, ...TWO_STEPS]) {
      seen.add(JSON.stringify(orientation))
      const css = new DOMMatrix(orientationCss(orientation) || 'none')
      const [a, b, c, d] = orientationMatrix(orientation, { width: 10, height: 6 })
      // "+ 0" troca −0 por 0: as duas formas do zero não diferem aqui.
      const linear = (values: number[]) => values.map((value) => Math.round(value) + 0)
      expect(linear([css.a, css.b, css.c, css.d]), JSON.stringify(orientation)).toEqual(linear([a, b, c, d]))
    }
    expect(seen.size).toBe(8)
  })
})
