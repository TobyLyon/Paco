/**
 * 🎰 Proven Crash Game Engine
 * 
 * Based on wbrandon25/Online-Crash-Gambling-Simulator
 * This is a battle-tested, working implementation that we know works.
 * 
 * Key Features:
 * - 3-phase game loop (betting, game, cashout) 
 * - Proven algorithm: (1.0024 * Math.pow(1.0718, time_elapsed))
 * - Real-time socket events
 * - Proper timing and state management
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class ProvenCrashEngine extends EventEmitter {
    constructor(io, config = {}) {
        super();
        this.io = io;
        
        // Configuration matching proven implementation
        this.config = {
            bettingPhaseDuration: 6000,    // 6 seconds betting (from reference)
            cashoutPhaseDuration: 3000,    // 3 seconds cashout phase
            ...config
        };
        
        // Game state variables (from reference implementation)
        this.betting_phase = false;
        this.game_phase = false;
        this.cashout_phase = true;
        this.game_crash_value = -69;
        this.sent_cashout = true;
        this.phase_start_time = Date.now();
        
        // Player and round management
        this.live_bettors_table = [];
        this.active_player_id_list = [];
        this.previous_crashes = [];
        this.round_id_list = [1];
        this.current_round_id = 1;
        this.round_counter = 1; // For generating unique string IDs
        
        // Countdown synchronization
        this.lastCountdownSecond = -1;
        
        // Start the proven game loop
        this.startGameLoop();
        
        console.log('🎰 Proven Crash Engine initialized and running');
    }
    
    /**
     * 🔄 Main game loop - exact copy from working implementation
     * This is the core that makes the game work reliably
     */
    startGameLoop() {
        // Run the main game loop every second (from reference)
        this.gameLoopInterval = setInterval(async () => {
            await this.loopUpdate();
        }, 1000);
        
        // SIMPLIFIED: No more frequent multiplier updates - client handles smooth display
        // Server only manages game logic and sends start/stop events
        console.log('🎯 SIMPLIFIED SERVER: Client handles smooth multiplier, server only start/stop/crash');
    }
    
    /**
     * 🎮 Game loop update - proven logic from working implementation
     */
    async loopUpdate() {
        let time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        
        if (this.betting_phase) {
            // Betting phase - 6 seconds with real-time countdown
            const remaining = Math.max(0, 6 - time_elapsed);
            
            // Emit countdown updates every second for perfect sync
            if (Math.floor(remaining) !== this.lastCountdownSecond) {
                this.lastCountdownSecond = Math.floor(remaining);
                this.io.emit('betting_countdown', {
                    remaining: Math.ceil(remaining),
                    phase: 'betting'
                });
                console.log(`⏰ Betting countdown: ${Math.ceil(remaining)}s remaining`);
            }
            
            if (time_elapsed > 6) {
                this.sent_cashout = false;
                this.betting_phase = false;
                this.game_phase = true;
                
                // Start the multiplier count
                this.io.emit('start_multiplier_count');
                this.emit('roundStarted', {
                    roundId: this.current_round_id,
                    startTime: Date.now(),
                    crashPoint: this.game_crash_value // Send for client prediction
                });
                
                this.phase_start_time = Date.now();
                console.log(`🚀 Game phase started - Crash Point: ${this.game_crash_value.toFixed(2)}x`);
            }
        } 
        else if (this.game_phase) {
            // Game phase - multiplier counting up  
            let current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
            
            // Check if we've reached the crash point (main logic runs every second)
            if (current_multiplier >= this.game_crash_value) {
                this.io.emit('stop_multiplier_count', this.game_crash_value.toFixed(2));
                this.emit('roundCrashed', {
                    roundId: this.current_round_id,
                    crashPoint: this.game_crash_value,
                    finalMultiplier: current_multiplier,
                    totalPayout: 0 // Will be calculated in cashout
                });
                
                this.game_phase = false;
                this.cashout_phase = true;
                this.phase_start_time = Date.now();
                console.log(`💥 Round crashed at ${current_multiplier.toFixed(2)}x (target: ${this.game_crash_value.toFixed(2)}x)`);
            }
        } 
        else if (this.cashout_phase) {
            // Cashout phase - 3 seconds
            if (!this.sent_cashout) {
                await this.processCashouts();
                this.sent_cashout = true;
                
                // Add to history
                this.previous_crashes.unshift(this.game_crash_value);
                if (this.previous_crashes.length > 25) {
                    this.previous_crashes.pop();
                }
                
                // Update round ID - Generate proper string format for database
                this.round_counter++;
                this.current_round_id = `round_${Date.now()}_${this.round_counter}`;
                this.round_id_list.unshift(this.round_counter); // Keep numeric for legacy compatibility
                if (this.round_id_list.length > 25) {
                    this.round_id_list.pop();
                }
            }
            
            if (time_elapsed > 3) {
                // Start new betting phase
                this.cashout_phase = false;
                this.betting_phase = true;
                
                // Generate new crash value using proven algorithm
                this.generateCrashValue();
                
                // Emit events for new round
                this.io.emit('update_user');
                this.io.emit('crash_history', this.previous_crashes);
                this.io.emit('get_round_id_list', this.round_id_list);
                this.io.emit('start_betting_phase');
                
                // Initialize first round with proper format
                if (typeof this.current_round_id === 'number') {
                    this.current_round_id = `round_${Date.now()}_${this.current_round_id}`;
                }
                
                this.emit('roundCreated', {
                    id: this.current_round_id,
                    crashPoint: this.game_crash_value,
                    timeUntilStart: 6000
                });
                
                // Reset for new round
                this.live_bettors_table = [];
                this.active_player_id_list = [];
                this.phase_start_time = Date.now();
                
                console.log(`🎲 New betting phase started - Next crash: ${this.game_crash_value.toFixed(2)}x`);
            }
        }
    }
    
    /**
     * 🎲 Generate crash value - exact algorithm from working implementation
     */
    generateCrashValue() {
        // Proven crash generation algorithm from reference
        let randomInt = Math.floor(Math.random() * (9999999999 - 0 + 1) + 0);
        
        if (randomInt % 33 == 0) {
            this.game_crash_value = 1.00;
        } else {
            let random_int_0_to_1 = Math.random();
            while (random_int_0_to_1 == 0) {
                random_int_0_to_1 = Math.random();
            }
            this.game_crash_value = 0.01 + (0.99 / random_int_0_to_1);
            this.game_crash_value = Math.round(this.game_crash_value * 100) / 100;
        }
        
        console.log(`🎯 Generated crash point: ${this.game_crash_value.toFixed(2)}x`);
    }
    
    /**
     * 💰 Process cashouts for winning players
     */
    async processCashouts() {
        const crash_number = this.game_crash_value;
        
        // Process each active bet
        for (const bettorData of this.live_bettors_table) {
            if (bettorData.payout_multiplier && bettorData.payout_multiplier <= crash_number) {
                // Player wins!
                const payout = bettorData.bet_amount * bettorData.payout_multiplier;
                
                this.emit('playerCashedOut', {
                    roundId: this.current_round_id,
                    playerId: bettorData.the_user_id,
                    multiplier: bettorData.payout_multiplier,
                    payout: payout
                });
                
                console.log(`💰 Player ${bettorData.the_username} cashed out at ${bettorData.payout_multiplier}x for ${payout.toFixed(4)} ETH`);
            }
        }
    }
    
    /**
     * 🎲 Place a bet (during betting phase)
     */
    placeBet(playerId, username, betAmount, payoutMultiplier) {
        if (!this.betting_phase) {
            throw new Error('Not in betting phase');
        }
        
        // Check for duplicate bets
        if (this.active_player_id_list.includes(playerId)) {
            throw new Error('Player already has an active bet');
        }
        
        // Add bet to active lists
        this.active_player_id_list.push(playerId);
        
        const betInfo = {
            the_user_id: playerId,
            the_username: username,
            bet_amount: betAmount,
            payout_multiplier: payoutMultiplier,
            cashout_multiplier: null,
            profit: null,
            b_bet_live: true
        };
        
        this.live_bettors_table.push(betInfo);
        
        // Emit to all clients
        this.io.emit("receive_live_betting_table", JSON.stringify(this.live_bettors_table));
        
        this.emit('betPlaced', {
            roundId: this.current_round_id,
            bet: {
                playerId: playerId,
                amount: betAmount,
                multiplier: payoutMultiplier
            },
            totalBets: this.live_bettors_table.length,
            totalAmount: this.live_bettors_table.reduce((sum, bet) => sum + bet.bet_amount, 0)
        });
        
        console.log(`💰 Bet placed: ${username} - ${betAmount} ETH @ ${payoutMultiplier}x`);
        return true;
    }
    
    /**
     * 💸 Manual cashout during game phase
     */
    manualCashout(playerId) {
        if (!this.game_phase) {
            return false;
        }
        
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        const current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
        
        if (current_multiplier <= this.game_crash_value && this.active_player_id_list.includes(playerId)) {
            // Find and update the bettor
            for (const bettorObject of this.live_bettors_table) {
                if (bettorObject.the_user_id === playerId) {
                    bettorObject.cashout_multiplier = current_multiplier;
                    bettorObject.profit = (bettorObject.bet_amount * current_multiplier) - bettorObject.bet_amount;
                    bettorObject.b_bet_live = false;
                    
                    // Remove from active list
                    const index = this.active_player_id_list.indexOf(playerId);
                    if (index > -1) {
                        this.active_player_id_list.splice(index, 1);
                    }
                    
                    this.io.emit("receive_live_betting_table", JSON.stringify(this.live_bettors_table));
                    
                    this.emit('playerCashedOut', {
                        roundId: this.current_round_id,
                        playerId: playerId,
                        multiplier: current_multiplier,
                        payout: bettorObject.bet_amount * current_multiplier
                    });
                    
                    console.log(`💸 Manual cashout: ${bettorObject.the_username} @ ${current_multiplier}x`);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 📊 Get current multiplier (for client sync)
     */
    getCurrentMultiplier() {
        if (!this.game_phase) return 1.0;
        
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        return parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
    }
    
    /**
     * 📊 Get current game state
     */
    getGameState() {
        const isRunning = this.game_phase;
        const currentMultiplier = isRunning ? this.getCurrentMultiplier() : 1.0;
        
        return {
            phase: this.betting_phase ? 'betting' : this.game_phase ? 'game' : 'cashout',
            isRunning: isRunning,
            currentMultiplier: currentMultiplier,
            phaseStartTime: this.phase_start_time,
            crashPoint: this.game_crash_value,
            roundId: this.current_round_id,
            activeBets: this.live_bettors_table.length,
            history: this.previous_crashes
        };
    }
    
    /**
     * 🎯 SIMPLIFIED: No more frequent updates - client handles smooth display
     * Server only sends round start with crash point, client calculates everything else
     */
    
    /**
     * 🛑 Stop the game engine
     */
    stop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        // No more multiplier update interval - simplified server
        
        console.log('🛑 Proven Crash Engine stopped');
    }
}

module.exports = ProvenCrashEngine;
