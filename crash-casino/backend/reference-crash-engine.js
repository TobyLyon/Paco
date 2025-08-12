/**
 * 🎰 Reference Crash Engine (Exact Copy from Working Implementation)
 * 
 * This is a direct adaptation of the proven working crash game from:
 * wbrandon25/Online-Crash-Gambling-Simulator
 * 
 * CRITICAL: This uses the EXACT same events, timing, and logic that works.
 */

const { EventEmitter } = require('events');

class ReferenceCrashEngine extends EventEmitter {
    constructor(io, config = {}) {
        super();
        this.io = io;
        
        // Game state variables (EXACT from reference - lines 355-361)
        this.live_bettors_table = [];
        this.betting_phase = false;
        this.game_phase = false;
        this.cashout_phase = true;
        this.game_crash_value = -69;
        this.sent_cashout = true;
        this.phase_start_time = Date.now();
        
        // Round tracking (EXACT from reference)
        this.previous_crashes = [];
        this.round_id_list = [1];
        this.current_round = 1;
        
        // Start the game loop (EXACT reference timing)
        this.startGameLoop();
        
        console.log('🎰 Reference Crash Engine initialized (exact copy from working repo)');
    }
    
    /**
     * 🔄 Start the main game loop (EXACT from reference - line 350-352)
     */
    startGameLoop() {
        this.gameLoopInterval = setInterval(async () => {
            await this.loopUpdate();
        }, 1000); // Every 1 second (exact reference timing)
    }
    
    /**
     * 🎮 Main game loop (EXACT COPY from reference - lines 363-420)
     */
    async loopUpdate() {
        let time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        
        if (this.betting_phase) {
            // Betting phase - 6 seconds (EXACT reference line 366)
            if (time_elapsed > 6) {
                this.sent_cashout = false;
                this.betting_phase = false;
                this.game_phase = true;
                
                // EXACT reference event (line 370)
                this.io.emit('start_multiplier_count');
                this.phase_start_time = Date.now();
                
                console.log(`🚀 start_multiplier_count emitted - crash target: ${this.game_crash_value.toFixed(2)}x`);
            }
        } 
        else if (this.game_phase) {
            // Game phase (EXACT reference lines 373-380)
            let current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
            
            if (current_multiplier > this.game_crash_value) {
                // EXACT reference event (line 376)
                this.io.emit('stop_multiplier_count', this.game_crash_value.toFixed(2));
                
                this.game_phase = false;
                this.cashout_phase = true;
                this.phase_start_time = Date.now();
                
                console.log(`💥 stop_multiplier_count(${this.game_crash_value.toFixed(2)}) - actual: ${current_multiplier.toFixed(2)}x`);
            }
        } 
        else if (this.cashout_phase) {
            // Cashout phase (EXACT reference lines 381-419)
            if (!this.sent_cashout) {
                // Process cashouts once
                await this.cashout();
                this.sent_cashout = true;
                
                // Update history (EXACT reference lines 386-393)
                this.previous_crashes.unshift(this.game_crash_value);
                if (this.previous_crashes.length > 25) {
                    this.previous_crashes.pop();
                }
                
                // Update round ID list (EXACT reference lines 390-393)
                const the_round_id_list = this.round_id_list;
                this.round_id_list.unshift(the_round_id_list[the_round_id_list.length - 1] + 1);
                if (this.round_id_list.length > 25) {
                    this.round_id_list.pop();
                }
                this.current_round = this.round_id_list[0];
            }
            
            // Cashout phase duration - 3 seconds (EXACT reference line 396)
            if (time_elapsed > 3) {
                this.cashout_phase = false;
                this.betting_phase = true;
                
                // Generate crash value (EXACT reference algorithm lines 399-408)
                this.generateCrashValue();
                
                // EXACT reference events (lines 410-414)
                this.io.emit('update_user');
                this.io.emit('crash_history', this.previous_crashes);
                this.io.emit('get_round_id_list', this.round_id_list);
                this.io.emit('start_betting_phase');
                
                // Reset for new round (EXACT reference lines 415-417)
                this.live_bettors_table = [];
                this.phase_start_time = Date.now();
                
                console.log(`🎲 start_betting_phase emitted - Round ${this.current_round} - Target: ${this.game_crash_value.toFixed(2)}x`);
            }
        }
    }
    
    /**
     * 🎲 Generate crash value (EXACT reference algorithm lines 399-408)
     */
    generateCrashValue() {
        let randomInt = Math.floor(Math.random() * (9999999999 - 0 + 1) + 0);
        
        if (randomInt % 33 == 0) {
            this.game_crash_value = 1;
        } else {
            let random_int_0_to_1 = Math.random();
            while (random_int_0_to_1 == 0) {
                random_int_0_to_1 = Math.random();
            }
            this.game_crash_value = 0.01 + (0.99 / random_int_0_to_1);
            this.game_crash_value = Math.round(this.game_crash_value * 100) / 100;
        }
    }
    
    /**
     * 💰 Process cashouts (placeholder for reference - line 332-346)
     */
    async cashout() {
        // Process payouts for players who bet
        // This would integrate with your wallet system
        console.log(`💰 Processing cashouts for crash at ${this.game_crash_value.toFixed(2)}x`);
        
        // Update live bettors table to show results
        for (const bettor of this.live_bettors_table) {
            if (bettor.payout_multiplier <= this.game_crash_value) {
                bettor.profit = (bettor.bet_amount * bettor.payout_multiplier) - bettor.bet_amount;
                bettor.cashout_multiplier = bettor.payout_multiplier;
                bettor.b_bet_live = false;
            } else {
                bettor.profit = -bettor.bet_amount; // Lost bet
                bettor.cashout_multiplier = null;
                bettor.b_bet_live = false;
            }
        }
        
        // Emit updated betting table
        this.io.emit("receive_live_betting_table", JSON.stringify(this.live_bettors_table));
    }
    
    /**
     * 💰 Place bet (for wallet integration)
     */
    placeBet(userId, username, betAmount, payoutMultiplier) {
        if (!this.betting_phase) {
            return { success: false, error: "Not in betting phase" };
        }
        
        // Check for duplicate bet
        const existingBet = this.live_bettors_table.find(bet => bet.the_user_id === userId);
        if (existingBet) {
            return { success: false, error: "Already betting this round" };
        }
        
        // Add to betting table (EXACT reference format line 180-187)
        const betInfo = {
            the_user_id: userId,
            the_username: username,
            bet_amount: betAmount,
            payout_multiplier: payoutMultiplier,
            cashout_multiplier: null,
            profit: null,
            b_bet_live: true
        };
        
        this.live_bettors_table.push(betInfo);
        
        // Emit updated table (EXACT reference line 189)
        this.io.emit("receive_live_betting_table", JSON.stringify(this.live_bettors_table));
        
        return { success: true, message: `Bet placed for ${username}` };
    }
    
    /**
     * 🚪 Manual cash out early
     */
    manualCashOut(userId) {
        if (!this.game_phase) {
            return { success: false, error: "Not in game phase" };
        }
        
        const betIndex = this.live_bettors_table.findIndex(bet => bet.the_user_id === userId);
        if (betIndex === -1) {
            return { success: false, error: "No active bet found" };
        }
        
        // Calculate current multiplier (EXACT reference line 230)
        let time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        let current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
        
        // Check if can cash out (EXACT reference line 231)
        if (current_multiplier <= this.game_crash_value) {
            const bettor = this.live_bettors_table[betIndex];
            bettor.cashout_multiplier = current_multiplier;
            bettor.profit = (bettor.bet_amount * current_multiplier) - bettor.bet_amount;
            bettor.b_bet_live = false;
            
            // Emit updated table (EXACT reference line 241)
            this.io.emit("receive_live_betting_table", JSON.stringify(this.live_bettors_table));
            
            return { 
                success: true, 
                multiplier: current_multiplier,
                profit: bettor.profit 
            };
        }
        
        return { success: false, error: "Cannot cash out" };
    }
    
    /**
     * 📊 Get game status
     */
    getGameStatus() {
        return {
            phase: this.betting_phase ? 'betting_phase' : 
                   this.game_phase ? 'game_phase' : 'cashout_phase',
            phaseStartTime: this.phase_start_time,
            currentRound: this.current_round,
            crashValue: this.game_crash_value,
            bettorsCount: this.live_bettors_table.length
        };
    }
    
    /**
     * 🛑 Stop the engine
     */
    stop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        console.log('🛑 Reference Crash Engine stopped');
    }
}

module.exports = ReferenceCrashEngine;
