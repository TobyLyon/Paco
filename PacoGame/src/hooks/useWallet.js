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
  // Disabled eager auto-reconnect to avoid forcing MetaMask or a saved connector.
  // Users will choose their wallet brand via the connect modal instead.

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