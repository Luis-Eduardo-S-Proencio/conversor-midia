import type { BatchLabels } from '../shared/constants'

export const CROP_LABELS: BatchLabels = {
  action: 'Recortar',
  progress: 'Recortando',
  done: 'recortada',
  noun: 'Edição', // feminino, como pede a base: "Edição cancelada."
  again: 'Recortar outra',
}

/** Uma imagem por vez: o ZIP nunca é montado, mas a tela comum pede um nome. */
export const CROP_ZIP_NAME = 'imagens-recortadas.zip'

/** Qualidade fixa para JPG e WEBP: a ferramenta só recorta; para reduzir o arquivo existe Comprimir. */
export const CROP_QUALITY = 0.92
