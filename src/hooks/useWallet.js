import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { useEffect } from 'react'
import { useAbstractChain } from '../components/WalletProviders.tsx'
import useChainGuard from './useChainGuard'

export default function useWallet() {
  const { address, isConnected, isConnecting, status } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { isAbstract, targetChain, currentChain } = useAbstractChain()
  const chainGuard = useChainGuard(2741)

  // Log connection state changes
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet connected:', address)
      console.log('🌐 Current chain:', currentChain?.name, `(${chainId})`)
      console.log('📍 On Abstract L2:', isAbstract)
    }
  }, [isConnected, address, chainId, currentChain, isAbstract])

  return {
    // Core wallet state
    address,
    isConnected,
    isConnecting,
    status,
    
    // Chain information
    chainId,
    isAbstract,
    currentChain,
    targetChain,
    
    // Connection functions
    connect,
    disconnect,
    connectors,
    
    // Helper functions
    formatAddress: (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '',
    isWalletReady: isConnected && address && isAbstract,
    isWrongNetwork: isConnected && !isAbstract,
    addOrSwitchAbstract: chainGuard.addOrSwitch,
    
    // Wallet connection status helpers
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    isDisconnected: status === 'disconnected',
  }
}