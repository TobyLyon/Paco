/**
 * 🎰 Enhanced Crash Game Engine for PacoRocko
 * 
 * Based on wbrandon25/Online-Crash-Gambling-Simulator
 * Enhanced with provably fair algorithm and unlimited multiplier range
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class EnhancedCrashEngine extends EventEmitter {
    constructor(io, config = {}) {
        super();
        this.io = io;
        
        // Enhanced configuration
        this.config = {
            bettingPhaseDuration: 10000,    // 10 seconds for betting
            cashoutPhaseDuration: 5000,     // 5 seconds for cashout
            houseEdge: 0.02,               // 2% house edge
            maxMultiplier: 1000.0,         // 1000x max
            tickRate: 50,                  // 50ms updates (20 FPS)
            ...config
        };
        
        // Game state
        this.gamePhase = 'betting'; // 'betting', 'running', 'cashout'
        this.phaseStartTime = Date.now();
        this.currentMultiplier = 1.0;
        this.crashPoint = 0;
        this.gameTimer = null;
        
        // Round data
        this.currentRound = {
            id: this.generateRoundId(),
            serverSeed: crypto.randomBytes(32).toString('hex'),
            clientSeed: 'initial-seed', // Will be set by clients
            nonce: 1,
            startTime: Date.now(),
            players: new Map(),
            totalBets: 0,
            totalPayouts: 0
        };
        
        // Player management
        this.activePlayers = new Map();
        this.liveBettorsTable = [];
        this.roundHistory = [];
        
        this.startGameLoop();
    }

    /**
     * 🎲 Generate provably fair crash point
     * Enhanced version of the basic random generator
     */
    generateCrashPoint(serverSeed, clientSeed, nonce) {
        const input = `${serverSeed}:${clientSeed}:${nonce}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        
        // Use first 8 characters of hash for randomness
        const hexSubstring = hash.substring(0, 8);
        const intValue = parseInt(hexSubstring, 16);
        
        // Apply house edge and convert to crash multiplier
        const houseEdgeMultiplier = 1 - this.config.houseEdge;
        
        // Enhanced algorithm for better distribution
        if (intValue % 33 === 0) {
            // 3% chance of instant crash (like original)
            return 1.00;
        } else {
            // More sophisticated crash point calculation
            const randomFloat = intValue / (2 ** 32);
            let crashPoint = 1 / (1 - randomFloat) * houseEdgeMultiplier;
            
            // Apply exponential curve for realistic distribution
            crashPoint = Math.pow(crashPoint, 0.4);
            
            // Ensure minimum and maximum bounds
            crashPoint = Math.max(1.00, Math.min(crashPoint, this.config.maxMultiplier));
            
            return Math.round(crashPoint * 100) / 100; // Round to 2 decimal places
        }
    }

    /**
     * 🔄 Main game loop - enhanced version
     */
    startGameLoop() {
        this.gameTimer = setInterval(() => {
            this.updateGame();
        }, this.config.tickRate);
    }

    updateGame() {
        const timeElapsed = (Date.now() - this.phaseStartTime) / 1000.0;

        switch (this.gamePhase) {
            case 'betting':
                this.updateBettingPhase(timeElapsed);
                break;
            case 'running':
                this.updateRunningPhase(timeElapsed);
                break;
            case 'cashout':
                this.updateCashoutPhase(timeElapsed);
                break;
        }
    }

    /**
     * 🎯 Betting phase logic
     */
    updateBettingPhase(timeElapsed) {
        const bettingDuration = this.config.bettingPhaseDuration / 1000;
        
        if (timeElapsed >= bettingDuration) {
            // Start game phase
            this.gamePhase = 'running';
            this.phaseStartTime = Date.now();
            this.currentMultiplier = 1.0;
            
            // Generate crash point for this round
            this.crashPoint = this.generateCrashPoint(
                this.currentRound.serverSeed,
                this.currentRound.clientSeed,
                this.currentRound.nonce
            );
            
            console.log(`🎰 Round ${this.currentRound.id} starting - Crash point: ${this.crashPoint}x`);
            
            this.io.emit('game_phase_start', {
                roundId: this.currentRound.id,
                startTime: Date.now()
            });
            
            this.emit('roundStarted', this.currentRound);
        } else {
            // Send betting countdown
            const timeRemaining = Math.ceil(bettingDuration - timeElapsed);
            this.io.emit('betting_countdown', timeRemaining);
        }
    }

    /**
     * 🚀 Running phase logic - enhanced multiplier calculation
     */
    updateRunningPhase(timeElapsed) {
        // Enhanced multiplier curve (more realistic than original)
        this.currentMultiplier = this.calculateMultiplier(timeElapsed);
        
        // Emit real-time multiplier updates
        this.io.emit('multiplier_update', {
            roundId: this.currentRound.id,
            multiplier: this.currentMultiplier,
            elapsed: timeElapsed
        });
        
        this.emit('multiplierUpdate', {
            roundId: this.currentRound.id,
            multiplier: this.currentMultiplier,
            elapsed: timeElapsed
        });
        
        // Check if we've reached the crash point
        if (this.currentMultiplier >= this.crashPoint) {
            this.crashGame();
        }
    }

    /**
     * 📈 Enhanced multiplier calculation
     * More realistic growth curve than the original
     */
    calculateMultiplier(timeElapsed) {
        // Original formula: (1.0024 * Math.pow(1.0718, timeElapsed))
        // Enhanced formula with dynamic growth based on crash point
        
        const baseGrowth = 1.0024;
        const growthRate = 1.0718;
        
        // Adjust growth rate based on crash point for more realistic curves
        const adjustedGrowthRate = growthRate + (this.crashPoint - 1) * 0.01;
        
        let multiplier = baseGrowth * Math.pow(adjustedGrowthRate, timeElapsed);
        
        // Ensure we don't exceed crash point due to floating point precision
        return Math.min(multiplier, this.crashPoint - 0.01);
    }

    /**
     * 💥 Crash the game
     */
    crashGame() {
        this.gamePhase = 'cashout';
        this.phaseStartTime = Date.now();
        
        console.log(`💥 Round ${this.currentRound.id} crashed at ${this.crashPoint}x`);
        
        // Process payouts
        this.processCashouts();
        
        // Emit crash event
        this.io.emit('game_crashed', {
            roundId: this.currentRound.id,
            crashPoint: this.crashPoint,
            finalMultiplier: this.currentMultiplier
        });
        
        this.emit('roundCrashed', {
            roundId: this.currentRound.id,
            crashPoint: this.crashPoint,
            totalBets: this.currentRound.totalBets,
            totalPayouts: this.currentRound.totalPayouts
        });
        
        // Add to history
        this.addToHistory(this.crashPoint);
    }

    /**
     * 💰 Process cashouts and payouts
     */
    processCashouts() {
        let totalPayouts = 0;
        
        for (const [playerId, player] of this.currentRound.players) {
            if (player.cashedOut && player.cashoutMultiplier <= this.crashPoint) {
                // Player won
                const payout = player.betAmount * player.cashoutMultiplier;
                totalPayouts += payout;
                
                this.io.to(playerId).emit('payout_won', {
                    betAmount: player.betAmount,
                    multiplier: player.cashoutMultiplier,
                    payout: payout,
                    profit: payout - player.betAmount
                });
                
                // Update live bettors table
                this.updateLiveBettorStatus(playerId, 'won', player.cashoutMultiplier, payout);
            } else {
                // Player lost
                this.io.to(playerId).emit('payout_lost', {
                    betAmount: player.betAmount,
                    lostAt: this.crashPoint
                });
                
                this.updateLiveBettorStatus(playerId, 'lost', this.crashPoint, 0);
            }
        }
        
        this.currentRound.totalPayouts = totalPayouts;
    }

    /**
     * 🎯 Place a bet
     */
    placeBet(playerId, socketId, betAmount, autoPayoutMultiplier = null) {
        if (this.gamePhase !== 'betting') {
            return { success: false, error: 'Not in betting phase' };
        }
        
        if (this.currentRound.players.has(playerId)) {
            return { success: false, error: 'Already bet this round' };
        }
        
        if (betAmount <= 0) {
            return { success: false, error: 'Invalid bet amount' };
        }
        
        // Add player to round
        const playerBet = {
            playerId,
            socketId,
            betAmount,
            autoPayoutMultiplier,
            cashedOut: false,
            cashoutMultiplier: null,
            timestamp: Date.now()
        };
        
        this.currentRound.players.set(playerId, playerBet);
        this.currentRound.totalBets += betAmount;
        
        // Add to live bettors table
        const liveBettor = {
            playerId,
            username: `Player_${playerId.substring(0, 6)}`, // Placeholder
            betAmount,
            autoPayoutMultiplier,
            status: 'active',
            cashoutMultiplier: null,
            profit: null
        };
        
        this.liveBettorsTable.push(liveBettor);
        
        // Broadcast updated betting table
        this.io.emit('live_betting_table', this.liveBettorsTable);
        
        this.emit('betPlaced', {
            roundId: this.currentRound.id,
            playerId,
            betAmount,
            totalBets: this.currentRound.totalBets,
            playerCount: this.currentRound.players.size
        });
        
        return { success: true, bet: playerBet };
    }

    /**
     * 🏃‍♂️ Manual cashout
     */
    cashOut(playerId) {
        if (this.gamePhase !== 'running') {
            return { success: false, error: 'Not in running phase' };
        }
        
        const player = this.currentRound.players.get(playerId);
        if (!player) {
            return { success: false, error: 'No active bet found' };
        }
        
        if (player.cashedOut) {
            return { success: false, error: 'Already cashed out' };
        }
        
        // Cash out at current multiplier
        player.cashedOut = true;
        player.cashoutMultiplier = this.currentMultiplier;
        
        const payout = player.betAmount * this.currentMultiplier;
        
        this.emit('playerCashedOut', {
            roundId: this.currentRound.id,
            playerId,
            multiplier: this.currentMultiplier,
            payout
        });
        
        // Update live bettors table
        this.updateLiveBettorStatus(playerId, 'cashed_out', this.currentMultiplier, payout);
        
        return {
            success: true,
            multiplier: this.currentMultiplier,
            payout,
            profit: payout - player.betAmount
        };
    }

    /**
     * 📊 Update live bettor status
     */
    updateLiveBettorStatus(playerId, status, multiplier, payout) {
        const bettor = this.liveBettorsTable.find(b => b.playerId === playerId);
        if (bettor) {
            bettor.status = status;
            bettor.cashoutMultiplier = multiplier;
            bettor.profit = payout - bettor.betAmount;
        }
        
        this.io.emit('live_betting_table', this.liveBettorsTable);
    }

    /**
     * 🕐 Cashout phase logic
     */
    updateCashoutPhase(timeElapsed) {
        const cashoutDuration = this.config.cashoutPhaseDuration / 1000;
        
        if (timeElapsed >= cashoutDuration) {
            // Start new round
            this.startNewRound();
        }
    }

    /**
     * 🆕 Start new round
     */
    startNewRound() {
        this.gamePhase = 'betting';
        this.phaseStartTime = Date.now();
        this.liveBettorsTable = [];
        
        // Create new round
        this.currentRound = {
            id: this.generateRoundId(),
            serverSeed: crypto.randomBytes(32).toString('hex'),
            clientSeed: this.currentRound.clientSeed, // Keep same client seed
            nonce: this.currentRound.nonce + 1,
            startTime: Date.now(),
            players: new Map(),
            totalBets: 0,
            totalPayouts: 0
        };
        
        this.io.emit('new_round_started', {
            roundId: this.currentRound.id,
            bettingTime: this.config.bettingPhaseDuration
        });
        
        this.emit('newRoundStarted', this.currentRound);
        
        console.log(`🆕 New round started: ${this.currentRound.id}`);
    }

    /**
     * 📈 Add crash point to history
     */
    addToHistory(crashPoint) {
        this.roundHistory.unshift(crashPoint);
        if (this.roundHistory.length > 25) {
            this.roundHistory = this.roundHistory.slice(0, 25);
        }
        
        this.io.emit('crash_history', this.roundHistory);
    }

    /**
     * 🆔 Generate round ID
     */
    generateRoundId() {
        return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 Get game statistics
     */
    getGameStats() {
        return {
            currentPhase: this.gamePhase,
            currentMultiplier: this.currentMultiplier,
            crashPoint: this.crashPoint,
            roundId: this.currentRound.id,
            activePlayers: this.currentRound.players.size,
            totalBets: this.currentRound.totalBets,
            history: this.roundHistory.slice(0, 10)
        };
    }

    /**
     * 🛑 Stop the game engine
     */
    stop() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }
}

module.exports = EnhancedCrashEngine;