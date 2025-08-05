import { useState, useCallback, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function useGameState() {
  const [gameState, setGameState] = useState({
    // Player data
    playerAddress: null,
    isInitialized: false,
    
    // Resources
    pacoBalance: 0,
    unclaimedYield: 0,
    
    // Game stats
    stakedChickens: 0,
    totalYieldRate: 0,
    lastYieldClaim: Date.now(),
    lastRaidTime: null,
    
    // Settings
    soundEnabled: true,
  })

  // Initialize game state for a player
  const initializeGame = useCallback(async (playerAddress) => {
    if (!playerAddress) return

    console.log('🎮 Initializing game for:', playerAddress)

    try {
      setGameState(prevState => ({
        ...prevState,
        playerAddress,
        isInitialized: true,
        pacoBalance: 100, // Starting bonus
        lastYieldClaim: Date.now()
      }))

      toast.success('🐔 Welcome to Paco\'s Farm!')
      
    } catch (error) {
      console.error('Error initializing game:', error)
      toast.error('Failed to load game data')
    }
  }, [])

  // Game actions
  const actions = {
    // Claim accumulated yield
    claimYield: useCallback(() => {
      setGameState(prevState => {
        const claimed = prevState.unclaimedYield
        
        if (claimed <= 0) {
          toast.error('No yield to claim!')
          return prevState
        }

        toast.success(`🌽 Claimed ${claimed.toFixed(1)} PACO!`)
        
        return {
          ...prevState,
          pacoBalance: prevState.pacoBalance + claimed,
          unclaimedYield: 0,
        }
      })
    }, []),

    // Reset game (for testing)
    resetGame: useCallback(() => {
      if (gameState.playerAddress) {
        toast.success('Game reset!')
        window.location.reload()
      }
    }, [gameState.playerAddress])
  }

  // Simulate yield accumulation
  useEffect(() => {
    if (!gameState.isInitialized || gameState.totalYieldRate === 0) return

    const interval = setInterval(() => {
      setGameState(prevState => {
        const yieldToAdd = prevState.totalYieldRate * 0.01 // Small increment
        return {
          ...prevState,
          unclaimedYield: prevState.unclaimedYield + yieldToAdd
        }
      })
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [gameState.isInitialized, gameState.totalYieldRate])

  return {
    gameState,
    initializeGame,
    actions
  }
}