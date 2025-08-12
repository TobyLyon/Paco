/**
 * 🎰 Fixed Crash Game Engine - Server Authoritative
 * 
 * Based on the reference implementation that works perfectly
 * This is a clean, simple implementation without competing systems
 */

const { EventEmitter } = require('events');

class FixedCrashEngine extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        
        // Game state - exactly like reference
        this.betting_phase = false;
        this.game_phase = false;
        this.cashout_phase = true;
        this.game_crash_value = -69;
        this.sent_cashout = true;
        this.phase_start_time = Date.now();
        
        // Player management
        this.live_bettors_table = [];
        this.active_player_id_list = [];
        this.previous_crashes = [];
        this.round_id_list = Array.from({length: 25}, (_, i) => i + 1);
        
        // Start with a valid crash value
        this.generateCrashValue();
        
        // Start the game loop - simple interval like reference
        this.gameLoop = setInterval(async () => {
            await this.loopUpdate();
        }, 1000);
        
        console.log('🎰 Fixed Crash Engine started - Server authoritative mode');
    }
    
    /**
     * 🔄 Main game loop - exactly from reference implementation
     */
    async loopUpdate() {
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        
        if (this.betting_phase) {
            // Betting phase - 6 seconds
            if (time_elapsed > 6) {
                this.sent_cashout = false;
                this.betting_phase = false;
                this.game_phase = true;
                
                // Emit start event
                this.io.emit('start_multiplier_count');
                this.phase_start_time = Date.now();
                
                console.log(`🚀 Game started - Will crash at ${this.game_crash_value.toFixed(2)}x`);
            }
        } 
        else if (this.game_phase) {
            // Game phase - calculate multiplier
            const current_multiplier = (1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2);
            
            if (current_multiplier > this.game_crash_value) {
                // Game crashed!
                this.io.emit('stop_multiplier_count', this.game_crash_value.toFixed(2));
                this.game_phase = false;
                this.cashout_phase = true;
                this.phase_start_time = Date.now();
                
                console.log(`💥 Crashed at ${this.game_crash_value.toFixed(2)}x`);
            }
        } 
        else if (this.cashout_phase) {
            // Process cashouts
            if (!this.sent_cashout) {
                await this.cashout();
                this.sent_cashout = true;
                
                // Update history
                this.previous_crashes.push(this.game_crash_value);
                if (this.previous_crashes.length > 25) {
                    this.previous_crashes.shift();
                }
                
                // Update round IDs
                const lastRoundId = this.round_id_list[this.round_id_list.length - 1] || 0;
                this.round_id_list.push(lastRoundId + 1);
                if (this.round_id_list.length > 25) {
                    this.round_id_list.shift();
                }
            }
            
            // Start new round after 3 seconds
            if (time_elapsed > 3) {
                this.cashout_phase = false;
                this.betting_phase = true;
                
                // Generate new crash value
                this.generateCrashValue();
                
                // Emit events
                this.io.emit('update_user');
                this.io.emit('crash_history', this.previous_crashes);
                this.io.emit('get_round_id_list', this.round_id_list);
                this.io.emit('start_betting_phase');
                
                // Reset for new round
                this.live_bettors_table = [];
                this.phase_start_time = Date.now();
                
                console.log(`🎲 New betting phase - Next crash: ${this.game_crash_value.toFixed(2)}x`);
            }
        }
    }
    
    /**
     * 🎲 Generate crash value - from reference
     */
    generateCrashValue() {
        const randomInt = Math.floor(Math.random() * 9999999999);
        
        if (randomInt % 33 === 0) {
            this.game_crash_value = 1;
        } else {
            let random_0_to_1 = Math.random();
            while (random_0_to_1 === 0) {
                random_0_to_1 = Math.random();
            }
            this.game_crash_value = 0.01 + (0.99 / random_0_to_1);
            this.game_crash_value = Math.round(this.game_crash_value * 100) / 100;
        }
    }
    
    /**
     * 💰 Process cashouts
     */
    async cashout() {
        // Process automatic cashouts
        for (const bettor of this.live_bettors_table) {
            if (bettor.b_bet_live && bettor.payout_multiplier && 
                bettor.payout_multiplier <= this.game_crash_value) {
                
                const profit = bettor.bet_amount * bettor.payout_multiplier;
                
                this.emit('playerWon', {
                    playerId: bettor.the_user_id,
                    amount: profit,
                    multiplier: bettor.payout_multiplier
                });
                
                console.log(`💰 ${bettor.the_username} won ${profit} at ${bettor.payout_multiplier}x`);
            }
        }
        
        // Clear active players
        this.active_player_id_list = [];
    }
    
    /**
     * 📊 Get game status
     */
    getGameStatus() {
        if (this.betting_phase) {
            return { 
                phase: 'betting_phase', 
                info: this.phase_start_time 
            };
        } else if (this.game_phase) {
            return { 
                phase: 'game_phase', 
                info: this.phase_start_time 
            };
        } else {
            return { 
                phase: 'cashout_phase', 
                info: this.phase_start_time 
            };
        }
    }
    
    /**
     * 🎲 Place bet
     */
    placeBet(userId, username, betAmount, payoutMultiplier = null) {
        if (!this.betting_phase) {
            throw new Error('IT IS NOT THE BETTING PHASE');
        }
        
        // Check for duplicate
        if (this.active_player_id_list.includes(userId)) {
            throw new Error('You are already betting this round');
        }
        
        // Add to active players
        this.active_player_id_list.push(userId);
        
        // Create bet info
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
        
        // Broadcast to all clients
        this.io.emit('receive_live_betting_table', JSON.stringify(this.live_bettors_table));
        
        console.log(`💰 Bet placed: ${username} - ${betAmount} @ ${payoutMultiplier || 'manual'}x`);
        
        return betInfo;
    }
    
    /**
     * 💸 Manual cashout
     */
    manualCashout(userId) {
        if (!this.game_phase) {
            return false;
        }
        
        const time_elapsed = (Date.now() - this.phase_start_time) / 1000.0;
        const current_multiplier = parseFloat((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2));
        
        // Check if can cashout
        if (current_multiplier <= this.game_crash_value && 
            this.active_player_id_list.includes(userId)) {
            
            // Find bettor
            for (const bettor of this.live_bettors_table) {
                if (bettor.the_user_id === userId && bettor.b_bet_live) {
                    bettor.cashout_multiplier = current_multiplier;
                    bettor.profit = (bettor.bet_amount * current_multiplier) - bettor.bet_amount;
                    bettor.b_bet_live = false;
                    
                    // Remove from active
                    const index = this.active_player_id_list.indexOf(userId);
                    if (index > -1) {
                        this.active_player_id_list.splice(index, 1);
                    }
                    
                    // Broadcast update
                    this.io.emit('receive_live_betting_table', JSON.stringify(this.live_bettors_table));
                    
                    const totalWin = bettor.bet_amount * current_multiplier;
                    
                    this.emit('playerCashedOut', {
                        playerId: userId,
                        amount: totalWin,
                        multiplier: current_multiplier
                    });
                    
                    console.log(`💸 ${bettor.the_username} cashed out at ${current_multiplier}x for ${totalWin}`);
                    
                    return {
                        success: true,
                        multiplier: current_multiplier,
                        profit: bettor.profit,
                        total: totalWin
                    };
                }
            }
        }
        
        return false;
    }
    
    /**
     * 🛑 Stop engine
     */
    stop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        console.log('🛑 Fixed Crash Engine stopped');
    }
}

module.exports = FixedCrashEngine;
