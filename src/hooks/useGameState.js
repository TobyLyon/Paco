import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export default function useGameState() {
  const [gameState, setGameState] = useState({
    // Player data
    playerAddress: null,
    isInitialized: false,
    
    // Resources
    pacoBalance: 0,
    unclaimedYield: 0,
    
    // NFT data
    ownedChickens: [],
    ownedCoyotes: [],
    ownedCoops: [],
    
    // Game stats
    stakedChickens: 0,
    totalYieldRate: 0,
    lastYieldClaim: null,
    lastRaidTime: null,
    
    // Raid data
    raidHistory: [],
    totalRaidsReceived: 0,
    totalRaidsInitiated: 0,
    
    // Achievement data
    achievements: [],
    totalEarned: 0,
    
    // Settings
    soundEnabled: true,
    autoCollect: false
  })

  // Initialize game state for a player
  const initializeGame = useCallback(async (playerAddress) => {
    if (!playerAddress) return

    console.log('🎮 Initializing game for:', playerAddress)

    try {
      // Load saved game data from localStorage
      const savedData = loadGameData(playerAddress)
      
      // Merge with default state
      setGameState(prevState => ({
        ...prevState,
        ...savedData,
        playerAddress,
        isInitialized: true,
        lastYieldClaim: savedData.lastYieldClaim || Date.now()
      }))

      // Start yield accumulation
      startYieldTimer()
      
      toast.success('🐔 Welcome to Paco\'s Farm!')
      
    } catch (error) {
      console.error('Error initializing game:', error)
      toast.error('Failed to load game data')
    }
  }, [])

  // Save game data to localStorage
  const saveGameData = useCallback((data) => {
    if (!data.playerAddress) return
    
    try {
      const saveData = {
        ...data,
        lastSaved: Date.now()
      }
      
      localStorage.setItem(`paco-game-${data.playerAddress}`, JSON.stringify(saveData))
    } catch (error) {
      console.error('Error saving game data:', error)
    }
  }, [])

  // Load game data from localStorage
  const loadGameData = (playerAddress) => {
    try {
      const saved = localStorage.getItem(`paco-game-${playerAddress}`)
      if (saved) {
        const data = JSON.parse(saved)
        console.log('📁 Loaded saved game data:', data)
        return data
      }
    } catch (error) {
      console.error('Error loading game data:', error)
    }
    
    // Return default state if no saved data
    return {
      pacoBalance: 100, // Starting bonus
      stakedChickens: 0,
      totalYieldRate: 0,
      achievements: [],
      raidHistory: []
    }
  }

  // Start the yield accumulation timer
  const startYieldTimer = useCallback(() => {
    const interval = setInterval(() => {
      setGameState(prevState => {
        if (!prevState.isInitialized || prevState.totalYieldRate === 0) {
          return prevState
        }

        const now = Date.now()
        const timeDiff = now - (prevState.lastYieldClaim || now)
        const hoursElapsed = timeDiff / (1000 * 60 * 60)
        const yieldToAdd = prevState.totalYieldRate * hoursElapsed

        if (yieldToAdd > 0.01) { // Only update if meaningful yield
          const newState = {
            ...prevState,
            unclaimedYield: prevState.unclaimedYield + yieldToAdd,
            lastYieldClaim: now
          }
          
          // Auto-save every yield update
          saveGameData(newState)
          
          return newState
        }
        
        return prevState
      })
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [saveGameData])

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

        // Check for coyote raid risk
        const raidRisk = Math.random() < 0.1 // 10% chance
        let finalAmount = claimed
        
        if (raidRisk) {
          const stolenAmount = claimed * 0.2 // Coyotes steal 20%
          finalAmount = claimed - stolenAmount
          
          toast.error(`🐺 Coyote raid! ${stolenAmount.toFixed(1)} PACO stolen!`)
          
          // Add to raid history
          const raidEvent = {
            type: 'received',
            amount: stolenAmount,
            timestamp: Date.now()
          }
          
          const newState = {
            ...prevState,
            pacoBalance: prevState.pacoBalance + finalAmount,
            unclaimedYield: 0,
            totalEarned: prevState.totalEarned + finalAmount,
            raidHistory: [...prevState.raidHistory, raidEvent],
            totalRaidsReceived: prevState.totalRaidsReceived + 1,
            lastRaidTime: Date.now()
          }
          
          saveGameData(newState)
          return newState
        }

        toast.success(`🌽 Claimed ${finalAmount.toFixed(1)} PACO!`)
        
        const newState = {
          ...prevState,
          pacoBalance: prevState.pacoBalance + finalAmount,
          unclaimedYield: 0,
          totalEarned: prevState.totalEarned + finalAmount
        }
        
        saveGameData(newState)
        return newState
      })
    }, [saveGameData]),

    // Stake a chicken
    stakeChicken: useCallback((chickenId) => {
      setGameState(prevState => {
        const chicken = prevState.ownedChickens.find(c => c.id === chickenId)
        if (!chicken || chicken.isStaked) return prevState

        const updatedChickens = prevState.ownedChickens.map(c =>
          c.id === chickenId ? { ...c, isStaked: true } : c
        )

        const newState = {
          ...prevState,
          ownedChickens: updatedChickens,
          stakedChickens: prevState.stakedChickens + 1,
          totalYieldRate: prevState.totalYieldRate + chicken.yieldRate
        }
        
        toast.success(`🐔 Staked ${chicken.tier} chicken!`)
        saveGameData(newState)
        return newState
      })
    }, [saveGameData]),

    // Unstake a chicken
    unstakeChicken: useCallback((chickenId) => {
      setGameState(prevState => {
        const chicken = prevState.ownedChickens.find(c => c.id === chickenId)
        if (!chicken || !chicken.isStaked) return prevState

        const updatedChickens = prevState.ownedChickens.map(c =>
          c.id === chickenId ? { ...c, isStaked: false } : c
        )

        const newState = {
          ...prevState,
          ownedChickens: updatedChickens,
          stakedChickens: prevState.stakedChickens - 1,
          totalYieldRate: prevState.totalYieldRate - chicken.yieldRate
        }
        
        toast.success(`🐔 Unstaked ${chicken.tier} chicken!`)
        saveGameData(newState)
        return newState
      })
    }, [saveGameData]),

    // Initiate a coyote raid
    initiateRaid: useCallback((coyoteId, targetAddress) => {
      setGameState(prevState => {
        const coyote = prevState.ownedCoyotes.find(c => c.id === coyoteId)
        if (!coyote || coyote.cooldown > 0) return prevState

        // Simulate raid success
        const success = Math.random() < 0.6 // 60% success rate
        const raidAmount = success ? Math.random() * 100 + 50 : 0

        const updatedCoyotes = prevState.ownedCoyotes.map(c =>
          c.id === coyoteId ? { ...c, cooldown: 3600000 } : c // 1 hour cooldown
        )

        const raidEvent = {
          type: 'initiated',
          success,
          amount: raidAmount,
          target: targetAddress,
          timestamp: Date.now()
        }

        const newState = {
          ...prevState,
          ownedCoyotes: updatedCoyotes,
          pacoBalance: prevState.pacoBalance + raidAmount,
          raidHistory: [...prevState.raidHistory, raidEvent],
          totalRaidsInitiated: prevState.totalRaidsInitiated + 1
        }

        if (success) {
          toast.success(`🐺 Raid successful! Stole ${raidAmount.toFixed(1)} PACO!`)
        } else {
          toast.error('🐺 Raid failed!')
        }
        
        saveGameData(newState)
        return newState
      })
    }, [saveGameData]),

    // Update NFT data
    updateNFTs: useCallback((nftData) => {
      setGameState(prevState => {
        const newState = {
          ...prevState,
          ownedChickens: nftData.chickens || prevState.ownedChickens,
          ownedCoyotes: nftData.coyotes || prevState.ownedCoyotes,
          ownedCoops: nftData.coops || prevState.ownedCoops
        }
        
        saveGameData(newState)
        return newState
      })
    }, [saveGameData]),

    // Reset game (for testing)
    resetGame: useCallback(() => {
      if (gameState.playerAddress) {
        localStorage.removeItem(`paco-game-${gameState.playerAddress}`)
        toast.success('Game reset!')
        window.location.reload()
      }
    }, [gameState.playerAddress])
  }

  // Auto-save game state periodically
  useEffect(() => {
    if (gameState.isInitialized) {
      const saveInterval = setInterval(() => {
        saveGameData(gameState)
      }, 30000) // Save every 30 seconds

      return () => clearInterval(saveInterval)
    }
  }, [gameState, saveGameData])

  // Start yield timer when game initializes
  useEffect(() => {
    if (gameState.isInitialized) {
      return startYieldTimer()
    }
  }, [gameState.isInitialized, startYieldTimer])

  return {
    gameState,
    initializeGame,
    actions
  }
}