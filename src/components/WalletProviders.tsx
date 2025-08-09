/**
 * Production-Ready Wallet Providers
 * 
 * Supports ALL major EVM wallets via RainbowKit + wagmi + WalletConnect
 * Features:
 * - MetaMask, Rabby, Trust, Rainbow, OKX, Coinbase, Ledger, Argent
 * - Auto-switch to Abstract L2 after connection
 * - Secure WalletConnect integration
 * - Production-optimized configuration
 */

import React, { ReactNode, useEffect } from 'react'
import { WagmiProvider, useAccount, useSwitchChain } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { metaMask, walletConnect, coinbaseWallet, injected } from 'wagmi/connectors'
import { abstract, abstractSepolia, getDefaultChain } from '../lib/abstractChains'
import toast from 'react-hot-toast'

// Initialize QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

/**
 * Wallet configuration with comprehensive connector support
 */
const wagmiConfig = getDefaultConfig({
  appName: "Paco's Crash Casino",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [abstract, abstractSepolia],
  connectors: [
    // MetaMask (most popular)
    metaMask(),
    
    // WalletConnect (supports 300+ wallets including mobile)
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: "Paco's Crash Casino",
        description: 'The clucking best crash game on Abstract L2',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://pacorocko.com',
        icons: [`${typeof window !== 'undefined' ? window.location.origin : 'https://pacorocko.com'}/favicon.png`],
      },
      showQrModal: true,
    }),
    
    // Coinbase Wallet
    coinbaseWallet({
      appName: "Paco's Crash Casino",
      appLogoUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://pacorocko.com'}/favicon.png`,
      preference: 'smartWalletOnly', // Use Smart Wallet by default
    }),
    
    // Generic injected connector (catches Rabby, Trust, OKX, Argent, etc.)
    injected({
      shimDisconnect: true,
    }),
  ],
  ssr: false,
})

interface WalletProvidersProps {
  children: ReactNode
}

/**
 * Auto Network Switcher Component
 * 
 * Automatically switches to Abstract L2 after wallet connection
 */
function AutoNetworkSwitcher() {
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const targetChain = getDefaultChain()

  useEffect(() => {
    if (isConnected && chainId && chainId !== targetChain.id) {
      // Small delay to ensure wallet connection is fully established
      const timer = setTimeout(() => {
        try {
          switchChain({ chainId: targetChain.id })
          toast.success(`Switching to ${targetChain.name}...`, {
            icon: '🔄',
            duration: 3000,
          })
        } catch (error) {
          console.warn('Auto network switch failed:', error)
          toast.error(`Please switch to ${targetChain.name} manually`, {
            icon: '⚠️',
            duration: 5000,
          })
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isConnected, chainId, switchChain, targetChain])

  return null
}

/**
 * Main Wallet Providers Component
 * 
 * Wraps the entire app with wallet functionality
 */
export default function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme="dark"
          showConnectionStatus={true}
          showRecentTransactions={true}
          appInfo={{
            appName: "Paco's Crash Casino",
            learnMoreUrl: 'https://pacorocko.com',
          }}
          modalSize="compact"
        >
          <AutoNetworkSwitcher />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

/**
 * Hook to get current Abstract chain info
 */
export function useAbstractChain() {
  const { chain } = useAccount()
  
  return {
    isAbstract: chain?.id === abstract.id || chain?.id === abstractSepolia.id,
    isMainnet: chain?.id === abstract.id,
    isTestnet: chain?.id === abstractSepolia.id,
    currentChain: chain,
    targetChain: getDefaultChain(),
  }
}
