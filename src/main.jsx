import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { recargarPorChunkViejo } from './lib/recargaAuto'

// Tras un deploy nuevo, el navegador puede tener cacheada una versión vieja y
// fallar al cargar un "chunk" que ya no existe. Recargamos automáticamente.
window.addEventListener('vite:preloadError', () => recargarPorChunkViejo());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
