import type { VideoToolLabels } from '../shared/useVideoTool'

export const RESIZE_LABELS: VideoToolLabels = {
  action: 'Mudar resolução',
  progress: 'Redimensionando',
  done: 'redimensionado',
  cancelled: 'Mudança de resolução cancelada.',
  again: 'Mudar a resolução de outro vídeo',
}

/** Por que não há opção maior: a pessoa pode achar que aumentar a resolução melhora o vídeo. */
export const ONLY_DOWNSCALE =
  'Só dá para diminuir a resolução. Aumentar não melhora a qualidade: não cria detalhes que o vídeo não tem e só deixa o arquivo maior. Por isso as resoluções iguais ou maiores que a do vídeo ficam desligadas.'
