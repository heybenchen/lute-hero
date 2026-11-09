import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Simple path routing: standalone code-layer and Bestiary entries load only
// their own bundle; everything else is the full game.
const path = window.location.pathname.replace(/\/+$/, '')

if (path === '/map') {
  void import('./code-layers/GameMapLayer').then(({ GameMapLayer }) => {
    root.render(
      <React.StrictMode>
        <GameMapLayer />
      </React.StrictMode>,
    )
  })
} else if (path === '/bestiary') {
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
