import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
