import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Production-ready wallet providers
import '@rainbow-me/rainbowkit/styles.css'
import WalletProviders from './components/WalletProviders.tsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </React.StrictMode>,
)