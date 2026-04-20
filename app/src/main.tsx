import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Load Geist Sans (UI) + Geist Mono (tabular / keyboard chips) before
// the app stylesheet so the @font-face declarations are registered
// by the time index.css reads body font-family. Variable-axis only —
// we hydrate weights 100–900 from a single .woff2 per subset instead
// of shipping one file per weight.
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
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
