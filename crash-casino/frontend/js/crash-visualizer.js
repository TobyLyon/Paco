/**
 * 🎮 Crash Visualizer - Toggle between Chart and Rocket systems
 * 
 * Wrapper that manages both visualization systems and provides easy toggling
 */

class CrashVisualizer {
    constructor() {
        this.useRocket = false; // Always default to chart, rocket available via toggle
        this.chart = null;
        this.rocket = null;
        this.activeSystem = null;
        this.isInitialized = false;
        
        // Note: Ignoring localStorage to always start with chart
        // User can still toggle to rocket if desired
        
        this.init();
    }
    
    /**
     * 🚀 Initialize both systems
     */
    init() {
        console.log('🎮 Initializing crash visualizer...');
        
        try {
            // Use existing chart system if available, otherwise create new one
            if (window.crashChart && window.crashChart.chart) {
                this.chart = window.crashChart;
                console.log('✅ Using existing chart system (avoiding canvas reuse)');
            } else if (typeof CrashChart !== 'undefined') {
                this.chart = new CrashChart();
                console.log('✅ Chart system initialized');
            } else {
                console.warn('⚠️ CrashChart not available');
            }
            
            // Initialize rocket system  
            if (typeof CrashRocket !== 'undefined') {
                this.rocket = new CrashRocket();
                console.log('✅ Rocket system initialized');
            } else {
                console.warn('⚠️ CrashRocket not available');
            }
            
            // Set active system
            this.switchTo(this.useRocket ? 'rocket' : 'chart');
            
                    // Toggle controls removed - using chart mode only
            
            this.isInitialized = true;
            console.log(`🎮 Visualizer initialized - Active: ${this.useRocket ? 'Rocket' : 'Chart'}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize visualizer:', error);
            // Fallback to chart only
            this.useRocket = false;
            this.activeSystem = this.chart;
        }
    }
    
    /**
     * 🔄 Switch between chart and rocket
     */
    switchTo(mode) {
        const newUseRocket = mode === 'rocket';
        
        // Validate that the requested system is available
        if (newUseRocket && !this.rocket) {
            console.warn('⚠️ Rocket system not available, staying with chart');
            return false;
        }
        
        if (!newUseRocket && !this.chart) {
            console.warn('⚠️ Chart system not available, staying with rocket');
            return false;
        }
        
        // Only hide if we're actually switching modes
        if (this.activeSystem && this.useRocket !== newUseRocket) {
            this.hideCurrentSystem();
        }
        
        // Switch to new system
        this.useRocket = newUseRocket;
        this.activeSystem = this.useRocket ? this.rocket : this.chart;
        
        // Always show the current system to ensure visibility
        this.showCurrentSystem();
        
        // Save setting
        localStorage.setItem('crashVisualizerMode', this.useRocket ? 'rocket' : 'chart');
        
        console.log(`🔄 Switched to: ${this.useRocket ? 'Rocket' : 'Chart'}`);
        return true;
    }
    
    /**
     * 👁️ Show current system
     */
    showCurrentSystem() {
        if (this.useRocket && this.rocket && this.rocket.container) {
            this.rocket.container.style.display = 'block';
            // Update dimensions after showing
            setTimeout(() => this.rocket.resize(), 100);
        }
        
        if (!this.useRocket && this.chart) {
            const chartCanvas = document.getElementById('multiplierChart');
            if (chartCanvas) {
                chartCanvas.style.display = 'block';
            }
            // Resize chart after showing
            setTimeout(() => this.chart.resize && this.chart.resize(), 100);
        }
    }
    
    /**
     * 🙈 Hide current system
     */
    hideCurrentSystem() {
        // Hide rocket
        if (this.rocket && this.rocket.container) {
            this.rocket.container.style.display = 'none';
        }
        
        // Hide chart
        const chartCanvas = document.getElementById('multiplierChart');
        if (chartCanvas) {
            chartCanvas.style.display = 'none';
        }
    }
    
    // Toggle controls removed - chart mode only
    
    // Toggle functionality removed - chart mode only
    
    /**
     * 💬 Show notification
     */
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // ===== PROXY METHODS - Forward calls to active system =====
    
    /**
     * 🎮 Start new round
     */
    startRound() {
        if (!this.activeSystem) return;
        
        try {
            if (this.activeSystem.startRound) {
                this.activeSystem.startRound();
            } else if (this.activeSystem.startNewRound) {
                this.activeSystem.startNewRound();
            }
        } catch (error) {
            console.error('Error starting round:', error);
        }
    }
    
    /**
     * 🔄 Start new round (alias)
     */
    startNewRound() {
        this.startRound();
    }
    
    /**
     * 📊 Add data point
     */
    addDataPoint(timeElapsed, multiplier) {
        if (!this.activeSystem || !this.activeSystem.addDataPoint) return;
        
        try {
            this.activeSystem.addDataPoint(timeElapsed, multiplier);
        } catch (error) {
            console.error('Error adding data point:', error);
        }
    }
    
    /**
     * 📈 Update multiplier
     */
    updateMultiplier(multiplier) {
        if (!this.activeSystem) return;
        
        try {
            if (this.activeSystem.updateMultiplier) {
                this.activeSystem.updateMultiplier(multiplier);
            } else if (this.activeSystem.addDataPoint) {
                // Calculate time if method doesn't exist
                const timeElapsed = this.activeSystem.roundStartTime ? 
                    (Date.now() - this.activeSystem.roundStartTime) / 1000 : 0;
                this.activeSystem.addDataPoint(timeElapsed, multiplier);
            }
        } catch (error) {
            console.error('Error updating multiplier:', error);
        }
    }
    
    /**
     * 💥 Crash round
     */
    crashRound(crashPoint) {
        if (!this.activeSystem || !this.activeSystem.crashRound) return;
        
        try {
            this.activeSystem.crashRound(crashPoint);
        } catch (error) {
            console.error('Error crashing round:', error);
        }
    }
    
    /**
     * 🔄 Reset
     */
    reset() {
        if (!this.activeSystem || !this.activeSystem.reset) return;
        
        try {
            this.activeSystem.reset();
        } catch (error) {
            console.error('Error resetting:', error);
        }
    }
    
    /**
     * 📏 Resize
     */
    resize() {
        try {
            if (this.chart && this.chart.resize) {
                this.chart.resize();
            }
            if (this.rocket && this.rocket.resize) {
                this.rocket.resize();
            }
        } catch (error) {
            console.error('Error resizing:', error);
        }
    }
    
    /**
     * 🗑️ Destroy
     */
    destroy() {
        try {
            if (this.chart && this.chart.destroy) {
                this.chart.destroy();
            }
            if (this.rocket && this.rocket.destroy) {
                this.rocket.destroy();
            }
        } catch (error) {
            console.error('Error destroying:', error);
        }
    }
}

// Global instance
window.CrashVisualizer = CrashVisualizer;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrashVisualizer;
}
