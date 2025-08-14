import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'

const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
]

// Interface detection ABI
const INTERFACE_ABI = [
  {
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
]

// Interface IDs
const ERC721_INTERFACE_ID = '0x80ac58cd'
const ERC1155_INTERFACE_ID = '0xd9b67a26'

/**
 * Hook to manage user's NFT and token inventory
 * @param {string} targetAddress - Address to check inventory for (defaults to connected wallet)
 * @returns {object} Inventory data and methods
 */
function useInventory(targetAddress = null) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  
  const [inventory, setInventory] = useState({
    erc721: [],
    erc1155: [],
    erc20: [],
    native: '0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const walletAddress = targetAddress || address

  /**
   * Detect contract type by checking interface support
   */
  const detectContractType = useCallback(async (contractAddress) => {
    if (!publicClient || !contractAddress) return null

    try {
      // Check ERC721
      try {
        const isERC721 = await publicClient.readContract({
          address: contractAddress,
          abi: INTERFACE_ABI,
          functionName: 'supportsInterface',
          args: [ERC721_INTERFACE_ID],
        })
        if (isERC721) return 'ERC721'
      } catch (e) {
        // Interface not supported or contract doesn't implement ERC165
      }

      // Check ERC1155
      try {
        const isERC1155 = await publicClient.readContract({
          address: contractAddress,
          abi: INTERFACE_ABI,
          functionName: 'supportsInterface',
          args: [ERC1155_INTERFACE_ID],
        })
        if (isERC1155) return 'ERC1155'
      } catch (e) {
        // Interface not supported
      }

      // Try to detect ERC20 by checking for required functions
      try {
        await publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        })
        return 'ERC20'
      } catch (e) {
        // Not ERC20
      }

      return 'UNKNOWN'
    } catch (error) {
      console.error('Error detecting contract type:', error)
      return 'UNKNOWN'
    }
  }, [publicClient])

  /**
   * Get contract metadata (name, symbol)
   */
  const getContractMetadata = useCallback(async (contractAddress, contractType) => {
    if (!publicClient) return { name: 'Unknown', symbol: 'UNK' }

    try {
      const abi = contractType === 'ERC721' ? ERC721_ABI : 
                  contractType === 'ERC1155' ? ERC1155_ABI : 
                  ERC20_ABI

      const [name, symbol] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'name',
        }).catch(() => 'Unknown'),
        publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'symbol',
        }).catch(() => 'UNK'),
      ])

      return { name, symbol }
    } catch (error) {
      console.error('Error getting contract metadata:', error)
      return { name: 'Unknown', symbol: 'UNK' }
    }
  }, [publicClient])

  /**
   * Get ERC721 tokens owned by address
   */
  const getERC721Tokens = useCallback(async (contractAddress, maxTokens = 100) => {
    if (!publicClient || !walletAddress) return []

    try {
      const balance = await publicClient.readContract({
        address: contractAddress,
        abi: ERC721_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      })

      if (balance === 0n) return []

      const metadata = await getContractMetadata(contractAddress, 'ERC721')
      const tokens = []

      // For simplicity, we'll check token IDs 0-maxTokens
      // In production, you'd want a more sophisticated approach (events, subgraph, etc.)
      for (let i = 0; i < Math.min(Number(balance), maxTokens); i++) {
        try {
          const owner = await publicClient.readContract({
            address: contractAddress,
            abi: ERC721_ABI,
            functionName: 'ownerOf',
            args: [BigInt(i)],
          })

          if (owner.toLowerCase() === walletAddress.toLowerCase()) {
            let tokenURI = ''
            try {
              tokenURI = await publicClient.readContract({
                address: contractAddress,
                abi: ERC721_ABI,
                functionName: 'tokenURI',
                args: [BigInt(i)],
              })
            } catch (e) {
              // TokenURI not available
            }

            tokens.push({
              contractAddress,
              tokenId: i.toString(),
              amount: '1',
              type: 'ERC721',
              name: metadata.name,
              symbol: metadata.symbol,
              tokenURI,
            })
          }
        } catch (e) {
          // Token doesn't exist or error reading
          continue
        }
      }

      return tokens
    } catch (error) {
      console.error('Error getting ERC721 tokens:', error)
      return []
    }
  }, [publicClient, walletAddress, getContractMetadata])

  /**
   * Get ERC1155 token balance
   */
  const getERC1155Balance = useCallback(async (contractAddress, tokenId) => {
    if (!publicClient || !walletAddress) return '0'

    try {
      const balance = await publicClient.readContract({
        address: contractAddress,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [walletAddress, BigInt(tokenId)],
      })

      return balance.toString()
    } catch (error) {
      console.error('Error getting ERC1155 balance:', error)
      return '0'
    }
  }, [publicClient, walletAddress])

  /**
   * Get ERC20 token balance
   */
  const getERC20Balance = useCallback(async (contractAddress) => {
    if (!publicClient || !walletAddress) return { balance: '0', decimals: 18 }

    try {
      const [balance, decimals] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ])

      return { 
        balance: balance.toString(), 
        decimals: Number(decimals),
        formatted: formatUnits(balance, decimals),
      }
    } catch (error) {
      console.error('Error getting ERC20 balance:', error)
      return { balance: '0', decimals: 18, formatted: '0' }
    }
  }, [publicClient, walletAddress])

  /**
   * Get native ETH balance
   */
  const getNativeBalance = useCallback(async () => {
    if (!publicClient || !walletAddress) return '0'

    try {
      const balance = await publicClient.getBalance({ address: walletAddress })
      return formatUnits(balance, 18)
    } catch (error) {
      console.error('Error getting native balance:', error)
      return '0'
    }
  }, [publicClient, walletAddress])

  /**
   * Add a contract to inventory
   */
  const addContract = useCallback(async (contractAddress, tokenId = null) => {
    if (!contractAddress || !walletAddress) return

    setLoading(true)
    setError(null)

    try {
      const contractType = await detectContractType(contractAddress)
      
      if (contractType === 'ERC721') {
        const tokens = await getERC721Tokens(contractAddress)
        setInventory(prev => ({
          ...prev,
          erc721: [...prev.erc721.filter(t => t.contractAddress !== contractAddress), ...tokens]
        }))
      } else if (contractType === 'ERC1155' && tokenId !== null) {
        const balance = await getERC1155Balance(contractAddress, tokenId)
        if (balance !== '0') {
          const metadata = await getContractMetadata(contractAddress, 'ERC1155')
          const token = {
            contractAddress,
            tokenId: tokenId.toString(),
            amount: balance,
            type: 'ERC1155',
            name: metadata.name,
            symbol: metadata.symbol,
          }
          setInventory(prev => ({
            ...prev,
            erc1155: [...prev.erc1155.filter(t => 
              !(t.contractAddress === contractAddress && t.tokenId === tokenId.toString())
            ), token]
          }))
        }
      } else if (contractType === 'ERC20') {
        const { balance, decimals, formatted } = await getERC20Balance(contractAddress)
        if (balance !== '0') {
          const metadata = await getContractMetadata(contractAddress, 'ERC20')
          const token = {
            contractAddress,
            balance,
            decimals,
            formatted,
            type: 'ERC20',
            name: metadata.name,
            symbol: metadata.symbol,
          }
          setInventory(prev => ({
            ...prev,
            erc20: [...prev.erc20.filter(t => t.contractAddress !== contractAddress), token]
          }))
        }
      } else {
        throw new Error(`Unsupported contract type: ${contractType}`)
      }
    } catch (error) {
      console.error('Error adding contract to inventory:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [walletAddress, detectContractType, getERC721Tokens, getERC1155Balance, getERC20Balance, getContractMetadata])

  /**
   * Refresh native balance
   */
  const refreshNativeBalance = useCallback(async () => {
    const balance = await getNativeBalance()
    setInventory(prev => ({ ...prev, native: balance }))
  }, [getNativeBalance])

  /**
   * Clear inventory
   */
  const clearInventory = useCallback(() => {
    setInventory({
      erc721: [],
      erc1155: [],
      erc20: [],
      native: '0',
    })
  }, [])

  // Load native balance on address change
  useEffect(() => {
    if (walletAddress) {
      refreshNativeBalance()
    } else {
      clearInventory()
    }
  }, [walletAddress, refreshNativeBalance, clearInventory])

  return {
    inventory,
    loading,
    error,
    addContract,
    refreshNativeBalance,
    clearInventory,
    // Utility methods
    detectContractType,
    getERC721Tokens,
    getERC1155Balance,
    getERC20Balance,
    getNativeBalance,
  }
}

export default useInventory