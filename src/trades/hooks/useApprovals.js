import { useState, useCallback, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, maxUint256 } from 'viem'

// Environment variables for trades feature
const TRADES_SWAP_ESCROW_ADDRESS = import.meta.env.VITE_TRADES_SWAP_ESCROW_ADDRESS

const ERC721_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ERC1155_ABI = [
  {
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }, { name: 'operator', type: 'address' }],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
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
]

/**
 * Hook to manage token approvals for trading
 * @returns {object} Approval data and methods
 */
function useApprovals() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [approvals, setApprovals] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Check if ERC721 token is approved for SwapEscrow
   */
  const checkERC721Approval = useCallback(async (contractAddress, tokenId) => {
    if (!publicClient || !address || !TRADES_SWAP_ESCROW_ADDRESS) return false

    try {
      // Check specific token approval
      const approvedAddress = await publicClient.readContract({
        address: contractAddress,
        abi: ERC721_ABI,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      })

      if (approvedAddress.toLowerCase() === TRADES_SWAP_ESCROW_ADDRESS.toLowerCase()) {
        return true
      }

      // Check operator approval
      const isApprovedForAll = await publicClient.readContract({
        address: contractAddress,
        abi: ERC721_ABI,
        functionName: 'isApprovedForAll',
        args: [address, TRADES_SWAP_ESCROW_ADDRESS],
      })

      return isApprovedForAll
    } catch (error) {
      console.error('Error checking ERC721 approval:', error)
      return false
    }
  }, [publicClient, address])

  /**
   * Check if ERC1155 collection is approved for SwapEscrow
   */
  const checkERC1155Approval = useCallback(async (contractAddress) => {
    if (!publicClient || !address || !TRADES_SWAP_ESCROW_ADDRESS) return false

    try {
      const isApprovedForAll = await publicClient.readContract({
        address: contractAddress,
        abi: ERC1155_ABI,
        functionName: 'isApprovedForAll',
        args: [address, TRADES_SWAP_ESCROW_ADDRESS],
      })

      return isApprovedForAll
    } catch (error) {
      console.error('Error checking ERC1155 approval:', error)
      return false
    }
  }, [publicClient, address])

  /**
   * Check if ERC20 token has sufficient allowance for SwapEscrow
   */
  const checkERC20Approval = useCallback(async (contractAddress, requiredAmount) => {
    if (!publicClient || !address || !TRADES_SWAP_ESCROW_ADDRESS) return false

    try {
      const allowance = await publicClient.readContract({
        address: contractAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, TRADES_SWAP_ESCROW_ADDRESS],
      })

      const decimals = await publicClient.readContract({
        address: contractAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      })

      const requiredAmountBN = parseUnits(requiredAmount.toString(), decimals)
      return allowance >= requiredAmountBN
    } catch (error) {
      console.error('Error checking ERC20 approval:', error)
      return false
    }
  }, [publicClient, address])

  /**
   * Approve ERC721 token for SwapEscrow
   */
  const approveERC721 = useCallback(async (contractAddress, tokenId, useSetApprovalForAll = false) => {
    if (!walletClient || !TRADES_SWAP_ESCROW_ADDRESS) {
      throw new Error('Wallet not connected')
    }

    try {
      if (useSetApprovalForAll) {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: 'setApprovalForAll',
          args: [TRADES_SWAP_ESCROW_ADDRESS, true],
        })
        return hash
      } else {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: 'approve',
          args: [TRADES_SWAP_ESCROW_ADDRESS, BigInt(tokenId)],
        })
        return hash
      }
    } catch (error) {
      console.error('Error approving ERC721:', error)
      throw error
    }
  }, [walletClient])

  /**
   * Approve ERC1155 collection for SwapEscrow
   */
  const approveERC1155 = useCallback(async (contractAddress) => {
    if (!walletClient || !TRADES_SWAP_ESCROW_ADDRESS) {
      throw new Error('Wallet not connected')
    }

    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: ERC1155_ABI,
        functionName: 'setApprovalForAll',
        args: [TRADES_SWAP_ESCROW_ADDRESS, true],
      })
      return hash
    } catch (error) {
      console.error('Error approving ERC1155:', error)
      throw error
    }
  }, [walletClient])

  /**
   * Approve ERC20 token for SwapEscrow
   */
  const approveERC20 = useCallback(async (contractAddress, amount = null) => {
    if (!walletClient || !TRADES_SWAP_ESCROW_ADDRESS) {
      throw new Error('Wallet not connected')
    }

    try {
      // Use max allowance if no specific amount provided
      const approveAmount = amount ? parseUnits(amount.toString(), 18) : maxUint256

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TRADES_SWAP_ESCROW_ADDRESS, approveAmount],
      })
      return hash
    } catch (error) {
      console.error('Error approving ERC20:', error)
      throw error
    }
  }, [walletClient])

  /**
   * Revoke approval for a contract
   */
  const revokeApproval = useCallback(async (contractAddress, tokenType) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      let hash
      if (tokenType === 'ERC721') {
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: 'setApprovalForAll',
          args: [TRADES_SWAP_ESCROW_ADDRESS, false],
        })
      } else if (tokenType === 'ERC1155') {
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ERC1155_ABI,
          functionName: 'setApprovalForAll',
          args: [TRADES_SWAP_ESCROW_ADDRESS, false],
        })
      } else if (tokenType === 'ERC20') {
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TRADES_SWAP_ESCROW_ADDRESS, 0n],
        })
      }
      return hash
    } catch (error) {
      console.error('Error revoking approval:', error)
      throw error
    }
  }, [walletClient])

  /**
   * Check approvals for multiple items
   */
  const checkItemsApproval = useCallback(async (items) => {
    if (!items || items.length === 0) return {}

    setLoading(true)
    setError(null)

    try {
      const approvalChecks = await Promise.all(
        items.map(async (item) => {
          let isApproved = false

          if (item.itemType === 'ERC721') {
            isApproved = await checkERC721Approval(item.contractAddr, item.tokenId)
          } else if (item.itemType === 'ERC1155') {
            isApproved = await checkERC1155Approval(item.contractAddr)
          } else if (item.itemType === 'ERC20') {
            isApproved = await checkERC20Approval(item.contractAddr, item.amount)
          } else {
            // Native tokens don't need approval
            isApproved = true
          }

          return {
            key: `${item.itemType}_${item.contractAddr}_${item.tokenId || ''}`,
            isApproved,
            item,
          }
        })
      )

      const approvalStatus = {}
      approvalChecks.forEach(({ key, isApproved, item }) => {
        approvalStatus[key] = { isApproved, item }
      })

      setApprovals(approvalStatus)
      return approvalStatus
    } catch (error) {
      console.error('Error checking items approval:', error)
      setError(error.message)
      return {}
    } finally {
      setLoading(false)
    }
  }, [checkERC721Approval, checkERC1155Approval, checkERC20Approval])

  /**
   * Approve multiple items for trading
   */
  const approveItems = useCallback(async (items) => {
    if (!items || items.length === 0) return []

    setLoading(true)
    setError(null)

    try {
      const approvalTxs = []

      for (const item of items) {
        let hash

        if (item.itemType === 'ERC721') {
          hash = await approveERC721(item.contractAddr, item.tokenId, true) // Use setApprovalForAll
        } else if (item.itemType === 'ERC1155') {
          hash = await approveERC1155(item.contractAddr)
        } else if (item.itemType === 'ERC20') {
          hash = await approveERC20(item.contractAddr, item.amount)
        }
        // Native tokens don't need approval

        if (hash) {
          approvalTxs.push({ item, hash })
        }
      }

      // Wait for all transactions to be mined
      if (publicClient) {
        await Promise.all(
          approvalTxs.map(({ hash }) =>
            publicClient.waitForTransactionReceipt({ hash })
          )
        )
      }

      // Refresh approval status
      await checkItemsApproval(items)

      return approvalTxs
    } catch (error) {
      console.error('Error approving items:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [approveERC721, approveERC1155, approveERC20, checkItemsApproval, publicClient])

  /**
   * Get all dangerous approvals (approvals to unknown contracts)
   */
  const getDangerousApprovals = useCallback(async (contractAddresses) => {
    if (!publicClient || !address) return []

    const dangerousApprovals = []

    for (const contractAddr of contractAddresses) {
      try {
        // Check if this contract is approved for all operations
        const isERC721Approved = await publicClient.readContract({
          address: contractAddr,
          abi: ERC721_ABI,
          functionName: 'isApprovedForAll',
          args: [address, contractAddr],
        }).catch(() => false)

        const isERC1155Approved = await publicClient.readContract({
          address: contractAddr,
          abi: ERC1155_ABI,
          functionName: 'isApprovedForAll',
          args: [address, contractAddr],
        }).catch(() => false)

        if (isERC721Approved || isERC1155Approved) {
          // Check if this is NOT our SwapEscrow contract
          if (contractAddr.toLowerCase() !== TRADES_SWAP_ESCROW_ADDRESS?.toLowerCase()) {
            dangerousApprovals.push({
              contractAddress: contractAddr,
              type: isERC721Approved ? 'ERC721' : 'ERC1155',
              approved: true,
            })
          }
        }
      } catch (error) {
        console.error(`Error checking approvals for ${contractAddr}:`, error)
      }
    }

    return dangerousApprovals
  }, [publicClient, address])

  // Clear approvals when address changes
  useEffect(() => {
    if (!address) {
      setApprovals({})
    }
  }, [address])

  return {
    approvals,
    loading,
    error,
    // Check methods
    checkERC721Approval,
    checkERC1155Approval,
    checkERC20Approval,
    checkItemsApproval,
    // Approval methods
    approveERC721,
    approveERC1155,
    approveERC20,
    approveItems,
    // Revoke methods
    revokeApproval,
    // Security methods
    getDangerousApprovals,
  }
}

export default useApprovals