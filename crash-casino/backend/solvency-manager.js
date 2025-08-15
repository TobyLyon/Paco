/**
 * 🏦 Solvency Management System
 * 
 * Tracks aggregate liability and ensures house can pay all potential winnings
 */

class SolvencyManager {
    constructor(walletIntegration, balanceAPI, config = {}) {
        this.walletIntegration = walletIntegration;
        this.balanceAPI = balanceAPI;
        
        this.config = {
            maxLiabilityRatio: config.maxLiabilityRatio || 0.8,      // 80% of total house funds
            emergencyThreshold: config.emergencyThreshold || 0.9,    // 90% triggers emergency mode
            minReserveETH: config.minReserveETH || 1.0,              // Always keep 1 ETH minimum
            rebalanceThreshold: config.rebalanceThreshold || 0.3,    // Rebalance when hot wallet < 30%
            ...config
        };
        
        // Current state tracking
        this.currentLiability = 0;
        this.activeBets = new Map(); // playerId -> { amount, maxPayout, timestamp, type }
        this.houseBalance = 0;
        this.hotWalletBalance = 0;
        this.lastBalanceCheck = 0;
        
        // Emergency state
        this.emergencyMode = false;
        this.emergencyReason = null;
        
        console.log('🏦 SolvencyManager initialized with config:', this.config);
        
        // Start periodic health checks
        this.startHealthChecks();
    }
    
    /**
     * Check if a new bet can be accepted without exceeding solvency limits
     */
    async canAcceptBet(playerId, betAmount, maxMultiplier) {
        try {
            await this.updateBalances();
            
            const potentialPayout = betAmount * maxMultiplier;
            const newTotalLiability = this.currentLiability + potentialPayout;
            const maxAllowedLiability = await this.getMaxLiability();
            
            // Check if we're in emergency mode
            if (this.emergencyMode) {
                throw new Error(`Emergency mode active: ${this.emergencyReason}`);
            }
            
            // Check if this bet would exceed limits
            if (newTotalLiability > maxAllowedLiability) {
                const excessAmount = newTotalLiability - maxAllowedLiability;
                throw new Error(`Bet would exceed solvency limit by ${excessAmount.toFixed(4)} ETH`);
            }
            
            // Check minimum reserve requirements
            const remainingAfterPayout = this.getTotalFunds() - newTotalLiability;
            if (remainingAfterPayout < this.config.minReserveETH) {
                throw new Error(`Bet would violate minimum reserve requirement`);
            }
            
            console.log(`✅ Solvency check passed: ${potentialPayout.toFixed(4)} ETH liability (${(newTotalLiability/maxAllowedLiability*100).toFixed(1)}% of limit)`);
            return true;
            
        } catch (error) {
            console.error('❌ Solvency check failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Add a bet to liability tracking
     */
    async addBetLiability(playerId, betAmount, maxMultiplier, betType = 'balance') {
        const potentialPayout = betAmount * maxMultiplier;
        
        // Validate the bet can be accepted
        await this.canAcceptBet(playerId, betAmount, maxMultiplier);
        
        // Add to tracking
        this.activeBets.set(playerId, {
            amount: betAmount,
            maxPayout: potentialPayout,
            timestamp: Date.now(),
            type: betType
        });
        
        this.currentLiability += potentialPayout;
        
        console.log(`📈 Added bet liability: ${playerId} - ${potentialPayout.toFixed(4)} ETH (Total: ${this.currentLiability.toFixed(4)} ETH)`);
        
        // Check if we're approaching limits
        await this.checkWarningThresholds();
    }
    
    /**
     * Remove a bet from liability tracking (on cashout or loss)
     */
    removeBetLiability(playerId, actualPayout = 0) {
        const bet = this.activeBets.get(playerId);
        if (!bet) {
            console.warn(`⚠️ Attempted to remove liability for unknown player: ${playerId}`);
            return;
        }
        
        // Remove from liability and tracking
        this.currentLiability = Math.max(0, this.currentLiability - bet.maxPayout);
        this.activeBets.delete(playerId);
        
        console.log(`📉 Removed bet liability: ${playerId} - ${bet.maxPayout.toFixed(4)} ETH (Actual payout: ${actualPayout.toFixed(4)} ETH)`);
        console.log(`💰 Current total liability: ${this.currentLiability.toFixed(4)} ETH`);
    }
    
    /**
     * Get maximum allowed liability based on current house funds
     */
    async getMaxLiability() {
        await this.updateBalances();
        const totalFunds = this.getTotalFunds();
        return (totalFunds - this.config.minReserveETH) * this.config.maxLiabilityRatio;
    }
    
    /**
     * Get total available house funds
     */
    getTotalFunds() {
        return this.houseBalance + this.hotWalletBalance;
    }
    
    /**
     * Update house and hot wallet balances
     */
    async updateBalances() {
        const now = Date.now();
        
        // Rate limit balance checks (expensive operations)
        if (now - this.lastBalanceCheck < 30000) { // 30 seconds
            return;
        }
        
        try {
            // Get house wallet balance
            if (this.walletIntegration && this.walletIntegration.getHouseInfo) {
                const houseInfo = await this.walletIntegration.getHouseInfo();
                this.houseBalance = parseFloat(houseInfo.balance || '0');
            }
            
            // Get hot wallet balance (implementation depends on your setup)
            // This is a simplified version - you'd need to implement actual hot wallet balance checking
            this.hotWalletBalance = await this.getHotWalletBalance();
            
            this.lastBalanceCheck = now;
            
            console.log(`💼 Balances updated - House: ${this.houseBalance.toFixed(4)} ETH, Hot: ${this.hotWalletBalance.toFixed(4)} ETH`);
            
        } catch (error) {
            console.error('❌ Failed to update balances:', error);
            // Don't throw - use stale data in emergency
        }
    }
    
    /**
     * Get hot wallet balance (placeholder - implement based on your setup)
     */
    async getHotWalletBalance() {
        // This is a placeholder - implement actual hot wallet balance checking
        // You might query your blockchain provider or database
        return 5.0; // Placeholder value
    }
    
    /**
     * Check warning thresholds and trigger alerts
     */
    async checkWarningThresholds() {
        const maxLiability = await this.getMaxLiability();
        const utilizationRatio = this.currentLiability / maxLiability;
        
        if (utilizationRatio >= this.config.emergencyThreshold) {
            this.activateEmergencyMode(`Liability utilization at ${(utilizationRatio * 100).toFixed(1)}%`);
        } else if (utilizationRatio >= 0.75) {
            console.warn(`⚠️ High liability utilization: ${(utilizationRatio * 100).toFixed(1)}% of maximum`);
        }
        
        // Check if hot wallet needs rebalancing
        const totalFunds = this.getTotalFunds();
        if (totalFunds > 0) {
            const hotWalletRatio = this.hotWalletBalance / totalFunds;
            if (hotWalletRatio < this.config.rebalanceThreshold) {
                console.warn(`⚠️ Hot wallet low: ${(hotWalletRatio * 100).toFixed(1)}% of total funds. Consider rebalancing.`);
            }
        }
    }
    
    /**
     * Activate emergency mode to stop accepting high-risk bets
     */
    activateEmergencyMode(reason) {
        this.emergencyMode = true;
        this.emergencyReason = reason;
        console.error(`🚨 EMERGENCY MODE ACTIVATED: ${reason}`);
        
        // Here you could implement additional emergency measures:
        // - Notify administrators
        // - Reduce maximum bet amounts
        // - Pause high-multiplier bets
        // - Trigger automatic wallet rebalancing
    }
    
    /**
     * Deactivate emergency mode
     */
    deactivateEmergencyMode() {
        this.emergencyMode = false;
        this.emergencyReason = null;
        console.log('✅ Emergency mode deactivated');
    }
    
    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('❌ Health check failed:', error);
            }
        }, 60000); // Every minute
    }
    
    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        await this.updateBalances();
        await this.checkWarningThresholds();
        
        // Clean up old bets (shouldn't happen but good safety measure)
        const now = Date.now();
        const maxAge = 3600000; // 1 hour
        
        for (const [playerId, bet] of this.activeBets.entries()) {
            if (now - bet.timestamp > maxAge) {
                console.warn(`⚠️ Removing stale bet liability: ${playerId}`);
                this.removeBetLiability(playerId);
            }
        }
    }
    
    /**
     * Get current solvency status
     */
    async getStatus() {
        await this.updateBalances();
        const maxLiability = await this.getMaxLiability();
        const utilizationRatio = maxLiability > 0 ? this.currentLiability / maxLiability : 0;
        
        return {
            houseBalance: this.houseBalance,
            hotWalletBalance: this.hotWalletBalance,
            totalFunds: this.getTotalFunds(),
            currentLiability: this.currentLiability,
            maxLiability: maxLiability,
            utilizationRatio: utilizationRatio,
            utilizationPercent: (utilizationRatio * 100).toFixed(1),
            activeBetsCount: this.activeBets.size,
            emergencyMode: this.emergencyMode,
            emergencyReason: this.emergencyReason,
            canAcceptBets: !this.emergencyMode && utilizationRatio < this.config.emergencyThreshold
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 SolvencyManager config updated:', newConfig);
    }
}

module.exports = SolvencyManager;
