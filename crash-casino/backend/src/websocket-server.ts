/**
 * 🔌 PacoRocko WebSocket Server
 * 
 * Handles real-time communication between clients and the crash game engine
 * Manages player connections, bet placement, and multiplier updates
 */

import { Server as SocketServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import CrashGameEngine, { GameRound, PlayerBet } from './game-engine'

export interface ClientMessage {
  type: 'placeBet' | 'cashOut' | 'subscribe' | 'unsubscribe' | 'authenticate'
  data: any
}

export interface ServerMessage {
  type: 'gameState' | 'multiplierUpdate' | 'roundStarted' | 'roundCrashed' | 
        'betPlaced' | 'cashOutSuccess' | 'error' | 'authenticated'
  data: any
  timestamp: number
}

export interface ConnectedPlayer {
  id: string
  socketId: string
  walletAddress?: string
  isAuthenticated: boolean
  lastActivity: number
}

export class CrashWebSocketServer {
  private io: SocketServer
  private gameEngine: CrashGameEngine
  private connectedPlayers: Map<string, ConnectedPlayer> = new Map()
  private socketToPlayer: Map<string, string> = new Map()
  private jwtSecret: string

  constructor(server: HttpServer, jwtSecret: string) {
    this.jwtSecret = jwtSecret
    this.io = new SocketServer(server, {
      cors: {
        origin: "*", // Configure for production
        methods: ["GET", "POST"]
      },
      path: '/crash-ws'
    })

    this.gameEngine = new CrashGameEngine()
    this.setupGameEngineListeners()
    this.setupSocketHandlers()
    
    console.log('🎰 Crash WebSocket server initialized')
  }

  /**
   * 🎮 Setup game engine event listeners
   */
  private setupGameEngineListeners(): void {
    this.gameEngine.on('roundCreated', (round: GameRound) => {
      this.broadcast('gameState', {
        status: 'pending',
        roundId: round.id,
        timeUntilStart: 5000 // 5 seconds
      })
    })

    this.gameEngine.on('roundStarted', (data) => {
      this.broadcast('roundStarted', {
        roundId: data.roundId,
        startTime: Date.now()
      })
    })

    this.gameEngine.on('multiplierUpdate', (data) => {
      this.broadcast('multiplierUpdate', {
        roundId: data.roundId,
        multiplier: data.multiplier,
        elapsed: data.elapsed
      })
    })

    this.gameEngine.on('roundCrashed', (data) => {
      this.broadcast('roundCrashed', {
        roundId: data.roundId,
        crashPoint: data.crashPoint,
        finalMultiplier: data.finalMultiplier,
        totalPayout: data.totalPayout
      })
    })

    this.gameEngine.on('betPlaced', (data) => {
      this.broadcast('betPlaced', {
        roundId: data.roundId,
        playerId: data.bet.playerId,
        amount: data.bet.amount,
        totalBets: data.totalBets,
        totalAmount: data.totalAmount
      })
    })

    this.gameEngine.on('playerCashedOut', (data) => {
      this.broadcast('playerCashedOut', {
        roundId: data.roundId,
        playerId: data.playerId,
        multiplier: data.multiplier,
        payout: data.payout
      })
    })

    this.gameEngine.on('readyForNewRound', () => {
      // Auto-start new round after cooldown
      setTimeout(() => {
        this.gameEngine.startNewRound()
      }, 2000)
    })
  }

  /**
   * 🔌 Setup socket connection handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔗 New connection: ${socket.id}`)
      
      // Create temporary player record
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const player: ConnectedPlayer = {
        id: playerId,
        socketId: socket.id,
        isAuthenticated: false,
        lastActivity: Date.now()
      }
      
      this.connectedPlayers.set(playerId, player)
      this.socketToPlayer.set(socket.id, playerId)

      // Send current game state
      const gameState = this.gameEngine.getGameState()
      this.sendToSocket(socket.id, 'gameState', {
        isRunning: gameState.isRunning,
        currentMultiplier: gameState.currentMultiplier,
        roundId: gameState.currentRound?.id,
        status: gameState.currentRound?.status,
        config: gameState.config
      })

      // Handle client messages
      socket.on('message', (message: ClientMessage) => {
        this.handleClientMessage(socket.id, message)
      })

      socket.on('authenticate', (data: { token: string, walletAddress: string }) => {
        this.handleAuthentication(socket.id, data)
      })

      socket.on('placeBet', (data: { amount: number, txHash?: string }) => {
        this.handlePlaceBet(socket.id, data)
      })

      socket.on('cashOut', () => {
        this.handleCashOut(socket.id)
      })

      socket.on('disconnect', () => {
        this.handleDisconnection(socket.id)
      })

      // Heartbeat to keep connection alive
      socket.on('ping', () => {
        socket.emit('pong')
        this.updatePlayerActivity(socket.id)
      })
    })

    // Start the first round
    setTimeout(() => {
      this.gameEngine.startNewRound()
    }, 3000)
  }

  /**
   * 🔐 Handle wallet authentication
   */
  private handleAuthentication(socketId: string, data: { token: string, walletAddress: string }): void {
    try {
      // Verify JWT token (in production, this would validate wallet signature)
      const decoded = jwt.verify(data.token, this.jwtSecret) as any
      
      const playerId = this.socketToPlayer.get(socketId)
      if (!playerId) return

      const player = this.connectedPlayers.get(playerId)
      if (!player) return

      player.walletAddress = data.walletAddress
      player.isAuthenticated = true
      player.lastActivity = Date.now()

      this.sendToSocket(socketId, 'authenticated', {
        success: true,
        playerId: player.id,
        walletAddress: player.walletAddress
      })

      console.log(`✅ Player authenticated: ${player.walletAddress}`)

    } catch (error) {
      this.sendToSocket(socketId, 'error', {
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      })
    }
  }

  /**
   * 💰 Handle bet placement
   */
  private handlePlaceBet(socketId: string, data: { amount: number, txHash?: string }): void {
    const playerId = this.socketToPlayer.get(socketId)
    if (!playerId) return

    const player = this.connectedPlayers.get(playerId)
    if (!player || !player.isAuthenticated || !player.walletAddress) {
      this.sendToSocket(socketId, 'error', {
        message: 'Must be authenticated to place bets',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    try {
      const bet = this.gameEngine.placeBet(
        player.id,
        player.walletAddress,
        data.amount,
        data.txHash
      )

      if (bet) {
        this.sendToSocket(socketId, 'betPlaced', {
          success: true,
          bet: {
            amount: bet.amount,
            timestamp: bet.timestamp
          }
        })
      }

    } catch (error) {
      this.sendToSocket(socketId, 'error', {
        message: error.message,
        code: 'BET_FAILED'
      })
    }
  }

  /**
   * 🏃‍♂️ Handle cash out
   */
  private handleCashOut(socketId: string): void {
    const playerId = this.socketToPlayer.get(socketId)
    if (!playerId) return

    const player = this.connectedPlayers.get(playerId)
    if (!player || !player.isAuthenticated) {
      this.sendToSocket(socketId, 'error', {
        message: 'Must be authenticated to cash out',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    const result = this.gameEngine.cashOut(player.id)
    
    if (result.success) {
      this.sendToSocket(socketId, 'cashOutSuccess', {
        multiplier: result.multiplier,
        payout: result.payout
      })
    } else {
      this.sendToSocket(socketId, 'error', {
        message: 'Cash out failed - no active bet or round ended',
        code: 'CASHOUT_FAILED'
      })
    }
  }

  /**
   * 📨 Handle generic client messages
   */
  private handleClientMessage(socketId: string, message: ClientMessage): void {
    this.updatePlayerActivity(socketId)

    switch (message.type) {
      case 'subscribe':
        // Client wants to receive game updates (already subscribed by default)
        this.sendToSocket(socketId, 'gameState', this.gameEngine.getGameState())
        break

      case 'unsubscribe':
        // Client wants to stop receiving updates (disconnect instead)
        break

      default:
        this.sendToSocket(socketId, 'error', {
          message: `Unknown message type: ${message.type}`,
          code: 'UNKNOWN_MESSAGE_TYPE'
        })
    }
  }

  /**
   * 🚪 Handle client disconnection
   */
  private handleDisconnection(socketId: string): void {
    const playerId = this.socketToPlayer.get(socketId)
    
    if (playerId) {
      const player = this.connectedPlayers.get(playerId)
      if (player) {
        console.log(`🚪 Player disconnected: ${player.walletAddress || player.id}`)
      }
      
      this.connectedPlayers.delete(playerId)
      this.socketToPlayer.delete(socketId)
    }
    
    console.log(`🔌 Connection closed: ${socketId}`)
  }

  /**
   * 📡 Send message to specific socket
   */
  private sendToSocket(socketId: string, type: string, data: any): void {
    const message: ServerMessage = {
      type: type as any,
      data,
      timestamp: Date.now()
    }
    
    this.io.to(socketId).emit('message', message)
  }

  /**
   * 📢 Broadcast message to all connected clients
   */
  private broadcast(type: string, data: any): void {
    const message: ServerMessage = {
      type: type as any,
      data,
      timestamp: Date.now()
    }
    
    this.io.emit('message', message)
  }

  /**
   * 💓 Update player activity timestamp
   */
  private updatePlayerActivity(socketId: string): void {
    const playerId = this.socketToPlayer.get(socketId)
    if (playerId) {
      const player = this.connectedPlayers.get(playerId)
      if (player) {
        player.lastActivity = Date.now()
      }
    }
  }

  /**
   * 🧹 Clean up inactive connections
   */
  public cleanupInactiveConnections(): void {
    const now = Date.now()
    const timeout = 5 * 60 * 1000 // 5 minutes

    for (const [playerId, player] of this.connectedPlayers) {
      if (now - player.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive player: ${player.id}`)
        
        // Disconnect the socket
        const socket = this.io.sockets.sockets.get(player.socketId)
        if (socket) {
          socket.disconnect(true)
        }
        
        // Remove from maps
        this.connectedPlayers.delete(playerId)
        this.socketToPlayer.delete(player.socketId)
      }
    }
  }

  /**
   * 📊 Get server statistics
   */
  public getStats(): {
    connectedPlayers: number,
    authenticatedPlayers: number,
    gameState: any
  } {
    const authenticated = Array.from(this.connectedPlayers.values())
      .filter(p => p.isAuthenticated).length

    return {
      connectedPlayers: this.connectedPlayers.size,
      authenticatedPlayers: authenticated,
      gameState: this.gameEngine.getGameState()
    }
  }

  /**
   * 🔧 Get game engine for admin operations
   */
  public getGameEngine(): CrashGameEngine {
    return this.gameEngine
  }
}

export default CrashWebSocketServer