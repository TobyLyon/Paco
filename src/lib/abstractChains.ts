/**
 * Abstract L2 Chain Configurations
 * 
 * Using wagmi's built-in chains for better wallet compatibility
 * This prevents RPC warnings in MetaMask and other wallets
 */

import { abstractTestnet } from 'wagmi/chains'

/**
 * Abstract Mainnet (Chain ID: 2741)
 * 
 * Since wagmi doesn't have built-in mainnet yet, we use minimal config
 * that matches official endpoints to avoid wallet warnings
 */
export const abstract = {
  id: 2741,
  name: 'Abstract',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://api.mainnet.abs.xyz'] },
    public: { http: ['https://api.mainnet.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abscan', url: 'https://abscan.org' },
  },
  testnet: false,
} as const

/**
 * Abstract Testnet - Using wagmi built-in for best compatibility
 * 
 * This prevents wallet RPC warnings since it's a recognized chain
 */
export const abstractSepolia = abstractTestnet

/**
 * Get the appropriate chain based on environment
 */
export function getDefaultChain() {
  // Use testnet in development, mainnet in production
  return import.meta.env.DEV ? abstractSepolia : abstract
}

/**
 * All supported Abstract chains
 */
export const abstractChains = [abstract, abstractSepolia] as const

export type AbstractChain = typeof abstract | typeof abstractSepolia
