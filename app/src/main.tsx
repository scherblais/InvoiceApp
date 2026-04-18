import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Load the variable Inter before the app stylesheet so the @font-face
// declarations are registered before index.css reads body font-family.
// Subset imports keep the bundle trim — we only need standard Latin.
import '@fontsource-variable/inter/wght.css'
import './index.css'
import App from './App.tsx'
// Side-effect import: exposes `window.lumeriaMigrate` for the one-shot
// realtors→clients migration (console-driven).
import '@/lib/migration'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
