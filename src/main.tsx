import './styles/index.css'
// Antes do roteador: registra o popstate primeiro, para a direção da animação estar certa ao voltar.
import { rememberHistoryIndex } from './app/nav-direction'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './app/router'

// A cada navegação, guarda a posição no histórico (para saber se o próximo popstate volta ou avança).
router.subscribe(rememberHistoryIndex)

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado em index.html')

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
