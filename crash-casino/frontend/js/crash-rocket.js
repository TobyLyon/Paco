/**
 * 🚀 Crash Game Rocket - Alternative to chart visualization
 * 
 * Uses rocket.gif with smooth animations instead of Chart.js line
 */

class CrashRocket {
    constructor() {
        this.container = null;
        this.rocket = null;
        this.trail = null;
        this.isRunning = false;
        this.roundStartTime = null;
        this.maxDataPoints = 100;
        
        // Container dimensions (will be set dynamically)
        this.containerWidth = 0;
        this.containerHeight = 0;
        
        // Game bounds
        this.maxTime = 30; // Max 30 seconds on X axis
        this.maxMultiplier = 20; // Max 20x on Y axis (will adjust dynamically)
        this.minMultiplier = 1.0;
        
        // Trail system for the "line" effect
        this.trailPoints = [];
        this.maxTrailPoints = 50;
        
        this.init();
    }
    
    /**
     * 🚀 Initialize the rocket system
     */
    init() {
        console.log('🚀 Initializing rocket visualization...');
        
        // Find or create container
        this.container = document.getElementById('rocketContainer');
        if (!this.container) {
            // Create container if it doesn't exist
            this.createContainer();
        }
        
        if (!this.container) {
            console.error('❌ Could not create rocket container');
            return;
        }
        
        // Set up container dimensions
        this.updateDimensions();
        
        // Create rocket element
        this.createRocket();
        
        // Create trail system
        this.createTrail();
        
        console.log('✅ Rocket system initialized');
        console.log('Container dimensions:', this.containerWidth, 'x', this.containerHeight);
    }
    
    /**
     * 📦 Create the rocket container
     */
    createContainer() {
        const graphContainer = document.querySelector('.basically-the-graph');
        if (!graphContainer) {
            console.error('❌ Could not find .basically-the-graph container');
            return;
        }
        
        // Create rocket container
        this.container = document.createElement('div');
        this.container.id = 'rocketContainer';
        this.container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(0,0,0,0.8), rgba(20,20,40,0.9));
            border-radius: 15px;
            overflow: hidden;
            display: none;
        `;
        
        // Create grid canvas as background
        this.createGrid();
        
        graphContainer.appendChild(this.container);
        console.log('✅ Rocket container with grid and multiplier display created');
    }
    

    
    /**
     * 📊 Create grid background
     */
    createGrid() {
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        `;
        
        this.container.appendChild(this.gridCanvas);
        
        // Draw grid after a short delay to ensure container is sized
        setTimeout(() => this.drawGrid(), 100);
    }
    
    /**
     * 📈 Draw grid with axes and numbers
     */
    drawGrid() {
        if (!this.gridCanvas) return;
        
        // Set canvas size to match container
        const rect = this.container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 400;
        
        this.gridCanvas.width = width;
        this.gridCanvas.height = height;
        
        const ctx = this.gridCanvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Grid styling
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
        
        const padding = 40; // Padding for labels
        const graphWidth = width - padding;
        const graphHeight = height - padding;
        
        // Draw vertical grid lines (time axis)
        const timeSteps = 10;
        for (let i = 0; i <= timeSteps; i++) {
            const x = padding + (i / timeSteps) * graphWidth;
            
            // Grid line
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, graphHeight);
            ctx.stroke();
            
            // Time labels (bottom)
            if (i > 0) {
                const seconds = (i * 3); // 3 second intervals
                ctx.fillText(`${seconds}s`, x - 8, height - 8);
            }
        }
        
        // Draw horizontal grid lines (multiplier axis)
        const multiplierSteps = 8;
        for (let i = 0; i <= multiplierSteps; i++) {
            const y = graphHeight - (i / multiplierSteps) * graphHeight;
            
            // Grid line
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            // Multiplier labels (left side)
            if (i > 0) {
                const multiplier = (i * 2.5).toFixed(1); // 2.5x intervals
                ctx.fillText(`${multiplier}x`, 5, y + 4);
            }
        }
        
        // Draw main axes
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 2;
        
        // Y-axis (left)
        ctx.beginPath();
        ctx.moveTo(padding, 0);
        ctx.lineTo(padding, graphHeight);
        ctx.stroke();
        
        // X-axis (bottom)
        ctx.beginPath();
        ctx.moveTo(padding, graphHeight);
        ctx.lineTo(width, graphHeight);
        ctx.stroke();
        
        // Axis labels
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
        ctx.fillText('Multiplier', 5, 15);
        ctx.fillText('Time', width - 35, height - 5);
    }
    
    /**
     * 🚀 Create the rocket element
     */
    createRocket() {
        this.rocket = document.createElement('img');
        this.rocket.id = 'rocketGif';
        this.rocket.src = '/game/rocket.gif';
        this.rocket.alt = 'Rocket';
        this.rocket.style.cssText = `
            position: absolute;
            width: 60px;
            height: 60px;
            object-fit: contain;
            z-index: 10;
            transition: transform 0.05s linear;
            filter: drop-shadow(0 0 15px #10b981);
            transform-origin: center center;
        `;
        
        // Handle image load
        this.rocket.onload = () => {
            console.log('✅ Rocket GIF loaded successfully');
        };
        
        this.rocket.onerror = () => {
            console.error('❌ Failed to load rocket GIF');
            // Fallback to emoji
            this.rocket.style.display = 'none';
            this.createFallbackRocket();
        };
        
        this.container.appendChild(this.rocket);
    }
    
    /**
     * 🎯 Create fallback rocket if GIF fails
     */
    createFallbackRocket() {
        const fallback = document.createElement('div');
        fallback.textContent = '🚀';
        fallback.style.cssText = `
            position: absolute;
            font-size: 40px;
            z-index: 10;
            transition: transform 0.05s linear;
            filter: drop-shadow(0 0 15px #10b981);
            transform-origin: center center;
            line-height: 1;
            text-align: center;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        this.rocket = fallback;
        this.container.appendChild(fallback);
        console.log('✅ Fallback rocket emoji created');
    }
    
    /**
     * ✨ Create trail system
     */
    createTrail() {
        this.trail = document.createElement('svg');
        this.trail.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            pointer-events: none;
        `;
        
        // Create path element for the trail
        this.trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.trailPath.style.cssText = `
            fill: none;
            stroke: #10b981;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 10px #10b981);
        `;
        
        this.trail.appendChild(this.trailPath);
        this.container.appendChild(this.trail);
    }
    
    /**
     * 📏 Update container dimensions
     */
    updateDimensions() {
        if (!this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        this.containerWidth = rect.width || this.container.offsetWidth || 800;
        this.containerHeight = rect.height || this.container.offsetHeight || 400;
        
        // If dimensions are still 0, use parent dimensions
        if (this.containerWidth === 0 || this.containerHeight === 0) {
            const parent = this.container.parentElement;
            if (parent) {
                const parentRect = parent.getBoundingClientRect();
                this.containerWidth = parentRect.width || 800;
                this.containerHeight = parentRect.height || 400;
            }
        }
        
        console.log(`📏 Container dimensions: ${this.containerWidth}x${this.containerHeight}`);
    }
    
    /**
     * 🎮 Start a new round
     */
    startRound() {
        console.log('🚀 Rocket: Starting new round');
        
        this.isRunning = true;
        this.roundStartTime = Date.now();
        
        // Update dimensions in case container was resized
        this.updateDimensions();
        
        // Reset trail
        this.trailPoints = [];
        this.updateTrail();
        
        // Reset rocket appearance
        this.updateRocketEffect(1.0);
        
        // Position rocket at center (starting point)
        this.updatePosition(0, 1.0);
        
        console.log('✅ Rocket round started at center position');
    }
    
    /**
     * 🔄 Start new round (alias for compatibility)
     */
    startNewRound() {
        this.startRound();
    }
    
    /**
     * 📊 Add data point (equivalent to chart's addDataPoint)
     */
    addDataPoint(timeElapsed, multiplier) {
        if (!this.isRunning) return;
        
        // Update rocket position
        this.updatePosition(timeElapsed, multiplier);
        
        // Add to trail
        this.addTrailPoint(timeElapsed, multiplier);
        
        // Update visual effects based on multiplier
        this.updateRocketEffect(multiplier);
        
        // Adjust max multiplier if needed
        if (multiplier > this.maxMultiplier * 0.8) {
            this.maxMultiplier = Math.max(this.maxMultiplier, multiplier * 1.5);
        }
    }
    
    /**
     * 🎯 Update rocket position - properly center Paco and fix glitching
     */
    updatePosition(timeElapsed, multiplier) {
        if (!this.rocket || this.containerWidth === 0 || this.containerHeight === 0) return;
        
        const padding = 50; // Slightly more padding for better positioning
        const graphWidth = this.containerWidth - (padding * 2);
        const graphHeight = this.containerHeight - (padding * 2);
        const rocketSize = 60;
        
        // Calculate safe area within the graph bounds
        const safeGraphWidth = graphWidth - rocketSize;
        const safeGraphHeight = graphHeight - rocketSize;
        
        // For starting position (timeElapsed = 0), center Paco horizontally and vertically
        if (timeElapsed === 0 || timeElapsed < 0.1) {
            const centerX = padding + (graphWidth / 2) - (rocketSize / 2);
            const centerY = padding + (graphHeight / 2) - (rocketSize / 2); // Center vertically too
            
            this.rocket.style.transform = `translate(${centerX}px, ${centerY}px) rotate(45deg)`;
            return;
        }
        
        // Calculate X position based on time (left to right, within safe graph area)
        const xProgress = Math.min(timeElapsed / this.maxTime, 1);
        const xPos = padding + (xProgress * safeGraphWidth);
        
        // Calculate Y position based on multiplier (center to top, within safe graph area)
        // Start from center (50%) and go up as multiplier increases
        const yProgress = Math.min((multiplier - this.minMultiplier) / (this.maxMultiplier - this.minMultiplier), 1);
        const centerY = padding + (graphHeight / 2); // Center line
        const yPos = centerY - (yProgress * (centerY - padding)); // Move up from center
        
        // Apply smooth movement with transform
        this.rocket.style.transform = `translate(${xPos}px, ${yPos}px) rotate(45deg)`;
        
        // Add slight animation based on multiplier growth
        const scale = 1 + (multiplier - 1) * 0.03; // Reduced scaling to prevent glitching
        this.rocket.style.transform += ` scale(${Math.min(scale, 1.3)})`;
        

    }
    

    
    /**
     * ✨ Add point to trail - match rocket positioning
     */
    addTrailPoint(timeElapsed, multiplier) {
        if (this.containerWidth === 0 || this.containerHeight === 0) return;
        
        const padding = 50; // Match rocket positioning
        const graphWidth = this.containerWidth - (padding * 2);
        const graphHeight = this.containerHeight - (padding * 2);
        const rocketSize = 60;
        
        // Skip trail for initial position (center)
        if (timeElapsed === 0 || timeElapsed < 0.1) {
            return;
        }
        
        // Calculate position to match rocket movement
        const xProgress = Math.min(timeElapsed / this.maxTime, 1);
        const xPos = padding + (xProgress * (graphWidth - rocketSize)) + (rocketSize / 2); // Center of rocket
        
        const yProgress = Math.min((multiplier - this.minMultiplier) / (this.maxMultiplier - this.minMultiplier), 1);
        const centerY = padding + (graphHeight / 2);
        const yPos = centerY - (yProgress * (centerY - padding)) + (rocketSize / 2); // Center of rocket
        
        // Add point to trail
        this.trailPoints.push({ x: xPos, y: yPos });
        
        // Limit trail length for performance
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // Update trail path
        this.updateTrail();
    }
    
    /**
     * 🌟 Update trail visualization
     */
    updateTrail() {
        if (!this.trailPath || this.trailPoints.length < 2) return;
        
        // Create SVG path from points
        let pathData = `M ${this.trailPoints[0].x} ${this.trailPoints[0].y}`;
        
        for (let i = 1; i < this.trailPoints.length; i++) {
            pathData += ` L ${this.trailPoints[i].x} ${this.trailPoints[i].y}`;
        }
        
        this.trailPath.setAttribute('d', pathData);
    }
    
    /**
     * 🎨 Update rocket visual effects based on multiplier
     */
    updateRocketEffect(multiplier) {
        if (!this.rocket) return;
        
        let color, intensity;
        
        if (multiplier < 2) {
            color = '#10b981'; // Green
            intensity = 15;
        } else if (multiplier < 5) {
            color = '#fbbf24'; // Yellow
            intensity = 20;
        } else if (multiplier < 10) {
            color = '#f97316'; // Orange
            intensity = 25;
        } else {
            color = '#dc2626'; // Red
            intensity = 30;
        }
        
        // Update rocket glow
        this.rocket.style.filter = `drop-shadow(0 0 ${intensity}px ${color})`;
        
        // Update trail color
        if (this.trailPath) {
            this.trailPath.style.stroke = color;
            this.trailPath.style.filter = `drop-shadow(0 0 ${intensity/2}px ${color})`;
        }
    }
    
    /**
     * 📈 Update with new multiplier (compatibility with chart system)
     */
    updateMultiplier(multiplier) {
        if (!this.isRunning || !this.roundStartTime) return;
        
        const timeElapsed = (Date.now() - this.roundStartTime) / 1000;
        this.addDataPoint(timeElapsed, multiplier);
    }
    
    /**
     * 💥 Handle round crash
     */
    crashRound(crashPoint) {
        console.log(`💥 Rocket: Round crashed at ${crashPoint}x`);
        
        this.isRunning = false;
        
        // Add final crash effect
        this.updateRocketEffect(crashPoint);
        
        // Add crash explosion effect
        if (this.rocket) {
            this.rocket.style.filter += ' brightness(2) contrast(1.5)';
            this.rocket.style.transform += ' scale(1.5)';
            
            // Reset after animation
            setTimeout(() => {
                if (this.rocket) {
                    this.rocket.style.filter = this.rocket.style.filter.replace(' brightness(2) contrast(1.5)', '');
                }
            }, 500);
        }
    }
    
    /**
     * 🔄 Reset rocket system
     */
    reset() {
        console.log('🔄 Rocket: Resetting');
        
        this.isRunning = false;
        this.roundStartTime = null;
        this.trailPoints = [];
        this.maxMultiplier = 20;
        
        // Reset to center position (both horizontally and vertically)
        if (this.rocket && this.containerWidth > 0 && this.containerHeight > 0) {
            const padding = 50;
            const graphWidth = this.containerWidth - (padding * 2);
            const graphHeight = this.containerHeight - (padding * 2);
            const rocketSize = 60;
            
            // Center both horizontally and vertically
            const centerX = padding + (graphWidth / 2) - (rocketSize / 2);
            const centerY = padding + (graphHeight / 2) - (rocketSize / 2);
            
            this.rocket.style.transform = `translate(${centerX}px, ${centerY}px) rotate(45deg) scale(1)`;
        }
        
        this.updateTrail();
        this.updateRocketEffect(1.0);
    }
    
    /**
     * 📏 Resize rocket system
     */
    resize() {
        this.updateDimensions();
        
        // Redraw grid with new dimensions
        if (this.gridCanvas) {
            setTimeout(() => this.drawGrid(), 100);
        }
        
        console.log('📏 Rocket resized to:', this.containerWidth, 'x', this.containerHeight);
    }
    
    /**
     * 🗑️ Destroy rocket system
     */
    destroy() {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        this.container = null;
        this.rocket = null;
        this.trail = null;
        this.trailPath = null;
        this.gridCanvas = null;
    }
}

// Global instance
window.CrashRocket = CrashRocket;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrashRocket;
}
