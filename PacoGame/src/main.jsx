import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Web3 providers
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { abstractTestnet } from 'wagmi/chains'

// Configure Web3 with error handling
let config
try {
  config = getDefaultConfig({
    appName: "Paco's Farm",
    projectId: '1e3c0a8da83dc6e1810db1a0637970ad', // Real WalletConnect project ID
    chains: [abstractTestnet],
    ssr: false,
  })
} catch (error) {
  console.error('Web3 config error:', error)
  // Fallback config or handle error
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#FFD700',
            accentColorForeground: 'black',
          })}
          showConnectionStatus={false}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)