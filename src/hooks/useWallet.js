import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect } from 'react'

export default function useWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // Log connection state changes
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet connected:', address)
    }
  }, [isConnected, address])

  // Auto-reconnect if previously connected
  useEffect(() => {
    const lastConnector = localStorage.getItem('wagmi.wallet')
    if (lastConnector && !isConnected && !isConnecting) {
      const connector = connectors.find(c => c.name === lastConnector)
      if (connector) {
        connect({ connector })
      }
    }
  }, [connect, connectors, isConnected, isConnecting])

  return {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    // Helper functions
    formatAddress: (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '',
    isWalletReady: isConnected && address,
  }
}