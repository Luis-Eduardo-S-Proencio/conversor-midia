import type { BatchLabels } from '../shared/constants'

/** "Ajustar" serve tanto para girar quanto para espelhar: "Imagem ajustada", "Ajustar 3 imagens". */
export const ROTATE_LABELS: BatchLabels = {
  action: 'Ajustar',
  progress: 'Ajustando',
  done: 'ajustada',
  noun: 'Edição', // feminino, como pede a base: "Edição cancelada."
}

export const ROTATE_ZIP_NAME = 'imagens-ajustadas.zip'

/** Qualidade fixa para JPG e WEBP: a ferramenta só gira e espelha; para reduzir o arquivo existe Comprimir. */
export const ROTATE_QUALITY = 0.92

export const NOTHING_CHOSEN = 'Gire ou espelhe a imagem antes.'
