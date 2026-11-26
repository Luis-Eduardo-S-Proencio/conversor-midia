import { Navigate, createBrowserRouter } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import type { RouteHandle } from '../components/layout/route-handle'
import { ErrorPage } from '../pages/ErrorPage'
import { HomePage } from '../pages/HomePage'
import { ImagesPage } from '../pages/ImagesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteLoading } from '../pages/RouteLoading'
import { VideosPage } from '../pages/VideosPage'

// Como o shell trata cada tela (ver route-handle.ts). Sem handle, a tela é uma página interna comum.
const ROOT = { layout: 'root' } satisfies RouteHandle
const TOOL = { layout: 'tool' } satisfies RouteHandle

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    HydrateFallback: RouteLoading,
    children: [
      { index: true, handle: ROOT, element: <HomePage /> },
      { path: 'imagens', handle: ROOT, element: <ImagesPage /> },
      { path: 'videos', handle: ROOT, element: <VideosPage /> },
      {
        // Sob demanda: a página lista formatos e limites lidos do núcleo, que de outro modo
        // entrariam no pacote inicial junto com o código das ferramentas de onde eles vêm.
        path: 'sobre',
        lazy: async () => {
          const { AboutPage } = await import('../pages/AboutPage')
          return { Component: AboutPage }
        },
      },
      {
        // Licenças de código aberto: fora do Sobre, ligada pelo rodapé do menu (☰).
        path: 'sobre/licencas',
        lazy: async () => {
          const { LicensesPage } = await import('../pages/LicensesPage')
          return { Component: LicensesPage }
        },
      },
      {
        // Ferramentas carregam sob demanda: o código e o Worker não pesam na página inicial.
        path: 'imagens/converter',
        handle: TOOL,
        lazy: async () => {
          const { ConvertPage } = await import('../features/image-tools/convert/ConvertPage')
          return { Component: ConvertPage }
        },
      },
      {
        path: 'imagens/comprimir',
        handle: TOOL,
        lazy: async () => {
          const { CompressPage } = await import('../features/image-tools/compress/CompressPage')
          return { Component: CompressPage }
        },
      },
      {
        path: 'imagens/redimensionar',
        handle: TOOL,
        lazy: async () => {
          const { ResizePage } = await import('../features/image-tools/resize/ResizePage')
          return { Component: ResizePage }
        },
      },
      {
        path: 'imagens/girar',
        handle: TOOL,
        lazy: async () => {
          const { RotatePage } = await import('../features/image-tools/rotate/RotatePage')
          return { Component: RotatePage }
        },
      },
      {
        // A biblioteca de recorte (react-image-crop) só carrega aqui e no recorte de vídeo.
        path: 'imagens/recortar',
        handle: TOOL,
        lazy: async () => {
          const { CropPage } = await import('../features/image-tools/crop/CropPage')
          return { Component: CropPage }
        },
      },
      {
        // O Worker de vídeo (com o Mediabunny) só carrega nas ferramentas de vídeo.
        path: 'videos/editar',
        handle: TOOL,
        lazy: async () => {
          const { EditPage } = await import('../features/video-tools/edit/EditPage')
          return { Component: EditPage }
        },
      },
      // Endereço antigo do "Cortar trecho", que virou o "Editar vídeo": links salvos continuam funcionando.
      { path: 'videos/cortar', element: <Navigate to="/videos/editar" replace /> },
      {
        path: 'videos/comprimir',
        handle: TOOL,
        lazy: async () => {
          const { CompressPage } = await import('../features/video-tools/compress/CompressPage')
          return { Component: CompressPage }
        },
      },
      {
        path: 'videos/recortar',
        handle: TOOL,
        lazy: async () => {
          const { VideoCropPage } = await import('../features/video-tools/crop/VideoCropPage')
          return { Component: VideoCropPage }
        },
      },
      {
        path: 'videos/resolucao',
        handle: TOOL,
        lazy: async () => {
          const { ResizePage } = await import('../features/video-tools/resize/ResizePage')
          return { Component: ResizePage }
        },
      },
      {
        path: 'videos/extrair-audio',
        handle: TOOL,
        lazy: async () => {
          const { ExtractAudioPage } = await import('../features/video-tools/audio/ExtractAudioPage')
          return { Component: ExtractAudioPage }
        },
      },
      {
        path: 'videos/converter',
        handle: TOOL,
        lazy: async () => {
          const { ConvertPage } = await import('../features/video-tools/convert/ConvertPage')
          return { Component: ConvertPage }
        },
      },
      {
        path: 'videos/gif',
        handle: TOOL,
        lazy: async () => {
          const { GifPage } = await import('../features/video-tools/gif/GifPage')
          return { Component: GifPage }
        },
      },
      {
        // Vitrine de tokens e componentes: publicada, mas fora da navegação (e sem indexação).
        path: '_design',
        handle: TOOL,
        lazy: async () => {
          const { DesignPage } = await import('../pages/DesignPage')
          return { Component: DesignPage }
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
