import { useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'

const ABSTRACT_CHAIN_ID = 2741

export type ChainGuardState = {
  isConnected: boolean
  isOnAbstract: boolean
  needsSwitch: boolean
  addOrSwitch: () => Promise<void>
  addNetwork: () => Promise<void>
}

export function useChainGuard(targetChainId: number = ABSTRACT_CHAIN_ID): ChainGuardState {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [adding, setAdding] = useState(false)

  const isOnAbstract = chainId === targetChainId
  const needsSwitch = isConnected && !isOnAbstract

  const addNetwork = async () => {
    if (!window?.ethereum) return
    setAdding(true)
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xAB5',
            chainName: 'Abstract',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://api.mainnet.abs.xyz'],
            blockExplorerUrls: ['https://abscan.org/'],
          },
        ],
      })
    } finally {
      setAdding(false)
    }
  }

  const addOrSwitch = async () => {
    if (!window?.ethereum) return
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAB5' }],
      })
    } catch (switchErr: any) {
      if (switchErr?.code === 4902) {
        await addNetwork()
      } else {
        throw switchErr
      }
    }
  }

  return useMemo(
    () => ({ isConnected, isOnAbstract, needsSwitch, addOrSwitch, addNetwork }),
    [isConnected, isOnAbstract, needsSwitch]
  )
}

export default useChainGuard


