import { useState, useEffect } from 'react'

export default function useNFTOwnership(address) {
  const [nftData, setNftData] = useState({
    chickens: [],
    coyotes: [],
    coops: [],
    hasAccess: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!address) {
      setNftData({ chickens: [], coyotes: [], coops: [], hasAccess: false })
      return
    }

    checkNFTOwnership(address)
  }, [address])

  const checkNFTOwnership = async (walletAddress) => {
    if (!walletAddress) return

    setIsLoading(true)
    setError(null)

    try {
      // NFT gating removed for development - instant access
      // Will add back when ready for community testing
      await new Promise(resolve => setTimeout(resolve, 500)) // Quick loading
      
      setNftData({
        chickens: [
          { id: 1, tier: 'common', yieldRate: 10, isStaked: false },
          { id: 2, tier: 'uncommon', yieldRate: 25, isStaked: true },
          { id: 3, tier: 'rare', yieldRate: 50, isStaked: false }
        ],
        coyotes: [
          { id: 1, tier: 'uncommon', raidPower: 15, cooldown: 0 }
        ],
        coops: [
          { id: 1, capacity: 10, level: 1 }
        ],
        hasAccess: true
      })
        
        console.log('🔍 NFT ownership check completed (DEV MODE)')
      
    } catch (err) {
      console.error('Error checking NFT ownership:', err)
      setError(err.message)
      setNftData({ chickens: [], coyotes: [], coops: [], hasAccess: false })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions
  const getTotalYieldRate = () => {
    return nftData.chickens
      .filter(chicken => chicken.isStaked)
      .reduce((total, chicken) => total + chicken.yieldRate, 0)
  }

  const getStakedChickens = () => {
    return nftData.chickens.filter(chicken => chicken.isStaked)
  }

  const getAvailableChickens = () => {
    return nftData.chickens.filter(chicken => !chicken.isStaked)
  }

  const canRaid = () => {
    return nftData.coyotes.some(coyote => coyote.cooldown === 0)
  }

  return {
    ...nftData,
    isLoading,
    error,
    // Helper functions
    getTotalYieldRate,
    getStakedChickens,
    getAvailableChickens,
    canRaid,
    // Refresh function
    refresh: () => checkNFTOwnership(address)
  }
}