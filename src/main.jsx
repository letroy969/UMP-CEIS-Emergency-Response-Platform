import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initTheme } from './theme.js'
import { applyAppViewport, isAppMode } from './mobile/appMode.js'

// The phone app (Home Screen launch) lays out edge to edge; the website is unchanged.
if (isAppMode()) applyAppViewport()
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
