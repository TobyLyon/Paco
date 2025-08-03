// ===== PACO JUMP - MAIN GAME ENGINE =====

/**
 * Main Game Engine
 * Coordinates all game systems and manages the game loop
 * Designed for 60fps performance on mobile devices
 */

class PacoJumpGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'waiting'; // waiting, playing, paused, gameOver
        this.lastFrameTime = 0;
        // Consistent 60fps for smooth gameplay
        this.targetFPS = 60; // Always 60fps for best performance
        this.frameInterval = 1000 / this.targetFPS;
        
        // Game objects
        this.player = null;
        this.platforms = [];
        this.particles = [];
        this.camera = { y: 0, maxY: 0 };
        
        // Power-up system
        this.powerups = [];
        this.activePowerups = new Map(); // Track active power-up effects
        
        // Game state
        this.score = 0;
        this.bestScore = 0;
        this.gameStartY = 0;
        this.isGameRunning = false;
        this.isPaused = false;
        
        // Scoring enhancements for competition
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastCollectionTime = 0;
        this.platformStreak = 0;
        
        // Input handling
        this.keys = {};
        this.touches = {};
        this.mousePressed = false;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsDisplay = 0;
        this.lastFPSTime = 0;
        
        console.log('🎮 Paco Jump game engine initialized');
    }

    // Detect mobile device for performance optimizations
    detectMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768 ||
               'ontouchstart' in window;
    }

    // Initialize game with robust error handling
    async initialize() {
        try {
            console.log('🎮 Initializing Paco Jump game...');
            
            // Show loading message
            this.showOverlay('<h3>🎨 Loading Game Assets...</h3><p>Please wait while we load your custom sprites!</p>');
            
            // Wait for assets to load with timeout protection
            let loadingAttempts = 0;
            const maxAttempts = 60; // 6 seconds max
            
            while (!gameAssets.isReady() && loadingAttempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                loadingAttempts++;
                
                // Update loading progress if available
                if (gameAssets.loadingProgress > 0) {
                    this.showOverlay(`
                        <h3>🎨 Loading Game Assets...</h3>
                        <p>Progress: ${gameAssets.loadingProgress.toFixed(0)}%</p>
                        <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; margin: 10px 0;">
                            <div style="background: #fbbf24; height: 100%; width: ${gameAssets.loadingProgress}%; border-radius: 2px; transition: width 0.3s ease;"></div>
                        </div>
                    `);
                }
            }
            
            // Force proceed even if some assets fail (graceful degradation)
            if (!gameAssets.isReady()) {
                console.warn('⚠️ Asset loading timeout - proceeding with fallbacks');
            }
            
            // Get canvas and context with validation
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                throw new Error('Game canvas not found - check HTML structure');
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Unable to get canvas 2D context - browser may not support Canvas API');
            }
            
            // Validate canvas dimensions
            if (!this.canvas.width || !this.canvas.height) {
                console.warn('⚠️ Canvas dimensions not set, using defaults');
                this.canvas.width = 320;
                this.canvas.height = 480;
            }
            
            // Set up canvas properties
            this.setupCanvas();
            
            // Initialize game objects with error protection
            this.resetGame();
            
            // Set up input handlers
            this.setupInputHandlers();
            
            // Set up UI handlers  
            this.setupUIHandlers();
            
            // Load best score (non-critical)
            try {
                this.loadBestScore();
            } catch (e) {
                console.warn('⚠️ Failed to load best score:', e.message);
            }
            
            // Initialize leaderboard (non-critical)
            try {
                if (typeof leaderboard !== 'undefined') {
                    await leaderboard.initialize();
                    console.log('✅ Leaderboard initialized');
                } else {
                    console.warn('⚠️ Leaderboard module not available');
                }
            } catch (e) {
                console.warn('⚠️ Leaderboard initialization failed:', e.message);
            }
            
            // Show start instructions
            this.showStartInstructions();
            
            // Start game loop
            this.startGameLoop();
            
            console.log('✅ Game initialized successfully with custom assets');
            
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.showError('Failed to initialize game: ' + error.message + 
                         '<br><br>Please refresh the page and try again.');
        }
    }

    // Set up canvas properties
    setupCanvas() {
        // Set canvas size from config
        const config = gameAssets.config.canvas;
        this.canvas.width = config.width;
        this.canvas.height = config.height;
        
        // Set CSS size for responsive design
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.maxWidth = config.width + 'px';
        this.canvas.style.maxHeight = config.height + 'px';
        
        // Disable image smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        
        // Set text rendering properties
        this.ctx.textBaseline = 'top';
    }

    // Reset game to initial state
    resetGame() {
        // Reset player
        this.player = {
            x: this.canvas.width / 2 - gameAssets.config.player.width / 2,
            y: this.canvas.height - 150,
            width: gameAssets.config.player.width,
            height: gameAssets.config.player.height,
            velocityX: 0,
            velocityY: 0,
            rotation: 0,
            trail: [],
            grounded: false,
            // Flying mechanics
            isFlying: false,
            flyingTimeLeft: 0,
            flyingPower: 0.15,
            flyingJustActivated: false,
            // Timing bounce mechanics
            timingWindow: false,
            timingWindowStart: 0,
            perfectBounceReady: false,
            lastSpacebarTime: 0
        };
        
        // Reset game state
        this.score = 0;
        this.gameStartY = this.player.y;
        this.camera.y = 0;
        this.camera.maxY = 0;
        this.platforms = [];
        this.particles = [];
        this.tacos = []; // Collectible bonus tacos! 🌮
        this.powerups = []; // Collectible power-ups! ⚡
        this.activePowerups.clear(); // Clear all active power-up effects
        
        // Touch timing for mobile timing bounce
        this.centerTouchStart = 0;
        this.centerTouchActive = false;
        
        // Generate initial platforms
        this.generateInitialPlatforms();
        
        // Generate initial tacos
        this.generateInitialTacos();
        
        // Generate initial power-ups
        this.generateInitialPowerups();
        
        // Update UI
        this.updateScoreDisplay();
        
        console.log('🎮 Game reset');
    }

    // Generate initial platforms
    generateInitialPlatforms() {
        const platformConfig = gameAssets.config.platform;
        
        // Starting platform (under player) - extra wide for beginners
        this.platforms.push({
            x: this.player.x - 60, // Wider on both sides
            y: this.player.y + this.player.height + 10,
            width: platformConfig.width + 120, // Much wider platform
            height: platformConfig.height,
            type: 'normal',
            touched: false,
            broken: false
        });
        
        // Generate platforms going up
        const newPlatforms = gamePhysics.generatePlatforms(
            this.player.y - 100,
            this.player.y - 2000,
            this.canvas.width
        );
        
        this.platforms.push(...newPlatforms);
        
        console.log(`Generated ${this.platforms.length} initial platforms`);
    }

    // Generate initial tacos for collection
    generateInitialTacos() {
        // Generate tacos scattered throughout the level
        const tacoCount = 15; // Start with some tacos
        
        for (let i = 0; i < tacoCount; i++) {
            // Random position in the upper area
            const x = Math.random() * (this.canvas.width - 20);
            const y = this.player.y - 200 - (i * 150) - Math.random() * 100;
            
            this.tacos.push({
                x: x,
                y: y,
                width: 20,
                height: 20,
                collected: false,
                pulseTime: Math.random() * Math.PI * 2, // For pulsing animation
                bobOffset: Math.random() * Math.PI * 2  // For bobbing animation
            });
        }
        
        console.log(`Generated ${this.tacos.length} collectible tacos 🌮`);
    }

    // Generate initial power-ups for collection
    generateInitialPowerups() {
        // Generate much fewer power-ups than tacos (they're special!)
        const powerupCount = 3; // Start with fewer power-ups
        const powerupTypes = Object.keys(gameAssets.powerUpTypes);
        
        for (let i = 0; i < powerupCount; i++) {
            // Random position in the upper area, spread out more than tacos
            const x = Math.random() * (this.canvas.width - 25);
            const y = this.player.y - 600 - (i * 500) - Math.random() * 300; // Much more spread out
            
            // Select random power-up type based on rarity
            const randomType = this.selectRandomPowerupType();
            
            this.powerups.push({
                x: x,
                y: y,
                width: 25, // Slightly larger than tacos
                height: 25,
                type: randomType,
                collected: false,
                pulseTime: Math.random() * Math.PI * 2, // For pulsing animation
                bobOffset: Math.random() * Math.PI * 2  // For bobbing animation
            });
        }
        
        console.log(`Generated ${this.powerups.length} collectible power-ups ⚡`);
    }

    // Select random power-up type based on rarity weights
    selectRandomPowerupType() {
        const types = Object.keys(gameAssets.powerUpTypes);
        const weights = types.map(type => gameAssets.powerUpTypes[type].rarity);
        
        // Create cumulative weight array
        const cumulativeWeights = [];
        let totalWeight = 0;
        for (let weight of weights) {
            totalWeight += weight;
            cumulativeWeights.push(totalWeight);
        }
        
        // Select based on random number
        const random = Math.random() * totalWeight;
        for (let i = 0; i < cumulativeWeights.length; i++) {
            if (random <= cumulativeWeights[i]) {
                return types[i];
            }
        }
        
        // Fallback to first type
        return types[0];
    }

    // Start game
    startGame() {
        if (this.gameState === 'playing') return;
        
        this.gameState = 'playing';
        this.isGameRunning = true;
        this.isPaused = false;
        
        // Reset if coming from game over
        if (this.gameState !== 'paused') {
            this.resetGame();
        }
        
        // Hide overlay
        this.hideOverlay();
        
        // Play start sound
        this.playSound('jump');
        
        // Show brief message about custom assets if loaded
        if (gameAssets.isReady() && gameAssets.images.jump) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    // Show a brief notification about the custom sprites
                    if (typeof showNotification === 'function') {
                        showNotification('🎨 Custom Paco sprites loaded! Use ⬅️➡️ to see directional animations!');
                    }
                }
            }, 1000);
        }
        
        console.log('🚀 Game started with custom assets');
    }

    // Pause game
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.isPaused = true;
        this.gameState = 'paused';
        
        this.showOverlay(`
            <h3>⏸️ Game Paused</h3>
            <button onclick="game.resumeGame()" class="game-btn primary">Resume</button>
            <button onclick="game.endGame()" class="game-btn secondary">End Game</button>
        `);
        
        console.log('⏸️ Game paused');
    }

    // Resume game
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.isPaused = false;
        this.gameState = 'playing';
        this.hideOverlay();
        
        console.log('▶️ Game resumed');
    }

    // End game
    endGame() {
        this.isGameRunning = false;
        this.gameState = 'gameOver';
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }
        
        // Show game over screen
        this.showGameOverScreen();
        
        // Play game over sound
        this.playSound('fall');
        
        console.log(`🎯 Game ended - Score: ${this.score}`);
    }

    // Main game loop - optimized for consistent 60fps
    gameLoop(currentTime) {
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // Calculate delta time with stability
        if (this.lastFrameTime === 0) this.lastFrameTime = currentTime;
        let deltaTime = currentTime - this.lastFrameTime;
        
        // Clamp delta time to prevent large jumps (pause recovery, tab switches)
        deltaTime = Math.min(deltaTime, 50); // Max 50ms delta (20fps minimum)
        
        // Limit frame rate for consistent performance
        if (deltaTime < this.frameInterval) {
            return;
        }
        
        this.lastFrameTime = currentTime;
        
        // Update FPS counter
        this.updateFPSCounter(currentTime);
        
        // Only update game if playing
        if (this.gameState === 'playing' && !this.isPaused) {
            this.update(deltaTime);
        }
        
        // Always render (but with optimizations)
        this.render();
    }

    // Update game state
    update(deltaTime) {
        const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps
        
        // Update player physics
        gamePhysics.updatePlayer(this.player, normalizedDelta, this.canvas.width);
        
        // Check for flying sound trigger
        if (this.player.flyingJustActivated) {
            this.playSound('flying');
            this.player.flyingJustActivated = false; // Reset flag
        }
        
        // Update platforms
        this.platforms.forEach(platform => {
            gamePhysics.updatePlatform(platform, normalizedDelta, this.canvas.width);
        });
        
        // Check platform collisions
        this.checkCollisions();
        
        // Update camera
        const targetY = gamePhysics.getCameraTarget(this.player, this.canvas.height);
        gamePhysics.updateCamera(this.camera, targetY, normalizedDelta);
        
        // Update score
        this.updateScore();
        
        // Update combo timer
        this.updateComboSystem();
        
        // Update particles with better memory management
        gamePhysics.updateParticles(this.particles, normalizedDelta);
        
        // Clean up excessive particles for performance
        if (this.particles.length > 150) {
            this.particles.splice(100); // Keep only the newest 100 particles
        }
        
        // Generate new platforms as player goes higher
        this.manageActivePlatforms();
        
        // Generate new tacos as player goes higher
        this.manageTacos();
        
        // Generate new power-ups as player goes higher
        this.managePowerups();
        
        // Update active power-up effects
        this.updateActivePowerups(normalizedDelta);
        
        // Check for game over
        this.checkGameOver();
        
        // Handle input
        this.handleInput(normalizedDelta);
    }

    // Check collisions
    checkCollisions() {
        this.player.grounded = false;
        
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            
            // Skip broken platforms
            if (platform.broken) {
                this.platforms.splice(i, 1);
                continue;
            }
            
            // Check collision
            if (gamePhysics.checkPlatformCollision(this.player, platform)) {
                // Special handling for evil platforms
                if (platform.type === 'evil') {
                    if (this.player.isFlying && this.activePowerups.has('corn')) {
                        // Player has corn power-up - can defeat evil flocko!
                        this.defeatEvilFlocko(platform, i);
                        continue;
                    } else {
                        // Player gets hurt by evil flocko
                        this.handleEvilFlockoDamage(platform);
                        return; // Exit early to prevent normal platform behavior
                    }
                }
                
                // Normal platform handling
                const jumpResult = gamePhysics.handlePlatformJump(this.player, platform);
                
                // Mark platform as touched
                if (!platform.touched) {
                    platform.touched = true;
                    
                    // Create particles
                    const particles = gamePhysics.createJumpParticles(
                        platform.x + platform.width/2,
                        platform.y,
                        platform.type === 'spring' ? 'spark' : 'feather'
                    );
                    this.particles.push(...particles);
                    
                    // Play sound based on platform type
                    this.playSound(platform.type === 'spring' ? 'bounce' : 'platform');
                }
                
                this.player.grounded = true;
                break;
            }
        }
        
        // Check taco collisions
        this.tacos.forEach(taco => {
            if (this.checkTacoCollision(taco)) {
                this.collectTaco(taco);
            }
        });
        
        // Check power-up collisions
        this.powerups.forEach(powerup => {
            if (this.checkPowerupCollision(powerup)) {
                this.collectPowerup(powerup);
            }
        });
    }

    // Update score
    updateScore() {
        const newScore = gamePhysics.calculateScore(this.player.y, this.gameStartY);
        if (newScore > this.score) {
            this.score = newScore;
            this.updateScoreDisplay();
            
            // Play score sound occasionally
            if (this.score % 100 === 0) {
                this.playSound('score');
            }
        }
    }

    // Update combo system
    updateComboSystem() {
        const currentTime = Date.now();
        
        // Reset combo if timer expired
        if (this.comboTimer > 0 && currentTime > this.comboTimer) {
            this.comboCount = 0;
            this.comboTimer = 0;
        }
    }

    // Manage active platforms (generate new ones, remove old ones)
    manageActivePlatforms() {
        // Remove platforms far below camera
        const removeY = this.camera.y + this.canvas.height + 200;
        this.platforms = this.platforms.filter(platform => platform.y < removeY);
        
        // Generate new platforms above if needed
        const topPlatform = this.platforms.reduce((highest, platform) => 
            platform.y < highest.y ? platform : highest, { y: Infinity });
        
        const generateY = this.camera.y - this.canvas.height - 500;
        
        if (topPlatform.y > generateY) {
            const newPlatforms = gamePhysics.generatePlatforms(
                topPlatform.y - 100,
                generateY,
                this.canvas.width
            );
            this.platforms.push(...newPlatforms);
        }
    }

    // Manage active tacos (generate new ones, remove old ones)
    manageTacos() {
        // Remove collected tacos and tacos far below camera
        const removeY = this.camera.y + this.canvas.height + 200;
        this.tacos = this.tacos.filter(taco => !taco.collected && taco.y < removeY);
        
        // Generate new tacos above if needed
        const currentTopY = this.camera.y - this.canvas.height - 500;
        const existingTacosAbove = this.tacos.filter(taco => taco.y < currentTopY);
        
        if (existingTacosAbove.length < 5) {
            // Generate some tacos in the new area
            const tacosToGenerate = 8;
            
            for (let i = 0; i < tacosToGenerate; i++) {
                const x = Math.random() * (this.canvas.width - 20);
                const y = currentTopY - (i * 200) - Math.random() * 150;
                
                this.tacos.push({
                    x: x,
                    y: y,
                    width: 20,
                    height: 20,
                    collected: false,
                    pulseTime: Math.random() * Math.PI * 2,
                    bobOffset: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // Manage active power-ups (generate new ones, remove old ones)
    managePowerups() {
        // Remove collected power-ups and power-ups far below camera
        const removeY = this.camera.y + this.canvas.height + 200;
        this.powerups = this.powerups.filter(powerup => !powerup.collected && powerup.y < removeY);
        
        // Generate new power-ups above if needed
        const currentTopY = this.camera.y - this.canvas.height - 500;
        const existingPowerupsAbove = this.powerups.filter(powerup => powerup.y < currentTopY);
        
        if (existingPowerupsAbove.length < 2) { // Keep even fewer power-ups
            // Generate some power-ups in the new area based on spawn chance
            const spawnChance = gameAssets.config.powerups.spawnChance;
            const powerupsToGenerate = 2; // Generate fewer at a time
            
            for (let i = 0; i < powerupsToGenerate; i++) {
                // Only spawn if random chance succeeds
                if (Math.random() < spawnChance) {
                    const x = Math.random() * (this.canvas.width - 25);
                    const y = currentTopY - (i * 600) - Math.random() * 400; // Much more spread out
                    
                    const randomType = this.selectRandomPowerupType();
                    
                    this.powerups.push({
                        x: x,
                        y: y,
                        width: 25,
                        height: 25,
                        type: randomType,
                        collected: false,
                        pulseTime: Math.random() * Math.PI * 2,
                        bobOffset: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    }

    // Check for game over conditions
    checkGameOver() {
        // More forgiving death zone near starting area
        const distanceFromStart = Math.abs(this.player.y - this.gameStartY);
        let deathBuffer = 100; // Default death buffer
        
        // If player is still near starting area (within 200 pixels), be much more forgiving
        if (distanceFromStart < 200) {
            deathBuffer = 400; // 4x more forgiving at start
        } else if (distanceFromStart < 500) {
            deathBuffer = 250; // 2.5x more forgiving in early game
        }
        
        // Game over if player falls too far below camera
        if (this.player.y > this.camera.y + this.canvas.height + deathBuffer) {
            this.endGame();
        }
    }

    // Handle input
    handleInput(deltaTime) {
        const moveSpeed = gameAssets.config.player.maxSpeed;
        let moveDirection = 0;
        
        // Keyboard input
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            moveDirection -= 1;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            moveDirection += 1;
        }
        
        // Touch/mouse input
        if (this.touches.left || (this.mousePressed && this.lastMouseX < this.canvas.width / 2)) {
            moveDirection -= 1;
        }
        if (this.touches.right || (this.mousePressed && this.lastMouseX >= this.canvas.width / 2)) {
            moveDirection += 1;
        }
        
        // Apply movement with responsive acceleration
        if (moveDirection !== 0) {
            const acceleration = 1.5; // Tuned for Doodle Jump feel (very responsive)
            this.player.velocityX += moveDirection * acceleration * deltaTime;
            
            // Clamp to max speed for consistent control
            this.player.velocityX = Math.max(-moveSpeed, 
                                           Math.min(moveSpeed, this.player.velocityX));
        }
    }

    // Render game - optimized for performance
    render() {
        // Clear canvas efficiently
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(0, -this.camera.y);
        
        // Calculate viewport bounds for culling
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.canvas.height + 50;
        
        // Draw background
        gameAssets.drawBackground(this.ctx, this.canvas.width, this.canvas.height, this.camera.y);
        
        // Draw platforms (with optimized culling)
        for (let i = 0; i < this.platforms.length; i++) {
            const platform = this.platforms[i];
            if (platform.y >= viewTop && platform.y <= viewBottom) {
                gameAssets.drawPlatform(
                    this.ctx,
                    platform.x,
                    platform.y,
                    platform.width,
                    platform.height,
                    platform.type
                );
            }
        }
        
        // Draw collectible tacos (with optimized culling)
        for (let i = 0; i < this.tacos.length; i++) {
            const taco = this.tacos[i];
            if (!taco.collected && taco.y >= viewTop && taco.y <= viewBottom) {
                gameAssets.drawTaco(this.ctx, taco);
            }
        }
        
        // Draw collectible power-ups (with optimized culling)
        for (let i = 0; i < this.powerups.length; i++) {
            const powerup = this.powerups[i];
            if (!powerup.collected && powerup.y >= viewTop && powerup.y <= viewBottom) {
                gameAssets.drawPowerup(this.ctx, powerup);
            }
        }
        
        // Draw particles (batch for efficiency)
        if (this.particles.length > 0) {
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                if (particle.y >= viewTop && particle.y <= viewBottom) {
                    gameAssets.drawParticle(
                        this.ctx,
                        particle.x,
                        particle.y,
                        particle.size,
                        particle.type,
                        particle.alpha
                    );
                }
            }
        }
        
        // Draw player trail (optimized)
        if (this.player.trail && this.player.trail.length > 0) {
            for (let i = 0; i < this.player.trail.length; i++) {
                const point = this.player.trail[i];
                gameAssets.drawParticle(
                    this.ctx,
                    point.x,
                    point.y,
                    3 - (i * 0.5),
                    'trail',
                    point.alpha
                );
            }
        }
        
        // Draw flying effects behind player
        if (this.player.isFlying && this.player.flyingTimeLeft > 0) {
            this.drawFlyingEffects();
        }
        
        // Draw player (with velocity for sprite selection)
        gameAssets.drawPlayer(
            this.ctx,
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height,
            this.player.rotation,
            this.player.velocityX
        );
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI (not affected by camera)
        this.drawUI();
    }

    // Draw flying effects (behind player)
    drawFlyingEffects() {
        this.ctx.save();
        
        // Create sparkle particles around player
        const time = Date.now();
        const sparkles = 6;
        
        for (let i = 0; i < sparkles; i++) {
            const angle = (time * 0.01 + i * (Math.PI * 2 / sparkles)) % (Math.PI * 2);
            const radius = 25 + Math.sin(time * 0.005 + i) * 8;
            
            const sparkleX = this.player.x + this.player.width/2 + Math.cos(angle) * radius;
            const sparkleY = this.player.y + this.player.height/2 + Math.sin(angle) * radius;
            
            // Draw sparkle
            this.ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + Math.sin(time * 0.008 + i) * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, 2 + Math.sin(time * 0.01 + i) * 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    // Flying glow removed - no aura effects
    
    // Check if platform is in view
    isPlatformInView(platform) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.canvas.height + 50;
        return platform.y >= viewTop && platform.y <= viewBottom;
    }

    // Check if taco is in view
    isTacoInView(taco) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.canvas.height + 50;
        return taco.y >= viewTop && taco.y <= viewBottom;
    }

    // Check if power-up is in view
    isPowerupInView(powerup) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.canvas.height + 50;
        return powerup.y >= viewTop && powerup.y <= viewBottom;
    }

    // Check collision between player and taco
    checkTacoCollision(taco) {
        if (taco.collected) return false;
        
        // Account for 3x bigger taco size with padding for easier collection
        const tacoScale = 3.0; // Tacos are now 3x bigger (96px vs 32px)
        const scaledWidth = taco.width * tacoScale;
        const scaledHeight = taco.height * tacoScale;
        const padding = 16; // More padding for bigger tacos
        
        // Center the scaled taco
        const tacoX = taco.x - (scaledWidth - taco.width) / 2;
        const tacoY = taco.y - (scaledHeight - taco.height) / 2;
        
        return (
            this.player.x < tacoX + scaledWidth + padding &&
            this.player.x + this.player.width > tacoX - padding &&
            this.player.y < tacoY + scaledHeight + padding &&
            this.player.y + this.player.height > tacoY - padding
        );
    }

    // Collect a taco and award points with combo system
    collectTaco(taco) {
        if (taco.collected) return;
        
        taco.collected = true;
        
        // Base bonus points
        let bonus = gameAssets.config.score.tacoBonus;
        
        // Check for combo (collected within 2 seconds of last collection)
        const currentTime = Date.now();
        if (currentTime - this.lastCollectionTime < 2000) {
            this.comboCount++;
            this.comboTimer = currentTime + 3000; // 3 second combo window
            bonus = Math.floor(bonus * (1 + this.comboCount * 0.2)); // 20% bonus per combo
        } else {
            this.comboCount = 0;
        }
        this.lastCollectionTime = currentTime;
        
        this.score += bonus;
        this.updateScoreDisplay();
        
        // Play collection sound
        this.playSound('taco');
        
        // Create collection particles
        this.createTacoCollectionEffect(taco);
        
        // Show combo feedback
        if (this.comboCount > 0) {
            console.log(`🌮 Taco collected! +${bonus} points (${this.comboCount + 1}x COMBO!)`);
        } else {
            console.log(`🌮 Taco collected! +${bonus} points`);
        }
    }

    // Check if player is in timing window for perfect bounce
    checkTimingBounce() {
        // Must be falling towards a platform
        if (this.player.velocityY <= 0) return false;
        
        // Check if close to any platform
        const timingDistance = 60; // Distance from platform to start timing window
        
        for (let platform of this.platforms) {
            // Skip broken platforms
            if (platform.broken) continue;
            
            // Check if player is above platform and close enough
            const playerBottom = this.player.y + this.player.height;
            const playerCenterX = this.player.x + this.player.width / 2;
            
            if (playerCenterX >= platform.x && 
                playerCenterX <= platform.x + platform.width &&
                playerBottom >= platform.y - timingDistance &&
                playerBottom <= platform.y + 20) {
                
                // Perfect timing window is smaller (last 20 pixels)
                const perfectDistance = 20;
                return playerBottom >= platform.y - perfectDistance;
            }
        }
        
        return false;
    }

    // Activate perfect timing bounce
    activateTimingBounce() {
        const currentTime = Date.now();
        
        // Prevent spam (cooldown of 100ms)
        if (currentTime - this.player.lastSpacebarTime < 100) return;
        
        this.player.lastSpacebarTime = currentTime;
        
        // Apply extra bounce force (subtle 1.15x boost)
        const extraJumpForce = gameAssets.config.player.jumpForce * 1.15; // 15% more jump force
        this.player.velocityY = -extraJumpForce;
        
        // Award bonus points (reduced since boost is more subtle)
        const bonusPoints = 25;
        this.score += bonusPoints;
        this.updateScoreDisplay();
        
        // Play special sound
        this.playSound('perfectBounce');
        
        // Create special visual effect
        this.createPerfectBounceEffect();
        
        console.log(`⚡ Timing boost +${bonusPoints}`);
    }

    // Create subtle visual effect for timing bounce
    createPerfectBounceEffect() {
        const particleCount = 6; // Reduced for subtlety
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 3;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 2, // Slight upward bias
                size: 2 + Math.random() * 2, // Smaller, more subtle particles
                type: 'perfectBounce',
                color: '#00ff88', // Bright green for perfect timing
                life: 1.0,
                decay: 0.02
            });
        }
    }

    // Create visual effect when collecting taco
    createTacoCollectionEffect(taco) {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: taco.x + taco.width / 2,
                y: taco.y + taco.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                type: 'tacoSpark',
                alpha: 1,
                life: 30 + Math.random() * 20
            });
        }
    }

    // Handle player touching evil flocko - causes damage/death
    handleEvilFlockoDamage(platform) {
        // Play evil flocko death sound
        this.playSound('evilFlockoDeath');
        
        // Create danger particles
        this.createDangerEffect(platform);
        
        // Game over - evil flocko kills player!
        console.log('💀 Player touched evil flocko!');
        this.endGame();
    }

    // Defeat evil flocko when player has corn power-up
    defeatEvilFlocko(platform, platformIndex) {
        // Award bonus points for defeating evil flocko
        const bonusPoints = 200;
        this.score += bonusPoints;
        this.updateScoreDisplay();
        
        // Play victory sound
        this.playSound('powerupCorn');
        
        // Create victory particles
        this.createEvilFlockoDefeatEffect(platform);
        
        // Convert evil platform to normal platform
        platform.type = 'normal';
        platform.touched = true; // Mark as touched so no double scoring
        
        // Give player a good bounce from defeating the enemy
        this.player.velocityY = -gameAssets.config.player.jumpForce * 1.3;
        
        console.log(`⚡ Evil flocko defeated! +${bonusPoints} points`);
    }

    // Create danger effect when touching evil flocko
    createDangerEffect(platform) {
        const particleCount = 25; // More particles for dramatic death effect
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 6; // Faster, more explosive particles
            
            this.particles.push({
                x: centerX,
                y: centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 2, // More upward bias
                size: 3 + Math.random() * 4, // Bigger particles
                type: 'danger',
                color: '#ff0000', // Bright red danger particles
                life: 1.5, // Longer lasting
                decay: 0.02 // Slower decay for more visible effect
            });
        }
    }

    // Create victory effect when defeating evil flocko
    createEvilFlockoDefeatEffect(platform) {
        const particleCount = 20;
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 5;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 2,
                size: 3 + Math.random() * 4,
                type: 'victory',
                color: '#ffd700', // Gold victory particles
                life: 1.0,
                decay: 0.02
            });
        }
    }

    // Check collision between player and power-up
    checkPowerupCollision(powerup) {
        if (powerup.collected) return false;
        
        // Check if player overlaps with power-up (with padding for easier collection)
        const padding = 8; // Slightly larger collection area for power-ups
        return (
            this.player.x < powerup.x + powerup.width + padding &&
            this.player.x + this.player.width > powerup.x - padding &&
            this.player.y < powerup.y + powerup.height + padding &&
            this.player.y + this.player.height > powerup.y - padding
        );
    }

    // Collect a power-up and activate its effect
    collectPowerup(powerup) {
        if (powerup.collected) return;
        
        powerup.collected = true;
        
        // Award bonus points
        const bonus = gameAssets.config.score.powerupBonus;
        this.score += bonus;
        this.updateScoreDisplay();
        
        // Activate power-up effect
        this.activatePowerup(powerup.type);
        
        // Play collection sound based on type
        this.playSound(`powerup${powerup.type.charAt(0).toUpperCase() + powerup.type.slice(1)}`);
        
        // Create collection particles
        this.createPowerupCollectionEffect(powerup);
        
        console.log(`⚡ Power-up collected: ${gameAssets.powerUpTypes[powerup.type].name} +${bonus} points`);
    }

    // Activate power-up effect
    activatePowerup(type) {
        const config = gameAssets.powerUpTypes[type];
        if (!config) return;
        
        // Check if we've reached the maximum active power-ups
        if (this.activePowerups.size >= gameAssets.config.powerups.maxActive) {
            // Remove the oldest power-up
            const oldestKey = this.activePowerups.keys().next().value;
            this.deactivatePowerup(oldestKey);
        }
        
        // Activate the new power-up
        this.activePowerups.set(type, {
            timeLeft: config.duration,
            config: config
        });
        
        // Apply immediate effects
        switch(type) {
            case 'corn':
                // Super flight mode (enhanced flying)
                this.player.isFlying = true;
                this.player.flyingTimeLeft = config.duration;
                this.player.flyingPower = 0.25; // Stronger than normal corn platforms
                console.log('🌽✈️ SUPER FLIGHT ACTIVATED!');
                break;
                
            case 'shield':
                // Evil shield (invincibility)
                this.player.hasShield = true;
                console.log('👹🛡️ EVIL SHIELD ACTIVATED!');
                break;
                
            case 'magnet':
                // Taco magnet (auto-collect nearby tacos)
                this.player.hasMagnet = true;
                console.log('🌮🧲 TACO MAGNET ACTIVATED!');
                break;
        }
    }

    // Deactivate power-up effect
    deactivatePowerup(type) {
        if (!this.activePowerups.has(type)) return;
        
        this.activePowerups.delete(type);
        
        // Remove effects
        switch(type) {
            case 'corn':
                if (this.player.isFlying) {
                    this.player.isFlying = false;
                    this.player.flyingTimeLeft = 0;
                    this.player.flyingPower = 0.15; // Reset to normal
                }
                break;
                
            case 'shield':
                this.player.hasShield = false;
                break;
                
            case 'magnet':
                this.player.hasMagnet = false;
                break;
        }
        
        // Play expiration sound
        this.playSound('powerupExpire');
        
        console.log(`⚡ Power-up expired: ${type}`);
    }

    // Update active power-up effects
    updateActivePowerups(deltaTime) {
        const toRemove = [];
        
        for (let [type, data] of this.activePowerups) {
            // Countdown timer
            data.timeLeft -= deltaTime * 16.67; // Convert to milliseconds
            
            // Check for expiration
            if (data.timeLeft <= 0) {
                toRemove.push(type);
                continue;
            }
            
            // Apply continuous effects
            if (type === 'magnet' && this.player.hasMagnet) {
                this.applyMagnetEffect();
            }
        }
        
        // Remove expired power-ups
        toRemove.forEach(type => this.deactivatePowerup(type));
    }

    // Apply magnet effect to nearby tacos
    applyMagnetEffect() {
        const magnetRange = gameAssets.config.powerups.magnetRange;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        this.tacos.forEach(taco => {
            if (taco.collected) return;
            
            const tacoCenterX = taco.x + taco.width / 2;
            const tacoCenterY = taco.y + taco.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(tacoCenterX - playerCenterX, 2) + 
                Math.pow(tacoCenterY - playerCenterY, 2)
            );
            
            // Pull tacos within range towards the player
            if (distance < magnetRange && distance > 0) {
                const pullStrength = 0.3;
                const directionX = (playerCenterX - tacoCenterX) / distance;
                const directionY = (playerCenterY - tacoCenterY) / distance;
                
                taco.x += directionX * pullStrength * (magnetRange - distance) / magnetRange;
                taco.y += directionY * pullStrength * (magnetRange - distance) / magnetRange;
            }
        });
    }

    // Create visual effect when collecting power-up
    createPowerupCollectionEffect(powerup) {
        const particleCount = 12; // More particles for power-ups
        const powerupConfig = gameAssets.powerUpTypes[powerup.type];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            
            this.particles.push({
                x: powerup.x + powerup.width / 2,
                y: powerup.y + powerup.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                type: 'powerupGlow',
                alpha: 1,
                life: 40 + Math.random() * 30
            });
        }
        
        // Add special effect particles based on power-up type
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            
            this.particles.push({
                x: powerup.x + powerup.width / 2,
                y: powerup.y + powerup.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 4 + Math.random() * 2,
                type: powerup.type === 'shield' ? 'shieldGlow' : 
                      powerup.type === 'magnet' ? 'magnetGlow' : 'powerupGlow',
                alpha: 1,
                life: 50 + Math.random() * 25
            });
        }
    }

    // Draw UI elements
    drawUI() {
        // Draw score
        gameAssets.drawScore(this.ctx, this.score, 10, 10);
        
        // No visual timing indicator - hidden skill mechanic
        
        // Draw active power-up indicators
        this.drawPowerupIndicators();
        
        // Draw flying timer when active (legacy support)
        if (this.player.isFlying && this.player.flyingTimeLeft > 0 && !this.activePowerups.has('corn')) {
            const timeLeft = Math.ceil(this.player.flyingTimeLeft / 1000);
            const centerX = this.canvas.width / 2;
            const timerY = 40;
            
            // Background for timer
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(centerX - 50, timerY - 15, 100, 25);
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - 50, timerY - 15, 100, 25);
            
            // Timer text with pulsing effect
            const pulseAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            this.ctx.font = 'bold 16px "Fredoka", cursive';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
            this.ctx.fillText(`🌽 FLYING: ${timeLeft}s`, centerX, timerY + 3);
            this.ctx.restore();
        }
        
        // Draw FPS counter (debug)
        if (this.fpsDisplay > 0) {
            this.ctx.font = '12px monospace';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(`FPS: ${this.fpsDisplay}`, this.canvas.width - 60, 10);
        }
        
        // Game over screen is handled by overlay (showGameOverScreen), not canvas drawing
    }

    // Timing indicator removed - hidden skill mechanic

    // Draw power-up indicators in the UI
    drawPowerupIndicators() {
        if (this.activePowerups.size === 0) return;
        
        this.ctx.save();
        
        const indicatorY = 40;
        const indicatorSpacing = 120;
        const centerX = this.canvas.width / 2;
        let index = 0;
        
        for (let [type, data] of this.activePowerups) {
            const config = gameAssets.powerUpTypes[type];
            if (!config) continue;
            
            const timeLeft = Math.ceil(data.timeLeft / 1000);
            const indicatorX = centerX + (index - (this.activePowerups.size - 1) / 2) * indicatorSpacing;
            
            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(indicatorX - 55, indicatorY - 15, 110, 30);
            
            // Border with power-up color
            const borderColor = gameAssets.colors.powerups[type] || '#ffffff';
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(indicatorX - 55, indicatorY - 15, 110, 30);
            
            // Pulsing effect for low time
            const pulseAlpha = timeLeft <= 2 ? 0.5 + Math.sin(Date.now() * 0.02) * 0.5 : 1;
            
            // Power-up icon/symbol
            this.ctx.font = 'bold 16px "Fredoka", cursive';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
            
            const symbols = { 
                corn: '🌽 SUPER FLIGHT', 
                shield: '👹 EVIL SHIELD', 
                magnet: '🧲 TACO MAGNET' 
            };
            
            // Title
            this.ctx.font = 'bold 12px "Fredoka", cursive';
            this.ctx.fillText(symbols[type] || config.name, indicatorX, indicatorY - 2);
            
            // Timer
            this.ctx.font = 'bold 14px "Fredoka", cursive';
            this.ctx.fillStyle = timeLeft <= 2 ? `rgba(255, 100, 100, ${pulseAlpha})` : `rgba(255, 215, 0, ${pulseAlpha})`;
            this.ctx.fillText(`${timeLeft}s`, indicatorX, indicatorY + 12);
            
            index++;
        }
        
        this.ctx.restore();
    }

    // Set up input handlers
    setupInputHandlers() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Start game on first key interaction
            if ((this.gameState === 'waiting' || this.gameState === 'gameOver') && 
                ['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
                this.startGame();
                return;
            }
            
            this.keys[e.code] = true;
            
            // Prevent arrow key scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Handle spacebar for timing bounce only
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                
                // Only activate timing bounce - no pause fallback
                if (this.checkTimingBounce()) {
                    this.activateTimingBounce();
                }
                // Spacebar does nothing if not in timing window
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            // Start game on first mouse interaction
            if (this.gameState === 'waiting' || this.gameState === 'gameOver') {
                this.startGame();
                return;
            }
            
            this.mousePressed = true;
            this.lastMouseX = e.offsetX * (this.canvas.width / this.canvas.offsetWidth);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mousePressed) {
                this.lastMouseX = e.offsetX * (this.canvas.width / this.canvas.offsetWidth);
            }
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });
    }

    // Handle touch events
    handleTouchStart(e) {
        // Start game on first interaction
        if (this.gameState === 'waiting' || this.gameState === 'gameOver') {
            this.startGame();
            return;
        }
        
        for (let touch of e.changedTouches) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            
            // Center area for timing bounce (middle 30% of screen)
            const centerStart = this.canvas.width * 0.35;
            const centerEnd = this.canvas.width * 0.65;
            
            if (x >= centerStart && x <= centerEnd) {
                // Center touch - start timing for possible bounce
                this.centerTouchStart = Date.now();
                this.centerTouchActive = true;
            } else if (x < this.canvas.width / 2) {
                this.touches.left = true;
            } else {
                this.touches.right = true;
            }
        }
    }

    handleTouchEnd(e) {
        // Check for center touch timing bounce
        if (this.centerTouchActive && this.centerTouchStart > 0) {
            const touchDuration = Date.now() - this.centerTouchStart;
            
            // Timing bounce if touch held for 100-300ms in center area
            if (touchDuration >= 100 && touchDuration <= 300 && this.checkTimingBounce()) {
                this.activateTimingBounce();
            }
        }
        
        // Reset touch states
        this.touches.left = false;
        this.touches.right = false;
        this.centerTouchStart = 0;
        this.centerTouchActive = false;
    }

    handleTouchMove(e) {
        // Don't interfere with center touch timing
        if (this.centerTouchActive) {
            return;
        }
        
        // Update touch positions for movement
        this.handleTouchStart(e);
    }

    // Set up UI event handlers
    setupUIHandlers() {
        // Hide play button - game starts on first interaction
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'none';
        }
        
        // Leaderboard button
        const leaderboardButton = document.getElementById('leaderboardButton');
        if (leaderboardButton) {
            leaderboardButton.addEventListener('click', () => {
                if (typeof showLeaderboard === 'function') {
                    showLeaderboard();
                }
            });
        }
        
        // Twitter auth button
        const twitterAuthButton = document.getElementById('twitterAuthButton');
        if (twitterAuthButton) {
            twitterAuthButton.addEventListener('click', async () => {
                try {
                    console.log('🎮 Starting authentication process...');
                    
                    // Show loading state
                    const originalText = twitterAuthButton.textContent;
                    twitterAuthButton.textContent = '⏳ Connecting...';
                    twitterAuthButton.disabled = true;
                    
                    const user = await twitterAuth.initiateAuth();
                    
                    console.log('✅ Authentication successful:', user);
                    
                    // Update UI and refresh game over screen
                    twitterAuth.updateUI();
                    this.showGameOverScreen();
                    
                } catch (error) {
                    console.error('Authentication failed:', error);
                    
                    // Restore button state
                    twitterAuthButton.textContent = '🐦 Connect Twitter for Contest';
                    twitterAuthButton.disabled = false;
                    
                    // Show error with better messaging
                    const errorMsg = error.message === 'Authentication cancelled' 
                        ? 'Twitter authentication cancelled' 
                        : 'Twitter authentication failed: ' + error.message;
                    this.showError(errorMsg);
                }
            });
        }
    }

    // Show overlay
    showOverlay(content) {
        const overlay = document.getElementById('gameOverlay');
        const overlayContent = document.getElementById('overlayContent');
        
        if (overlay && overlayContent) {
            overlayContent.innerHTML = content;
            overlay.classList.add('show');
        }
    }

    // Hide overlay
    hideOverlay() {
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    // Show game over screen
    async showGameOverScreen() {
        let scoreText = `${this.score.toLocaleString()}`;
        let bestScoreDisplay = '';
        let submissionStatus = '';
        
        if (this.score > this.bestScore) {
            bestScoreDisplay = `<div style="color: #fbbf24; font-weight: bold; margin: 8px 0;">🎉 NEW BEST!</div>`;
        } else if (this.bestScore > 0) {
            bestScoreDisplay = `<div style="color: #94a3b8; font-size: 0.9rem; margin: 8px 0;">Best: ${this.bestScore.toLocaleString()}</div>`;
        }
        
        // Add leaderboard submission if authenticated
        if (twitterAuth.authenticated) {
            try {
                await leaderboard.submitScore(this.score);
                submissionStatus = `<div style="color: #22c55e; font-size: 0.85rem; margin: 8px 0;">✅ Score submitted!</div>`;
            } catch (error) {
                console.error('Score submission failed:', error);
                submissionStatus = `<div style="color: #ef4444; font-size: 0.85rem; margin: 8px 0;">⚠️ Submit failed</div>`;
            }
        } else {
            submissionStatus = `<div style="color: #60a5fa; font-size: 0.85rem; margin: 8px 0;">🐦 Connect Twitter to compete in the contest!</div>`;
        }
        
        const content = `
            <div style="text-align: center; max-width: 280px; margin: 0 auto;">
                <h2 style="
                    color: #ef4444; 
                    font-family: var(--font-display); 
                    font-size: 1.5rem; 
                    font-weight: 800; 
                    margin: 0 0 12px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                ">OH NOOO U DIEDDDDD</h2>
                
                <div style="
                    background: rgba(255,255,255,0.05); 
                    border-radius: 12px; 
                    padding: 16px; 
                    margin: 16px 0;
                    border: 1px solid rgba(255,255,255,0.1);
                ">
                    <div style="color: #fbbf24; font-size: 1.25rem; font-weight: bold; margin-bottom: 4px;">
                        ${scoreText}
                    </div>
                    ${bestScoreDisplay}
                    ${submissionStatus}
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="game.startGame()" style="
                        background: linear-gradient(135deg, var(--restaurant-orange) 0%, var(--restaurant-red) 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-family: var(--font-display);
                        font-weight: 800;
                        font-size: 0.95rem;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);
                        min-width: 100px;
                        position: relative;
                        overflow: hidden;
                    " onmouseover="
                        this.style.transform='translateY(-3px) scale(1.02)'; 
                        this.style.boxShadow='0 8px 25px rgba(220, 38, 38, 0.5)';
                        this.style.filter='brightness(1.1)';
                    " onmouseout="
                        this.style.transform='translateY(0) scale(1)'; 
                        this.style.boxShadow='0 6px 20px rgba(220, 38, 38, 0.3)';
                        this.style.filter='brightness(1)';
                    ">
                        🎮 Play Again
                    </button>
                    
                    <button onclick="showLeaderboard()" style="
                        background: rgba(255,255,255,0.08);
                        color: var(--text-secondary);
                        border: 2px solid rgba(255,255,255,0.15);
                        border-radius: 10px;
                        padding: 10px 22px;
                        font-family: var(--font-display);
                        font-weight: 700;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        text-transform: uppercase;
                        letter-spacing: 0.03em;
                        backdrop-filter: blur(12px);
                        min-width: 100px;
                        position: relative;
                        overflow: hidden;
                    " onmouseover="
                        this.style.background='rgba(251, 191, 36, 0.12)'; 
                        this.style.borderColor='rgba(251, 191, 36, 0.4)'; 
                        this.style.color='var(--restaurant-yellow)';
                        this.style.transform='translateY(-2px)';
                        this.style.boxShadow='0 4px 15px rgba(251, 191, 36, 0.2)';
                    " onmouseout="
                        this.style.background='rgba(255,255,255,0.08)'; 
                        this.style.borderColor='rgba(255,255,255,0.15)'; 
                        this.style.color='var(--text-secondary)';
                        this.style.transform='translateY(0)';
                        this.style.boxShadow='none';
                    ">
                        🏆 Leaderboard
                    </button>
                </div>
                
                <!-- Sharing Section (show for good scores) -->
                ${this.score >= 500 ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <p style="color: var(--restaurant-yellow); font-size: 0.9rem; margin-bottom: 12px; font-weight: 600;">
                            🏆 Share Your Achievement!
                        </p>
                        
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            ${twitterAuth.authenticated ? `
                                <button onclick="game.shareOnTwitter()" style="
                                    background: linear-gradient(135deg, #1d9bf0 0%, #1a91da 100%);
                                    color: white;
                                    border: none;
                                    border-radius: 8px;
                                    padding: 8px 16px;
                                    font-family: var(--font-display);
                                    font-weight: 600;
                                    font-size: 0.8rem;
                                    cursor: pointer;
                                    transition: all 0.3s ease;
                                    flex: 1;
                                " onmouseover="
                                    this.style.transform='translateY(-1px)';
                                    this.style.filter='brightness(1.1)';
                                " onmouseout="
                                    this.style.transform='translateY(0)';
                                    this.style.filter='brightness(1)';
                                ">
                                    🐦 Share Score
                                </button>
                            ` : ''}
                            
                            <button onclick="game.generateTrophyImage()" style="
                                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                                color: #1f2937;
                                border: none;
                                border-radius: 8px;
                                padding: 8px 16px;
                                font-family: var(--font-display);
                                font-weight: 600;
                                font-size: 0.8rem;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                flex: 1;
                            " onmouseover="
                                this.style.transform='translateY(-1px)';
                                this.style.filter='brightness(1.1)';
                            " onmouseout="
                                this.style.transform='translateY(0)';
                                this.style.filter='brightness(1)';
                            ">
                                📸 Trophy Image
                            </button>
                        </div>
                        
                        ${twitterAuth.authenticated ? `
                            <button onclick="game.generateAndShareTrophy()" style="
                                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                padding: 8px 16px;
                                font-family: var(--font-display);
                                font-weight: 600;
                                font-size: 0.8rem;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                width: 100%;
                            " onmouseover="
                                this.style.transform='translateY(-1px)';
                                this.style.filter='brightness(1.1)';
                            " onmouseout="
                                this.style.transform='translateY(0)';
                                this.style.filter='brightness(1)';
                            ">
                                🚀 Trophy + Tweet
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showOverlay(content);
    }

    // Update score display
    updateScoreDisplay() {
        const currentScoreElement = document.getElementById('currentScore');
        const bestScoreElement = document.getElementById('bestScore');
        
        if (currentScoreElement) {
            currentScoreElement.textContent = this.score.toLocaleString();
        }
        
        if (bestScoreElement) {
            bestScoreElement.textContent = this.bestScore.toLocaleString();
        }
    }

    // Load best score from localStorage
    loadBestScore() {
        try {
            const stored = localStorage.getItem('paco_jump_best_score');
            this.bestScore = stored ? parseInt(stored, 10) : 0;
            this.updateScoreDisplay();
        } catch (error) {
            console.error('Failed to load best score:', error);
        }
    }

    // Save best score to localStorage
    saveBestScore() {
        try {
            localStorage.setItem('paco_jump_best_score', this.bestScore.toString());
        } catch (error) {
            console.error('Failed to save best score:', error);
        }
    }

    // Play sound effect
    playSound(type) {
        try {
            const soundConfig = gameAssets.sounds[type];
            if (soundConfig && typeof playTone === 'function') {
                playTone(soundConfig.frequency, soundConfig.duration);
            }
        } catch (error) {
            console.error('Sound playback failed:', error);
        }
    }

    // Show start instructions
    showStartInstructions() {
        this.showOverlay(`
            <div style="
                max-width: 260px; 
                margin: 0 auto; 
                text-align: center;
                font-family: var(--font-display);
                background: rgba(0, 0, 0, 0.8);
                border-radius: 16px;
                padding: 20px 16px;
                backdrop-filter: blur(10px);
            ">
                <!-- Game Title -->
                <h1 style="
                    color: #fbbf24;
                    font-size: 2rem;
                    font-weight: 900;
                    margin: 0 0 12px 0;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                ">🎮 PACO JUMP</h1>
                
                <!-- Ultra-Compact Controls -->
                <div style="
                    color: #ffffff;
                    font-size: 0.9rem;
                    margin-bottom: 12px;
                    line-height: 1.2;
                ">
                    <div style="margin-bottom: 3px;">📱 <strong>Tap sides • Hold center</strong></div>
                    <div>⌨️ <strong>Arrow keys • Spacebar</strong></div>
                </div>
                
                <!-- Quick Tips -->
                <div style="
                    color: #cbd5e1;
                    font-size: 0.8rem;
                    margin-bottom: 16px;
                    line-height: 1.2;
                ">
                    Jump on platforms • Avoid 👹 enemies • Use 🌽 corn to defeat them!
                </div>
                
                <!-- Call to Action -->
                <div style="
                    background: linear-gradient(135deg, var(--restaurant-orange), var(--restaurant-red));
                    border-radius: 12px;
                    padding: 12px;
                    color: white;
                    font-weight: 800;
                    font-size: 1rem;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                    cursor: pointer;
                " onclick="game.startGame()">
                    🚀 TAP TO START
                </div>
            </div>
        `);
    }

    // Show error message
    showError(message) {
        console.error(message);
        this.showOverlay(`
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button onclick="game.hideOverlay()" class="game-btn secondary">OK</button>
        `);
    }

    // Start game loop
    startGameLoop() {
        this.lastFrameTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
        console.log('🔄 Game loop started');
    }

    // Update FPS counter
    updateFPSCounter(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFPSTime >= 1000) {
            this.fpsDisplay = this.frameCount;
            this.frameCount = 0;
            this.lastFPSTime = currentTime;
        }
    }

    // Generate trophy image for sharing
    async generateTrophyImage() {
        try {
            console.log('🏆 Generating trophy image...');
            
            // Get player information
            const username = twitterAuth.authenticated ? twitterAuth.currentUser.username : null;
            
            // Try to get player's rank from leaderboard
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    twitterAuth.authenticated && entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }
            
            // Prepare player data for trophy generation
            const playerData = {
                score: this.score,
                username: username,
                rank: rank,
                gameMode: 'Daily Contest',
                date: new Date().toLocaleDateString()
            };
            
            // Check if trophy generator is available
            if (typeof trophyGenerator === 'undefined') {
                console.error('Trophy generator not available');
                this.showNotification('❌ Trophy generator not available', 'error');
                return;
            }
            
            // Wait for trophy image to load if needed
            if (!trophyGenerator.isLoaded) {
                this.showNotification('⏳ Loading trophy image...', 'info');
                await trophyGenerator.loadTrophyImage();
            }
            
            // Generate the trophy
            const result = await trophyGenerator.generateAndShare(playerData, {
                download: true,
                copyToClipboard: true
            });
            
            if (result.success) {
                let message = '🏆 Trophy image generated!';
                if (result.downloaded) message += '\n📥 Downloaded to your device';
                if (result.copied) message += '\n📋 Copied to clipboard';
                
                this.showNotification(message, 'success');
                console.log('✅ Trophy generation successful');
            } else {
                this.showNotification('❌ Failed to generate trophy: ' + result.error, 'error');
                console.error('Trophy generation failed:', result.error);
            }
            
        } catch (error) {
            console.error('Trophy generation error:', error);
            this.showNotification('❌ Trophy generation failed', 'error');
        }
    }

    // Show notification to user
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) {
            console.log('Notification:', message);
            return;
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.className = 'notification';
        }, 4000);
    }

    // Share achievement on Twitter
    async shareOnTwitter() {
        try {
            if (!twitterAuth.authenticated) {
                this.showNotification('❌ Please connect Twitter first', 'error');
                return;
            }

            // Get player's rank if available
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }

            console.log('🐦 Sharing achievement on Twitter...');
            const success = await twitterAuth.shareAchievement(this.score, rank);
            
            if (success) {
                this.showNotification('🐦 Twitter share window opened!', 'success');
            } else {
                this.showNotification('❌ Failed to open Twitter share', 'error');
            }

        } catch (error) {
            console.error('Twitter sharing error:', error);
            this.showNotification('❌ Twitter sharing failed', 'error');
        }
    }

    // Generate trophy and share on Twitter
    async generateAndShareTrophy() {
        try {
            if (!twitterAuth.authenticated) {
                this.showNotification('❌ Please connect Twitter first', 'error');
                return;
            }

            console.log('🏆 Generating trophy and preparing Twitter share...');
            
            // First generate the trophy image
            const trophyResult = await this.generateTrophyImage();
            if (!trophyResult) return;

            // Get player's rank
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }

            // Share achievement on Twitter
            console.log('🐦 Opening Twitter share for trophy...');
            const shareSuccess = await twitterAuth.shareTrophyAchievement(this.score, rank);
            
            if (shareSuccess) {
                this.showNotification('🏆 Trophy generated! Twitter share opened!', 'success');
            } else {
                this.showNotification('🏆 Trophy generated! Twitter share failed.', 'error');
            }

        } catch (error) {
            console.error('Trophy share error:', error);
            this.showNotification('❌ Trophy sharing failed', 'error');
        }
    }
}

// Global game instance
let game = null;

// Initialize game when called
async function initializeGame() {
    if (!game) {
        game = new PacoJumpGame();
        await game.initialize();
    }
}

// Export for global access
window.game = game;

console.log('🎮 Game module loaded');