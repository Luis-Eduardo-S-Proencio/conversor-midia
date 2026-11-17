import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import type { RouteHandle } from '../components/layout/route-handle'
import { AboutPage } from '../pages/AboutPage'
import { ErrorPage } from '../pages/ErrorPage'
import { HomePage } from '../pages/HomePage'
import { ImagesPage } from '../pages/ImagesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
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
    children: [
      { index: true, element: <HomePage /> },
      { path: 'imagens', element: <ImagesPage /> },
      { path: 'videos', element: <VideosPage /> },
      { path: 'sobre', element: <AboutPage /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
