import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

normalizeLegacyRoute()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

function normalizeLegacyRoute() {
  const { hash, pathname, search } = window.location

  if (!hash.startsWith('#/')) return

  const nextPath = hash.slice(1)
  const nextUrl = `${pathname === '/index.html' ? '' : ''}${nextPath}${search}`
  window.history.replaceState(null, '', nextUrl || '/')
}
