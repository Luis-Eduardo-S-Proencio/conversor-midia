/** Páginas públicas verificadas em todas as larguras. */
export const PUBLIC_ROUTES = [
  { path: '/', heading: 'Edite fotos e vídeos direto no navegador' },
  { path: '/imagens', heading: 'Ferramentas de imagem' },
  { path: '/videos', heading: 'Ferramentas de vídeo' },
  { path: '/sobre', heading: 'Sobre' },
  { path: '/imagens/converter', heading: 'Converter imagem' },
  { path: '/imagens/comprimir', heading: 'Comprimir imagem' },
  { path: '/imagens/redimensionar', heading: 'Redimensionar imagem' },
  { path: '/imagens/girar', heading: 'Girar e espelhar' },
  { path: '/imagens/recortar', heading: 'Recortar imagem' },
  { path: '/videos/editar', heading: 'Editar vídeo' },
  { path: '/videos/recortar', heading: 'Recortar vídeo' },
  { path: '/videos/comprimir', heading: 'Comprimir vídeo' },
  { path: '/videos/extrair-audio', heading: 'Extrair áudio' },
  { path: '/videos/resolucao', heading: 'Mudar resolução' },
  { path: '/videos/converter', heading: 'Converter vídeo' },
  { path: '/videos/gif', heading: 'Criar GIF' },
  { path: '/endereco-que-nao-existe', heading: 'Página não encontrada' },
] as const

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
