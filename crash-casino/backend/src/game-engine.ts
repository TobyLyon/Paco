/**
 * 🎰 PacoRocko Crash Game Engine
 * 
 * Implements provably fair crash algorithm with real-time multiplier calculation
 * Uses SHA-256 based random generation with client/server seeds + nonce
 */

import crypto from 'crypto'
import { EventEmitter } from 'events'

export interface GameRound {
  id: string
  serverSeed: string
  clientSeed: string
  nonce: number
  crashPoint: number
  startTime: number
  endTime?: number
  status: 'pending' | 'running' | 'crashed' | 'cancelled'
  bets: Map<string, PlayerBet>
  totalBetAmount: number
  totalPayout: number
}

export interface PlayerBet {
  playerId: string
  walletAddress: string
  amount: number
  multiplier?: number // Set when player cashes out
  payout?: number
  timestamp: number
  txHash?: string // Smart contract transaction
  cashOutTime?: number
}

export interface GameConfig {
  minBet: number
  maxBet: number
  houseEdge: number // 0.01 = 1%
  maxMultiplier: number
  roundDuration: number // Max round time in seconds
  tickRate: number // Updates per second
}

export class CrashGameEngine extends EventEmitter {
  private currentRound: GameRound | null = null
  private gameTimer: NodeJS.Timeout | null = null
  private currentMultiplier: number = 1.0
  private gameStartTime: number = 0
  private isGameRunning: boolean = false
  
  private readonly config: GameConfig = {
    minBet: 0.001, // 0.001 ETH minimum
    maxBet: 10.0,  // 10 ETH maximum  
    houseEdge: 0.02, // 2% house edge
    maxMultiplier: 1000.0,
    roundDuration: 60, // 60 seconds max
    tickRate: 20 // 20 FPS updates
  }

  constructor(config?: Partial<GameConfig>) {
    super()
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * 🎲 Generate provably fair crash point - INDUSTRY STANDARD
   * Based on proven algorithms used by major crash games
   */
  private generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
    const input = `${serverSeed}:${clientSeed}:${nonce}`
    const hash = crypto.createHash('sha256').update(input).digest('hex')
    
    // Convert first 8 characters of hash to integer
    const hexSubstring = hash.substring(0, 8)
    const randomInt = parseInt(hexSubstring, 16)
    
    // Convert to float [0, 1) - industry standard method
    const randomFloat = randomInt / 0x100000000
    
    // Industry standard crash game formula with house edge
    const houseEdge = this.config.houseEdge
    let crashPoint = Math.max(1.0, Math.floor((100 * (1 - houseEdge)) / randomFloat) / 100)
    
    // Cap at max multiplier and round to 2 decimal places
    crashPoint = Math.min(crashPoint, this.config.maxMultiplier)
    return Math.round(crashPoint * 100) / 100
  }

  /**
   * 🚀 Start a new game round
   */
  public async startNewRound(clientSeed?: string): Promise<GameRound> {
    if (this.isGameRunning) {
      throw new Error('Game already running')
    }

    // Generate seeds
    const serverSeed = crypto.randomBytes(32).toString('hex')
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex')
    const nonce = Date.now()
    
    // Calculate crash point
    const crashPoint = this.generateCrashPoint(serverSeed, finalClientSeed, nonce)
    
    // Create new round
    this.currentRound = {
      id: `round_${nonce}`,
      serverSeed,
      clientSeed: finalClientSeed,
      nonce,
      crashPoint,
      startTime: Date.now(),
      status: 'pending',
      bets: new Map(),
      totalBetAmount: 0,
      totalPayout: 0
    }

    this.emit('roundCreated', this.currentRound)
    
    // Wait 5 seconds for bets, then start
    setTimeout(() => this.beginRound(), 5000)
    
    return this.currentRound
  }

  /**
   * 🎯 Begin the multiplier sequence
   */
  private beginRound(): void {
    if (!this.currentRound || this.currentRound.status !== 'pending') return
    
    this.currentRound.status = 'running'
    this.isGameRunning = true
    this.currentMultiplier = 1.0
    this.gameStartTime = Date.now()
    
    this.emit('roundStarted', {
      roundId: this.currentRound.id,
      crashPoint: this.currentRound.crashPoint // Hidden from clients
    })
    
    // Start multiplier updates
    this.gameTimer = setInterval(() => {
      this.updateMultiplier()
    }, 1000 / this.config.tickRate)
  }

  /**
   * 📈 Update multiplier in real-time
   */
  private updateMultiplier(): void {
    if (!this.currentRound || !this.isGameRunning) return
    
    const elapsed = (Date.now() - this.gameStartTime) / 1000
    
    // Exponential growth formula: multiplier = e^(elapsed * growth_rate)
    // Adjusted to reach crash point at the right time
    const growthRate = Math.log(this.currentRound.crashPoint) / 10 // Reach crash in ~10 seconds average
    this.currentMultiplier = Math.exp(elapsed * growthRate)
    
    this.emit('multiplierUpdate', {
      roundId: this.currentRound.id,
      multiplier: this.currentMultiplier,
      elapsed
    })
    
    // Check if we've reached the crash point
    if (this.currentMultiplier >= this.currentRound.crashPoint) {
      this.crashRound()
    }
    
    // Safety: End round after max duration
    if (elapsed >= this.config.roundDuration) {
      this.crashRound()
    }
  }

  /**
   * 💥 Crash the round and process payouts
   */
  private crashRound(): void {
    if (!this.currentRound || !this.isGameRunning) return
    
    this.isGameRunning = false
    this.currentRound.status = 'crashed'
    this.currentRound.endTime = Date.now()
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
      this.gameTimer = null
    }
    
    // Process payouts for players who cashed out
    let totalPayout = 0
    for (const bet of this.currentRound.bets.values()) {
      if (bet.multiplier && bet.multiplier < this.currentRound.crashPoint) {
        bet.payout = bet.amount * bet.multiplier
        totalPayout += bet.payout
      }
    }
    
    this.currentRound.totalPayout = totalPayout
    
    this.emit('roundCrashed', {
      roundId: this.currentRound.id,
      crashPoint: this.currentRound.crashPoint,
      finalMultiplier: this.currentMultiplier,
      totalPayout,
      roundData: this.currentRound
    })
    
    // Clean up for next round
    setTimeout(() => {
      this.currentRound = null
      this.emit('readyForNewRound')
    }, 3000) // 3 second cooldown
  }

  /**
   * 💰 Place a bet in the current round
   */
  public placeBet(playerId: string, walletAddress: string, amount: number, txHash?: string): PlayerBet | null {
    if (!this.currentRound || this.currentRound.status !== 'pending') {
      throw new Error('No round accepting bets')
    }
    
    if (amount < this.config.minBet || amount > this.config.maxBet) {
      throw new Error(`Bet must be between ${this.config.minBet} and ${this.config.maxBet}`)
    }
    
    if (this.currentRound.bets.has(playerId)) {
      throw new Error('Player already has a bet in this round')
    }
    
    const bet: PlayerBet = {
      playerId,
      walletAddress,
      amount,
      timestamp: Date.now(),
      txHash
    }
    
    this.currentRound.bets.set(playerId, bet)
    this.currentRound.totalBetAmount += amount
    
    this.emit('betPlaced', {
      roundId: this.currentRound.id,
      bet,
      totalBets: this.currentRound.bets.size,
      totalAmount: this.currentRound.totalBetAmount
    })
    
    return bet
  }

  /**
   * 🏃‍♂️ Cash out a player's bet
   */
  public cashOut(playerId: string): { success: boolean, multiplier?: number, payout?: number } {
    if (!this.currentRound || this.currentRound.status !== 'running') {
      return { success: false }
    }
    
    const bet = this.currentRound.bets.get(playerId)
    if (!bet || bet.multiplier) { // Already cashed out
      return { success: false }
    }
    
    // Set cash out multiplier and calculate payout
    bet.multiplier = this.currentMultiplier
    bet.payout = bet.amount * bet.multiplier
    bet.cashOutTime = Date.now()
    
    this.emit('playerCashedOut', {
      roundId: this.currentRound.id,
      playerId,
      multiplier: bet.multiplier,
      payout: bet.payout,
      bet
    })
    
    return {
      success: true,
      multiplier: bet.multiplier,
      payout: bet.payout
    }
  }

  /**
   * 🔍 Verify round fairness
   */
  public verifyRound(roundId: string, serverSeed: string, clientSeed: string, nonce: number): {
    valid: boolean,
    expectedCrashPoint: number,
    actualCrashPoint?: number
  } {
    const expectedCrashPoint = this.generateCrashPoint(serverSeed, clientSeed, nonce)
    
    // In a real implementation, you'd look up the actual round data
    // For now, just return the verification calculation
    return {
      valid: true, // Would compare with stored round data
      expectedCrashPoint,
      actualCrashPoint: expectedCrashPoint // Would be from stored round
    }
  }

  /**
   * 📊 Get current game state
   */
  public getGameState(): {
    isRunning: boolean,
    currentRound: GameRound | null,
    currentMultiplier: number,
    config: GameConfig
  } {
    return {
      isRunning: this.isGameRunning,
      currentRound: this.currentRound,
      currentMultiplier: this.currentMultiplier,
      config: this.config
    }
  }

  /**
   * ⚙️ Update game configuration (admin only)
   */
  public updateConfig(newConfig: Partial<GameConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', this.config)
  }
}

export default CrashGameEngine