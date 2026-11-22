import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Simple path routing: /bestiary is the standalone Monster Manual, /songbook is
// the reference for every play style, everything else is the game. Each page is
// loaded on demand so its code (and deps like lucide-react) stays out of the
// others' bundles.
const path = window.location.pathname.replace(/\/+$/, '')

if (path === '/bestiary') {
  void import('./bestiary/Bestiary').then(({ Bestiary }) => {
    root.render(
      <React.StrictMode>
        <Bestiary />
      </React.StrictMode>,
    )
  })
} else if (path === '/songbook') {
  void import('./songbook/Songbook').then(({ Songbook }) => {
    root.render(
      <React.StrictMode>
        <Songbook />
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
