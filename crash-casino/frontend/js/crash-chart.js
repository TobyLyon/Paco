/**
 * 📈 Crash Game Chart - Real-time multiplier visualization
 * 
 * Uses Chart.js to display the live multiplier graph
 */

class CrashChart {
    constructor() {
        console.log('🎯 CrashChart: Starting initialization...');
        console.log('🔍 Chart.js version:', typeof Chart !== 'undefined' ? (Chart.version || 'Available') : 'NOT AVAILABLE');
        
        this.chart = null;
        this.canvas = null;
        this.ctx = null;
        this.maxDataPoints = 100; // Keep last 100 points for performance
        this.isRunning = false;
        this.roundStartTime = null;
        this.lastUpdateTime = 0;
        this.updateThrottleMs = 16; // ~60 FPS max frontend updates
        
        // Paco rocket element
        this.pacoRocket = null;
        this.chartContainer = null;
        
        // Simple chart data structure like the original - FIXED: Green line
        this.chartData = {
            labels: [],
            datasets: [{
                label: 'Multiplier',
                data: [],
                borderColor: '#10b981', // Green line to match multiplier color
                backgroundColor: 'rgba(16, 185, 129, 0.1)', // Green background
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.1,
                fill: true
            }]
        };
        
        // Simplified chart configuration like the original
        this.chartConfig = {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                events: [], // Disable all interactions for performance
                layout: {
                    padding: {
                        bottom: 10, // Extra bottom padding to prevent label clipping
                        top: 10,
                        left: 10,
                        right: 10
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { color: 'rgba(16, 185, 129, 0.1)' }, // Green grid
                        ticks: { color: '#10b981' } // Green labels
                    },
                    y: {
                        display: true,
                        min: 1,
                        max: 5,
                        grid: { color: 'rgba(16, 185, 129, 0.1)' }, // Green grid
                        ticks: { 
                            color: '#10b981', // Green labels
                            callback: function(value) {
                                return value.toFixed(2) + 'x';
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: { duration: 0 },
                elements: {
                    point: { radius: 0 },
                    line: { tension: 0.1 }
                }
            }
        };
        
        this.init();
    }
    
    /**
     * 🚀 Initialize the chart
     */
    init() {
        console.log('📈 Initializing crash chart...');
        
        this.canvas = document.getElementById('multiplierChart');
        if (!this.canvas) {
            console.error('❌ Chart canvas not found - element with id "multiplierChart" does not exist');
            console.log('Available elements:', document.querySelectorAll('canvas'));
            return;
        }
        
        console.log('✅ Canvas found:', this.canvas);
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        
        // Get chart container for Paco positioning
        this.chartContainer = this.canvas.parentElement;
        
        this.ctx = this.canvas.getContext('2d');
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js library not loaded');
            return;
        }
        
        // Create Chart.js instance
        try {
            console.log('🔧 Creating Chart.js instance...');
            this.chart = new Chart(this.ctx, this.chartConfig);
            console.log('✅ Chart initialized successfully:', this.chart);
            
            // Wait for chart to be fully rendered before starting
            setTimeout(() => {
                this.isRunning = false; // Make sure we're ready for new rounds
                this.createPacoRocket(); // Add Paco after chart is ready
                console.log('📈 Chart ready for data');
                console.log('Chart instance:', this.chart);
                console.log('Chart data:', this.chart.data);
            }, 100);
            
        } catch (error) {
            console.error('❌ Failed to initialize chart:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
    }
    
    /**
     * 🎮 Start a new round
     */
    startRound() {
        console.log('📈 Chart: Starting new round');
        
        this.isRunning = true;
        this.roundStartTime = Date.now();
        
        // Clear previous data from both objects
        this.chartData.labels = [];
        this.chartData.datasets[0].data = [];
        
        if (this.chart) {
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            
            // Reset y-axis scale
            this.chart.options.scales.y.suggestedMax = 5;
        
        // Reset chart appearance
        this.updateChartColor('#10b981'); // Green
        
            // Update chart first
            this.chart.update('none');
        }
        
        // Add initial point after clearing
        this.addDataPoint(0, 1.0);
        
        // Reset Paco position to start
        this.updatePacoPosition(0, 1.0);
    }
    
    /**
     * 🔄 Start new round (alias for compatibility)
     */
    startNewRound() {
        this.startRound();
    }
    
    /**
     * 📊 Add data point to chart
     */
    addDataPoint(timeElapsed, multiplier) {
        if (!this.isRunning || !this.chart) {
            console.log('Chart not ready:', { isRunning: this.isRunning, hasChart: !!this.chart });
            return;
        }
        
        // Throttle updates to prevent overwhelming the browser (60 FPS max)
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottleMs) {
            return; // Skip this update for smoother performance
        }
        this.lastUpdateTime = now;
        
        try {
            // Add new data point
            this.chart.data.labels.push(timeElapsed.toFixed(2));
            this.chart.data.datasets[0].data.push(parseFloat(multiplier));
            
            // Limit data points for performance (keep last 50 points)
            if (this.chart.data.labels.length > 50) {
                this.chart.data.labels.shift();
                this.chart.data.datasets[0].data.shift();
            }
            
            // Update y-axis scale dynamically based on multiplier
            const maxMultiplier = Math.max(...this.chart.data.datasets[0].data);
            if (maxMultiplier > 2) {
                this.chart.options.scales.y.max = Math.ceil(maxMultiplier * 1.2);
            }
            
            // Update chart immediately without animation
            this.chart.update('none');
            
            // Update rocket position
            // Update Paco rocket position to follow the line
            this.updatePacoPosition(timeElapsed, multiplier);
            
        } catch (error) {
            console.error('Error adding chart point:', error);
        }
    }

    /**
     * 🚀 Update rocket position (simplified - no longer needed with new structure)
     */
    updateRocketPosition(timeElapsed, multiplier) {
        // Simplified - the new structure doesn't need complex positioning
        // The chart handles its own display without overlay elements
    }
    
    /**
     * 📈 Update with new multiplier
     */
    updateMultiplier(multiplier) {
        if (!this.isRunning || !this.roundStartTime) return;
        
        const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
        this.addDataPoint(timeElapsed, multiplier);
        
        // Update chart color based on multiplier
        if (multiplier < 2) {
            this.updateChartColor('#10b981'); // Green
        } else if (multiplier < 5) {
            this.updateChartColor('#fbbf24'); // Yellow
        } else if (multiplier < 10) {
            this.updateChartColor('#f97316'); // Orange
        } else {
            this.updateChartColor('#dc2626'); // Red
        }
    }
    
    /**
     * 🎨 Update chart color
     */
    updateChartColor(color) {
        if (!this.chart) return;
        
        this.chartData.datasets[0].borderColor = color;
        this.chartData.datasets[0].backgroundColor = color + '20'; // 20% opacity
        
        // Add glow effect
        if (this.canvas) {
            this.canvas.style.filter = `drop-shadow(0 0 20px ${color}40)`;
        }
    }
    
    /**
     * 💥 Handle round crash
     */
    crashRound(crashPoint) {
        console.log(`💥 Chart: Round crashed at ${crashPoint}x`);
        
        // Final update BEFORE stopping (so addDataPoint works)
        if (this.roundStartTime) {
            const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
            this.addDataPoint(timeElapsed, crashPoint);
        }
        
        // Now stop the chart
        this.isRunning = false;
        
        // Change to crash color
        this.updateChartColor('#dc2626'); // Red
        
        // Add crash marker
        this.addCrashMarker(crashPoint);
        
        if (this.chart) {
            this.chart.update();
        }
    }
    
    /**
     * 💥 Add crash point marker
     */
    addCrashMarker(crashPoint) {
        if (!this.chart || !this.roundStartTime) return;
        
        const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
        
        // Add annotation plugin config for crash point
        if (!this.chart.options.plugins.annotation) {
            this.chart.options.plugins.annotation = {
                annotations: {}
            };
        }
        
        this.chart.options.plugins.annotation.annotations.crashPoint = {
            type: 'point',
            xValue: timeElapsed,
            yValue: crashPoint,
            backgroundColor: '#dc2626',
            borderColor: '#dc2626',
            borderWidth: 3,
            radius: 8,
            label: {
                content: `Crashed at ${crashPoint.toFixed(2)}x`,
                enabled: true,
                position: 'top',
                backgroundColor: 'rgba(220, 38, 38, 0.9)',
                color: '#fff',
                font: {
                    size: 12,
                    weight: 'bold'
                }
            }
        };
    }
    
    /**
     * 🔄 Reset chart
     */
    reset() {
        console.log('🔄 Chart: Resetting');
        
        this.isRunning = false;
        this.roundStartTime = null;
        
        // Clear data
        this.chartData.labels = [];
        this.chartData.datasets[0].data = [];
        
        // Reset appearance
        this.updateChartColor('#10b981');
        
        // Reset scale
        if (this.chart) {
            this.chart.options.scales.y.suggestedMax = 5;
            this.chart.update();
        }
        
        // Reset Paco position
        this.updatePacoPosition(0, 1.0);
    }
    
    /**
     * 📏 Resize chart
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }
    
    /**
     * 🚀 Create Paco rocket element
     */
    createPacoRocket() {
        if (!this.chartContainer) {
            console.warn('⚠️ Chart container not found for Paco rocket');
            return;
        }
        
        // Create Paco rocket element
        this.pacoRocket = document.createElement('img');
        this.pacoRocket.src = '/game/rocket.gif';
        this.pacoRocket.alt = 'Paco Rocket';
        this.pacoRocket.className = 'paco-rocket-chart';
        this.pacoRocket.style.cssText = `
            position: absolute;
            width: 50px;
            height: 50px;
            z-index: 50;
            pointer-events: none;
            transition: all 0.1s ease-out;
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.6));
            transform-origin: center center;
        `;
        
        // Handle image load/error
        this.pacoRocket.onload = () => {
            console.log('🚀 Paco rocket loaded successfully');
            this.updatePacoPosition(0, 1.0); // Set initial position
        };
        
        this.pacoRocket.onerror = () => {
            console.warn('⚠️ Paco rocket GIF failed to load, using emoji fallback');
            this.pacoRocket.style.display = 'none';
            this.createFallbackPaco();
        };
        
        this.chartContainer.appendChild(this.pacoRocket);
        console.log('🚀 Paco rocket added to chart');
    }
    
    /**
     * 🎯 Create fallback Paco if GIF fails
     */
    createFallbackPaco() {
        const fallback = document.createElement('div');
        fallback.textContent = '🚀';
        fallback.className = 'paco-rocket-fallback';
        fallback.style.cssText = `
            position: absolute;
            font-size: 32px;
            z-index: 50;
            pointer-events: none;
            transition: all 0.1s ease-out;
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.6));
            transform-origin: center center;
            line-height: 1;
            text-align: center;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.pacoRocket = fallback;
        this.chartContainer.appendChild(fallback);
        this.updatePacoPosition(0, 1.0); // Set initial position
    }
    
    /**
     * 🎯 Update Paco's position to follow the chart line
     */
    updatePacoPosition(timeElapsed, multiplier) {
        if (!this.pacoRocket || !this.chart || !this.chartContainer) return;
        
        try {
            // Get chart area dimensions
            const chartArea = this.chart.chartArea;
            if (!chartArea) return;
            
            // Calculate position based on chart scales
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;
            
            if (!xScale || !yScale) return;
            
            // Get pixel position on chart
            const xPos = xScale.getPixelForValue(timeElapsed);
            const yPos = yScale.getPixelForValue(multiplier);
            
            // Position Paco above the line
            const containerRect = this.chartContainer.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // Calculate relative position within container
            const relativeX = xPos + (canvasRect.left - containerRect.left);
            const relativeY = yPos + (canvasRect.top - containerRect.top) - 30; // 30px above the line
            
            // Apply position with smooth movement
            this.pacoRocket.style.left = `${relativeX - 25}px`; // Center horizontally (25px = half width)
            this.pacoRocket.style.top = `${relativeY - 25}px`;  // Center vertically (25px = half height)
            
            // Add slight rotation based on multiplier growth - clockwise 10 degrees
            const baseRotation = 10; // Clockwise 10 degrees from horizontal
            const additionalRotation = Math.min((multiplier - 1) * 3, 15); // Slight upward tilt as multiplier increases
            const finalRotation = baseRotation + additionalRotation;
            this.pacoRocket.style.transform = `rotate(${finalRotation}deg)`;
            
        } catch (error) {
            console.warn('Error updating Paco position:', error);
        }
    }
    
    /**
     * 🗑️ Destroy chart
     */
    destroy() {
        // Remove Paco rocket
        if (this.pacoRocket && this.pacoRocket.parentElement) {
            this.pacoRocket.parentElement.removeChild(this.pacoRocket);
        }
        this.pacoRocket = null;
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Global instance
window.CrashChart = CrashChart;

// Don't auto-initialize - let the main game handle this

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrashChart;
}
