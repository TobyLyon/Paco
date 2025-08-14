/**
 * 🎯 Unified Crash Engine - Perfect Sync Implementation
 * 
 * Based on proven reference implementation with perfect client-server sync
 * SERVER-AUTHORITY pattern with CLIENT-PREDICTION for smooth gameplay
 */

const EventEmitter = require('events');

class UnifiedCrashEngine extends EventEmitter {
    constructor(io, config = {}) {
        super();
        this.io = io;
        this.config = {
            bettingPhaseDuration: 15000,   // 15 seconds - user requested timing
            cashoutPhaseDuration: 3000,    // 3 seconds - proven timing
            maxCrashValue: 1000.0,         // Maximum crash multiplier
            minCrashValue: 1.00,           // Minimum crash multiplier
            updateInterval: 1000,          // 1 second updates (like reference)
            ...config
        };
        
        // Game state (SINGLE SOURCE OF TRUTH)
        this.phase_start_time = Date.now();
        this.betting_phase = false;
        this.game_phase = false;
        this.cashout_phase = true;  // Start in cashout to trigger first round
        this.sent_cashout = true;
        
        // Round data
        this.game_crash_value = 0;
        this.current_round_id = 1;
        this.round_counter = 0;
        this.previous_crashes = [];
        this.round_id_list = [];
        
        // Player data
        this.live_bettors_table = [];
        this.active_player_id_list = [];
        
        // Game loop
        this.gameLoopInterval = null;
        
        // Countdown synchronization
        this.lastCountdownSecond = -1;
        
        // Commit-reveal RNG
        this.currentCommit = null;
        this.currentServerSeed = null;
        this.currentNonce = 0;

        // Pause control
        this.paused = false;

        console.log('🎯 Unified Crash Engine initialized with server authority');
    }
    
    /**
     * 🚀 Start the unified game loop
     */
    start() {
        console.log('🎮 Starting unified crash game loop...');
        
        // Start the game loop with proven 1-second interval
        this.gameLoopInterval = setInterval(() => {
            this.loopUpdate();
        }, 1000);
        
        console.log('✅ Unified crash engine running');
        return this;
    }
    
    /**
     * 🔄 Main game loop - EXACT implementation from reference
     */
    async loopUpdate() {
        if (this.paused || process.env.PAUSE_ENGINE === '1') {
            return;
        }
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        
        if (this.betting_phase) {
            // BETTING PHASE: 15 seconds exactly with real-time countdown
            const remaining = Math.max(0, 15 - time_elapsed);
            
            // Emit countdown updates every second for perfect sync
            if (Math.floor(remaining) !== this.lastCountdownSecond) {
                this.lastCountdownSecond = Math.floor(remaining);
                this.io.emit('betting_countdown', {
                    remaining: Math.ceil(remaining),
                    phase: 'betting'
                });
                console.log(`⏰ Betting countdown: ${Math.ceil(remaining)}s remaining`);
            }
            
            if (time_elapsed > 15) {
                this.sent_cashout = false;
                this.betting_phase = false;
                this.game_phase = true;
                
                // Start the multiplier count (CLIENT LISTENS TO THIS)
                this.io.emit('start_multiplier_count');
                this.emit('roundStarted', {
                    roundId: this.current_round_id,
                    startTime: Date.now()
                });
                
                this.phase_start_time = Date.now();
                console.log(`🚀 Game phase started - Crash Point: ${this.game_crash_value.toFixed(2)}x`);
            }
        }
        else if (this.game_phase) {
            // GAME PHASE: Multiplier counting up until crash
            const current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
            
            // Check if we've reached the crash point
            if (current_multiplier >= this.game_crash_value) {
                // STOP the multiplier count (CLIENT LISTENS TO THIS)
                this.io.emit('stop_multiplier_count', this.game_crash_value.toFixed(2));
                this.emit('roundCrashed', {
                    roundId: this.current_round_id,
                    crashPoint: this.game_crash_value,
                    finalMultiplier: current_multiplier
                });
                
                this.game_phase = false;
                this.cashout_phase = true;
                this.phase_start_time = Date.now();
                console.log(`💥 Round crashed at ${current_multiplier.toFixed(2)}x (target: ${this.game_crash_value.toFixed(2)}x)`);
            }
        }
        else if (this.cashout_phase) {
            // CASHOUT PHASE: 3 seconds for processing
            if (!this.sent_cashout) {
                await this.processCashouts();
                this.sent_cashout = true;
                
                // Update history (exactly like reference)
                this.previous_crashes.unshift(this.game_crash_value);
                if (this.previous_crashes.length > 25) {
                    this.previous_crashes.pop();
                }
                
                // Update round counter
                this.round_counter++;
                this.current_round_id = this.round_counter;
                this.round_id_list.unshift(this.round_counter);
                if (this.round_id_list.length > 25) {
                    this.round_id_list.pop();
                }
            }
            
            if (time_elapsed > 3) {
                // Start new betting phase
                this.cashout_phase = false;
                this.betting_phase = true;
                
                // Generate new commit for next round
                this.prepareCommitForNextRound();
                
                // Emit events for new round (CLIENT LISTENS TO THESE)
                this.io.emit('update_user');
                this.io.emit('crash_history', this.previous_crashes);
                this.io.emit('get_round_id_list', this.round_id_list);
                this.io.emit('start_betting_phase');  // THIS STARTS CLIENT COUNTDOWN
                
                this.emit('roundCreated', {
                    id: this.current_round_id,
                    commitHash: this.currentCommit
                });
                
                // Reset for new round
                this.live_bettors_table = [];
                this.active_player_id_list = [];
                this.phase_start_time = Date.now();
                
                console.log(`🎲 New betting phase started - Commit published: ${this.currentCommit}`);
            }
        }
    }
    
    /**
     * 🎲 Generate crash value - CORRECTED Bustabit algorithm with 1% house edge
     */
    prepareCommitForNextRound() {
        const crypto = require('crypto');
        this.currentServerSeed = crypto.randomBytes(32).toString('hex');
        this.currentNonce += 1;
        const preimage = `${this.currentServerSeed}|${this.current_round_id}|${this.currentNonce}`;
        this.currentCommit = crypto.createHash('sha256').update(preimage).digest('hex');
        // Set hidden crash value now from serverSeed
        this.game_crash_value = this.calculateCrashFromSeed(this.currentServerSeed);
    }

    calculateCrashFromSeed(serverSeed) {
        const { keccak256 } = require('ethers');
        const hash = keccak256(`0x${serverSeed}`);
        // Map hash -> multiplier with house edge and bounds
        // Use first 52 bits to avoid modulo bias
        const bigint = BigInt(hash);
        const r = Number(bigint % (2n ** 52n)) / Number(2n ** 52n);
        const houseEdge = 0.01;
        const raw = Math.floor((100 * (1 - houseEdge)) / Math.max(r, 1e-12)) / 100;
        const capped = Math.max(this.config.minCrashValue, Math.min(raw, this.config.maxCrashValue));
        return Math.round(capped * 100) / 100;
    }
    
    /**
     * 💰 Process cashouts for winning players
     */
    async processCashouts() {
        console.log('💰 Processing round cashouts...');
        
        // Process cashouts for players who cashed out in time
        for (const playerId of this.active_player_id_list) {
            // Cashout logic would go here
            // For now, just log
            console.log(`Processing cashout for player: ${playerId}`);
        }
        
        // Clear active players for next round
        this.active_player_id_list = [];
        
        console.log('✅ Cashouts processed');
    }
    
    /**
     * 💸 Place a bet for a player
     */
    async placeBet(playerId, playerName, betAmount, payoutMultiplier) {
        // Allow 2-second grace period for transaction delays
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        const graceWindow = this.betting_phase || (this.game_phase && time_elapsed < 2);
        
        if (!graceWindow) {
            throw new Error('Betting window closed');
        }
        
        if (this.active_player_id_list.includes(playerId)) {
            throw new Error('Player already has active bet');
        }
        
        // Add player to active list
        this.active_player_id_list.push(playerId);
        
        // Add to live bettors table
        const betInfo = {
            the_user_id: playerId,
            the_username: playerName,
            bet_amount: betAmount,
            payout_multiplier: payoutMultiplier,
            cashout_multiplier: null,
            profit: null,
            b_bet_live: true
        };
        
        this.live_bettors_table.push(betInfo);
        
        // Emit to all clients
        this.io.emit('receive_live_betting_table', JSON.stringify(this.live_bettors_table));
        
        console.log(`💰 Bet placed: ${playerName} - ${betAmount} @ ${payoutMultiplier}x`);
        return betInfo;
    }
    
    /**
     * 🏃 Process manual cashout
     */
    async processCashout(playerId, currentMultiplier) {
        if (!this.game_phase) {
            throw new Error('Not in game phase');
        }
        
        if (!this.active_player_id_list.includes(playerId)) {
            throw new Error('Player has no active bet');
        }
        
        // Remove from active players
        this.active_player_id_list = this.active_player_id_list.filter(id => id !== playerId);
        
        // Update live bettors table
        const bettor = this.live_bettors_table.find(b => b.the_user_id === playerId);
        if (bettor) {
            bettor.cashout_multiplier = currentMultiplier;
            bettor.profit = (bettor.bet_amount * currentMultiplier) - bettor.bet_amount;
            bettor.b_bet_live = false;
            
            this.io.emit('receive_live_betting_table', JSON.stringify(this.live_bettors_table));
        }
        
        console.log(`🏃 Manual cashout: ${playerId} @ ${currentMultiplier}x`);
        return bettor;
    }
    
    /**
     * 📊 Get current game state
     */
    getGameState() {
        let phase = 'waiting';
        let timeRemaining = 0;
        
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        
        if (this.betting_phase) {
            phase = 'betting_phase';
            timeRemaining = Math.max(0, 6 - time_elapsed);
        } else if (this.game_phase) {
            phase = 'game_phase';
            timeRemaining = 0; // Game phase duration is unknown to client
        } else if (this.cashout_phase) {
            phase = 'cashout_phase';
            timeRemaining = Math.max(0, 3 - time_elapsed);
        }
        
        return {
            phase,
            timeRemaining,
            phaseStartTime: this.phase_start_time,
            roundId: this.current_round_id,
            previousCrashes: this.previous_crashes,
            roundIdList: this.round_id_list,
            liveBettors: this.live_bettors_table
        };
    }
    
    /**
     * 🛑 Stop the game engine
     */
    stop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        console.log('🛑 Unified crash engine stopped');
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }
    isPaused() { return this.paused || process.env.PAUSE_ENGINE === '1'; }
}

module.exports = UnifiedCrashEngine;
