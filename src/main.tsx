import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Simple path routing: /bestiary is the standalone Monster Manual, everything
// else is the game. Each side is loaded on demand so its code (and deps like
// lucide-react) stays out of the other's bundle.
const path = window.location.pathname.replace(/\/+$/, '')

if (path === '/bestiary') {
  void import('./bestiary/Bestiary').then(({ Bestiary }) => {
    root.render(
      <React.StrictMode>
        <Bestiary />
      </React.StrictMode>,
    )
  })
} else {
  void import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
}
