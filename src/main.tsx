import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Simple path routing: /bestiary is the standalone Monster Manual, /map jumps
// straight into a default hotseat board, everything else is the game. Each side is loaded on demand so its code (and deps like
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
} else if (path === '/map') {
  void import('./components/game/MapView').then(({ MapView }) => {
    root.render(
      <React.StrictMode>
        <MapView />
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
