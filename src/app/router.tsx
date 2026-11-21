import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import type { RouteHandle } from '../components/layout/route-handle'
import { AboutPage } from '../pages/AboutPage'
import { ErrorPage } from '../pages/ErrorPage'
import { HomePage } from '../pages/HomePage'
import { ImagesPage } from '../pages/ImagesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteLoading } from '../pages/RouteLoading'
import { VideosPage } from '../pages/VideosPage'

// A vitrine de componentes só existe em desenvolvimento: no build, import.meta.env.DEV vira
// `false` e a rota e seu código saem do pacote.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'design-system',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { DesignSystemPage } = await import('../pages/dev/DesignSystemPage')
          return { Component: DesignSystemPage }
        },
      },
    ]
  : []

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    HydrateFallback: RouteLoading,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'imagens', element: <ImagesPage /> },
      { path: 'videos', element: <VideosPage /> },
      { path: 'sobre', element: <AboutPage /> },
      {
        // Ferramentas carregam sob demanda: o código e o Worker não pesam na página inicial.
        path: 'imagens/converter',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { ConvertPage } = await import('../features/image-tools/convert/ConvertPage')
          return { Component: ConvertPage }
        },
      },
      {
        path: 'imagens/comprimir',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { CompressPage } = await import('../features/image-tools/compress/CompressPage')
          return { Component: CompressPage }
        },
      },
      {
        path: 'imagens/redimensionar',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { ResizePage } = await import('../features/image-tools/resize/ResizePage')
          return { Component: ResizePage }
        },
      },
      {
        path: 'imagens/girar',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { RotatePage } = await import('../features/image-tools/rotate/RotatePage')
          return { Component: RotatePage }
        },
      },
      {
        // A biblioteca de recorte (react-image-crop) só carrega aqui e no recorte de vídeo.
        path: 'imagens/recortar',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { CropPage } = await import('../features/image-tools/crop/CropPage')
          return { Component: CropPage }
        },
      },
      {
        // O Worker de vídeo (com o Mediabunny) só carrega nas ferramentas de vídeo.
        path: 'videos/cortar',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { TrimPage } = await import('../features/video-tools/trim/TrimPage')
          return { Component: TrimPage }
        },
      },
      {
        path: 'videos/recortar',
        handle: { hideBottomNav: true } satisfies RouteHandle,
        lazy: async () => {
          const { VideoCropPage } = await import('../features/video-tools/crop/VideoCropPage')
          return { Component: VideoCropPage }
        },
      },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
