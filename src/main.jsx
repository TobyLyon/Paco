import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Web3 providers
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { abstractTestnet } from 'wagmi/chains'

// Configure Web3
const config = getDefaultConfig({
  appName: "Paco's Farm",
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [abstractTestnet],
  ssr: false,
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme="dark" showConnectionStatus={false}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)