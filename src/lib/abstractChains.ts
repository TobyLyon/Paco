/**
 * Abstract L2 Chain Configurations
 * 
 * Official RPC endpoints for Abstract mainnet and testnet
 * Built for production use with wagmi v2 + viem
 */

import { defineChain } from 'viem'

/**
 * Abstract Mainnet (Chain ID: 2741)
 * 
 * Official production network for Abstract L2
 */
export const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://api.mainnet.abs.xyz'],
      webSocket: ['wss://api.mainnet.abs.xyz/ws'],
    },
  },
  fees: {
    defaultPriorityFee: 100000000n, // 0.1 gwei - Abstract Network has very low fees
  },
  blockExplorers: {
    default: {
      name: 'Abscan',
      url: 'https://abscan.org',
      apiUrl: 'https://abscan.org/api',
    },
  },
  contracts: {
    // Add standard Abstract L2 contracts when available
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1,
    },
  },
  testnet: false,
})

/**
 * Abstract Sepolia Testnet (Chain ID: 11124)
 * 
 * Official testnet for Abstract L2 development
 */
export const abstractSepolia = defineChain({
  id: 11124,
  name: 'Abstract Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://api.testnet.abs.xyz'],
      webSocket: ['wss://api.testnet.abs.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Abstract Sepolia Explorer',
      url: 'https://sepolia.abscan.org',
      apiUrl: 'https://sepolia.abscan.org/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1,
    },
  },
  testnet: true,
})

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
