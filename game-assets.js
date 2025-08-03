// ===== PACO JUMP - GAME ASSETS MODULE =====

/**
 * Game Assets Manager
 * Handles all visual assets, colors, and theme configuration for Paco Jump
 * Designed to be easily updatable for different themes or art styles
 */

class GameAssets {
    constructor() {
        this.loaded = false;
        this.loadingProgress = 0;
        this.images = {};
        this.sprites = {};
        this.colors = this.getColorPalette();
        this.sounds = this.getSoundEffects();
        this.config = this.getGameConfig();
        
        // Asset paths - FIXED FOR LIVE SITE
        this.assetPaths = {
            // Player sprites
            jump: 'jump.png',
            leftJump: 'left_jump.png',
            rightJump: 'right_jump.png',
            walk: 'walk.gif',
            
            // Platform decorations
            corn: 'corn.png',
            taco: 'taco.png',
            
            // Enemies/obstacles
            evilFlocko: 'evil-flocko.png'
        };
        
        // Power-up types using existing assets
        this.powerUpTypes = {
            corn: {
                name: 'Fly Boost',
                description: 'Super jump power!',
                duration: 5000, // 5 seconds
                asset: 'corn', // Use corn sprite
                rarity: 0.4 // Good chance for fly boost
            },
            shield: {
                name: 'Shield Power', 
                description: 'Invincibility protection!',
                duration: 4000, // 4 seconds
                asset: 'evilFlocko', // Use evil flocko sprite
                rarity: 0.25 // Medium chance for shield
            },
            magnet: {
                name: 'Taco Magnet',
                description: 'Auto-collect nearby tacos!',
                duration: 6000, // 6 seconds
                asset: 'taco', // Use taco sprite
                rarity: 0.35 // Good chance for magnet
            }
        };
        
        // Start loading assets
        this.loadAssets();
    }

    // Color palette matching the restaurant theme
    getColorPalette() {
        return {
            // Sky gradient colors
            skyTop: '#87CEEB',
            skyMiddle: '#E0F6FF', 
            skyBottom: '#87CEEB',
            
            // Platform colors
            platform: {
                normal: '#8B4513',
                spring: '#22c55e',
                moving: '#f97316',
                breaking: '#ef4444',
                cloud: '#ffffff',
                evil: '#7c2d12'
            },
            
            // Player colors (Paco)
            player: {
                body: '#fbbf24',
                beak: '#f97316',
                eye: '#000000',
                hat: '#dc2626'
            },
            
            // UI colors
            ui: {
                score: '#fbbf24',
                shadow: 'rgba(0, 0, 0, 0.3)',
                text: '#ffffff',
                textShadow: 'rgba(0, 0, 0, 0.5)'
            },
            
            // Particle effects
            particles: {
                feather: '#fbbf24',
                spark: '#ffffff',
                trail: 'rgba(251, 191, 36, 0.6)',
                tacoSpark: '#FF8C00', // Orange taco collection sparks! 🌮
                powerupGlow: '#00ff88', // Power-up collection glow
                shieldGlow: '#ff4444', // Evil shield glow
                magnetGlow: '#ffaa00'  // Magnet field glow
            },
            
            // Power-up effect colors
            powerups: {
                corn: '#22c55e',     // Green for super flight
                shield: '#ef4444',   // Red for evil shield  
                magnet: '#fbbf24',   // Yellow for taco magnet
                glowIntensity: 0.8
            }
        };
    }

    // Sound effect configuration
    getSoundEffects() {
        return {
            jump: { frequency: 400, duration: 0.1 },
            platform: { frequency: 300, duration: 0.05 },
            bounce: { frequency: 600, duration: 0.15 },
            powerup: { frequency: 800, duration: 0.2 },
            fall: { frequency: 200, duration: 0.3 },
            score: { frequency: 523, duration: 0.1 },
            flying: { frequency: 880, duration: 0.4 }, // Flying power-up sound! 🌽✈️
            taco: { frequency: 660, duration: 0.2 }, // Taco collection sound! 🌮
            
            // Power-up specific sounds
            powerupCorn: { frequency: 950, duration: 0.5 }, // Super flight activation! 🌽
            powerupShield: { frequency: 440, duration: 0.6 }, // Evil shield activation! 👹
            powerupMagnet: { frequency: 740, duration: 0.4 }, // Taco magnet activation! 🧲
            powerupExpire: { frequency: 350, duration: 0.3 }, // Power-up expiring
            
            // Perfect timing bounce
            perfectBounce: { frequency: 1200, duration: 0.3 }, // Perfect timing bounce! ⚡
            
            // Evil flocko death sound
            evilFlockoDeath: { frequency: 150, duration: 0.8 } // Deep, ominous death sound! 💀
        };
    }

    // Game configuration
    getGameConfig() {
        return {
            // Canvas settings
            canvas: {
                width: 320,
                height: 480
            },
            
            // Player settings
            player: {
                width: 32,
                height: 32,
                jumpForce: 15,
                maxSpeed: 2.2, // Further reduced for more responsive feel
                gravity: 0.5
            },
            
            // Platform settings
            platform: {
                width: 60,
                height: 12,
                spacing: 80,
                minGap: 30,        // Start easier
                maxGap: 80,        // Reduce max gap for better reachability
                easyMinGap: 25,    // Very easy gaps for beginners
                easyMaxGap: 45,    // Easy max gap
                hardMinGap: 50,    // Harder gaps at high altitudes
                hardMaxGap: 100    // Maximum challenge gap
            },
            
            // Scoring - optimized for competition
            score: {
                platformMultiplier: 10,
                heightMultiplier: 1,
                bonusMultiplier: 50,
                tacoBonus: 125, // Increased taco bonus for risk/reward 🌮
                powerupBonus: 200, // Higher power-up bonus for strategic collection ⚡
                comboMultiplier: 1.2, // Bonus for collecting multiple items quickly
                perfectTimingBonus: 50, // Reward for skilled timing bounces
                streakBonus: 25 // Bonus for platform streaks without falling
            },
            
            // Power-up system
            powerups: {
                spawnChance: 0.04, // Reduced to 4% chance per platform area
                magnetRange: 80, // Magnet collection range in pixels
                shieldFlashInterval: 200, // Shield flash effect timing
                glowPulseSpeed: 0.015, // Glow animation speed
                maxActive: 2 // Maximum active power-ups at once
            },
            
            // Visual effects
            effects: {
                trailLength: 5,
                particleCount: 3,
                fadeSpeed: 0.05
            }
        };
    }

    // Draw player (Paco the chicken) - now using custom sprites
    drawPlayer(ctx, x, y, width, height, rotation = 0, velocityX = 0) {
        ctx.save();
        
        // Get appropriate sprite based on movement
        const sprite = this.getPlayerSprite(velocityX, false);
        
        if (sprite && this.loaded) {
            // Draw custom sprite
            ctx.translate(x + width/2, y + height/2);
            ctx.rotate(rotation);
            
            // Calculate sprite size (maintain aspect ratio)
            const aspectRatio = sprite.width / sprite.height;
            let spriteWidth = width;
            let spriteHeight = height;
            
            if (aspectRatio > 1) {
                spriteHeight = width / aspectRatio;
            } else {
                spriteWidth = height * aspectRatio;
            }
            
            // Draw sprite centered
            ctx.drawImage(
                sprite,
                -spriteWidth/2,
                -spriteHeight/2,
                spriteWidth,
                spriteHeight
            );
        } else {
            // Fallback to procedural drawing
            ctx.translate(x + width/2, y + height/2);
            ctx.rotate(rotation);
            
            // Draw chicken body
            ctx.fillStyle = this.colors.player.body;
            ctx.beginPath();
            ctx.ellipse(0, 0, width/2.5, height/2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw chicken head
            ctx.fillStyle = this.colors.player.body;
            ctx.beginPath();
            ctx.ellipse(0, -height/3, width/3, height/3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw beak
            ctx.fillStyle = this.colors.player.beak;
            ctx.beginPath();
            ctx.moveTo(-width/6, -height/3);
            ctx.lineTo(-width/3, -height/4);
            ctx.lineTo(-width/6, -height/5);
            ctx.closePath();
            ctx.fill();
            
            // Draw eye
            ctx.fillStyle = this.colors.player.eye;
            ctx.beginPath();
            ctx.ellipse(-width/8, -height/2.5, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw simple hat (Paco's signature look)
            ctx.fillStyle = this.colors.player.hat;
            ctx.beginPath();
            ctx.ellipse(0, -height/1.8, width/2.8, height/8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    // Draw platform
    drawPlatform(ctx, x, y, width, height, type = 'normal') {
        ctx.save();
        
        // Get platform color based on type
        const color = this.colors.platform[type] || this.colors.platform.normal;
        
        // Draw platform shadow
        ctx.fillStyle = this.colors.ui.shadow;
        ctx.fillRect(x + 2, y + 2, width, height);
        
        // Draw main platform
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        
        // Add platform details based on type
        switch(type) {
            case 'spring':
                // Use corn sprite if available, otherwise draw spring coils
                if (this.images.corn && this.loaded) {
                    // Base size for corn (bigger and more visible)
                    const cornSize = 48; // Bigger for visibility
                    const aspectRatio = this.images.corn.naturalWidth / this.images.corn.naturalHeight;
                    const cornWidth = cornSize * aspectRatio;
                    const cornHeight = cornSize;
                    ctx.drawImage(
                        this.images.corn,
                        x + width/2 - cornWidth/2,
                        y - cornHeight/2,
                        cornWidth,
                        cornHeight
                    );
                } else {
                    // Fallback: Draw spring coils
                    ctx.strokeStyle = '#16a34a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for(let i = 0; i < 3; i++) {
                        const coilX = x + 10 + (i * 15);
                        ctx.moveTo(coilX, y);
                        ctx.quadraticCurveTo(coilX + 5, y - 5, coilX + 10, y);
                    }
                    ctx.stroke();
                }
                break;
                
            case 'moving':
                // Use taco sprite if available, otherwise draw arrow
                if (this.images.taco && this.loaded) {
                    const tacoSize = 18;
                    ctx.drawImage(
                        this.images.taco,
                        x + width/2 - tacoSize/2,
                        y - tacoSize/2,
                        tacoSize,
                        tacoSize
                    );
                } else {
                    // Fallback: Draw arrow indicators
                    ctx.fillStyle = '#fed7aa';
                    ctx.beginPath();
                    ctx.moveTo(x + 5, y + height/2);
                    ctx.lineTo(x + 15, y + height/2 - 3);
                    ctx.lineTo(x + 15, y + height/2 + 3);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
                
            case 'breaking':
                // Draw crack lines (keep this procedural)
                ctx.strokeStyle = '#7f1d1d';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + width/3, y);
                ctx.lineTo(x + width/3 + 5, y + height);
                ctx.moveTo(x + 2*width/3, y);
                ctx.lineTo(x + 2*width/3 - 5, y + height);
                ctx.stroke();
                break;
                
            case 'cloud':
                // Draw cloud texture (keep this procedural)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                for(let i = 0; i < 4; i++) {
                    const cloudX = x + (i * width/4) + 5;
                    ctx.beginPath();
                    ctx.ellipse(cloudX, y + height/2, 8, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'evil':
                // Evil flocko sprite - use as provided, no transformations needed
                if (this.images.evilFlocko && this.loaded) {
                    const evilWidth = 32;
                    const evilHeight = 32;
                    
                    // Simple drawing - your sprite is already oriented correctly
                    ctx.drawImage(
                        this.images.evilFlocko,
                        x + (width - evilWidth) / 2, // Center horizontally on platform
                        y - evilHeight + 8, // Position above platform
                        evilWidth,
                        evilHeight
                    );
                }
                break;
        }
        
        ctx.restore();
    }

    // Draw particle effect
    drawParticle(ctx, x, y, size, type = 'feather', alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        
        const color = this.colors.particles[type] || this.colors.particles.feather;
        ctx.fillStyle = color;
        
        switch(type) {
            case 'feather':
                // Draw feather shape
                ctx.beginPath();
                ctx.ellipse(x, y, size, size * 2, Math.PI/4, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'spark':
                // Draw star-like spark
                ctx.beginPath();
                for(let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const radius = (i % 2 === 0) ? size : size/2;
                    const sparkX = x + Math.cos(angle) * radius;
                    const sparkY = y + Math.sin(angle) * radius;
                    
                    if(i === 0) ctx.moveTo(sparkX, sparkY);
                    else ctx.lineTo(sparkX, sparkY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'trail':
                // Draw simple circle trail
                ctx.beginPath();
                ctx.ellipse(x, y, size, size, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'tacoSpark':
                // Draw simple taco collection spark (no glow)
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'powerupGlow':
                // Draw simple power-up collection particle (no glow)
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'shieldGlow':
                // Draw shield particle with hexagonal shape
                const sides = 6;
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const pointX = x + Math.cos(angle) * size;
                    const pointY = y + Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'magnetGlow':
                // Draw magnet particle with alternating colors
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add magnetic field lines
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const magnetTime = Date.now() * 0.01;
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2 + magnetTime;
                    const lineLength = size * 1.5;
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(angle) * lineLength, y + Math.sin(angle) * lineLength);
                }
                ctx.stroke();
                break;
                
            case 'perfectBounce':
                // Draw perfect timing bounce particle with star shape
                const points = 5;
                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const angle = (i / (points * 2)) * Math.PI * 2;
                    const radius = (i % 2 === 0) ? size : size * 0.5;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                
                // Add inner bright center
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'danger':
                // Draw danger particle with spiky shape
                const spikes = 6;
                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (i / (spikes * 2)) * Math.PI * 2;
                    const radius = (i % 2 === 0) ? size : size * 0.6;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'victory':
                // Draw victory particle with burst shape
                const rays = 8;
                ctx.beginPath();
                for (let i = 0; i < rays; i++) {
                    const angle = (i / rays) * Math.PI * 2;
                    const innerRadius = size * 0.3;
                    const outerRadius = size;
                    
                    const innerX = x + Math.cos(angle) * innerRadius;
                    const innerY = y + Math.sin(angle) * innerRadius;
                    const outerX = x + Math.cos(angle) * outerRadius;
                    const outerY = y + Math.sin(angle) * outerRadius;
                    
                    ctx.moveTo(innerX, innerY);
                    ctx.lineTo(outerX, outerY);
                }
                ctx.stroke();
                
                // Add center circle
                ctx.beginPath();
                ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    // Draw background with optimized parallax effect
    drawBackground(ctx, canvasWidth, canvasHeight, scrollY) {
        // Create gradient only once per frame (cache optimization)
        if (!this._backgroundGradient || this._lastHeight !== canvasHeight) {
            this._backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
            this._backgroundGradient.addColorStop(0, this.colors.skyTop);
            this._backgroundGradient.addColorStop(0.3, this.colors.skyMiddle);
            this._backgroundGradient.addColorStop(1, this.colors.skyBottom);
            this._lastHeight = canvasHeight;
        }
        
        ctx.fillStyle = this._backgroundGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Optimized cloud rendering with reduced frequency
        if (Math.floor(scrollY / 10) !== this._lastCloudFrame) {
            this._lastCloudFrame = Math.floor(scrollY / 10);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const cloudOffset = (scrollY * 0.08) % 600; // Slightly slower for smoothness
            
            for(let i = 0; i < 4; i++) { // Reduced cloud count for performance
                const cloudY = (i * 150) - cloudOffset;
                if(cloudY > -60 && cloudY < canvasHeight + 60) {
                    this.drawCloud(ctx, 60 + (i * 90) % (canvasWidth - 120), cloudY, 35, 18);
                }
            }
        }
    }

    // Draw cloud helper function
    drawCloud(ctx, x, y, width, height) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Draw cloud as multiple overlapping circles
        const circles = [
            {x: 0, y: 0, r: height/2},
            {x: width/3, y: -height/4, r: height/3},
            {x: 2*width/3, y: 0, r: height/2.5},
            {x: width, y: height/6, r: height/3}
        ];
        
        circles.forEach(circle => {
            ctx.beginPath();
            ctx.ellipse(x + circle.x, y + circle.y, circle.r, circle.r, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }

    // Draw UI elements
    drawScore(ctx, score, x, y) {
        ctx.save();
        ctx.font = 'bold 24px "Fredoka", cursive';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText(score.toString(), x + 2, y + 2);
        ctx.fillStyle = this.colors.ui.score;
        ctx.fillText(score.toString(), x, y);
        ctx.restore();
    }

    // Draw collectible taco with animation
    drawTaco(ctx, taco) {
        if (taco.collected) return; // Don't draw collected tacos
        
        ctx.save();
        
        // Update animation time
        const time = Date.now() * 0.003;
        
        // Bobbing motion
        const bobOffset = Math.sin(time + taco.bobOffset) * 3;
        
        // Pulsing scale
        const pulseScale = 1 + Math.sin(time * 2 + taco.pulseTime) * 0.15;
        
        const centerX = taco.x + taco.width / 2;
        const centerY = taco.y + taco.height / 2 + bobOffset;
        
        // Translate to center for scaling
        ctx.translate(centerX, centerY);
        ctx.scale(pulseScale, pulseScale);
        
        // Use taco sprite if available
        if (this.images.taco && this.loaded) {
            // Base size for taco (3x bigger and more collectible)
            const tacoSize = 96; // 3x bigger for better visibility!
            const aspectRatio = this.images.taco.naturalWidth / this.images.taco.naturalHeight;
            const tacoWidth = tacoSize * aspectRatio;
            const tacoHeight = tacoSize;
            ctx.drawImage(
                this.images.taco,
                -tacoWidth/2,
                -tacoHeight/2,
                tacoWidth,
                tacoHeight
            );
        } else {
            // Fallback: Draw procedural taco (also bigger)
            const fallbackScale = 1.5;
            const fallbackWidth = taco.width * fallbackScale;
            const fallbackHeight = taco.height * fallbackScale;
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(-fallbackWidth/2, -fallbackHeight/2, fallbackWidth, fallbackHeight);
            
            // Add some taco details
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-fallbackWidth/2 + 2, -fallbackHeight/2 + 2, fallbackWidth - 4, 4);
            ctx.fillStyle = '#FF6347';
            ctx.fillRect(-fallbackWidth/2 + 2, -fallbackHeight/2 + 8, fallbackWidth - 4, 3);
        }
        
        // No sparkle effect - clean taco drawing
        
        ctx.restore();
    }

    // Draw collectible power-up with enhanced animations
    drawPowerup(ctx, powerup) {
        if (powerup.collected) return; // Don't draw collected power-ups
        
        ctx.save();
        
        // Update animation time
        const time = Date.now() * 0.004;
        
        // Enhanced floating motion
        const floatOffset = Math.sin(time + powerup.bobOffset) * 4;
        
        // Pulsing scale with more dramatic effect
        const pulseScale = 1.1 + Math.sin(time * 2.5 + powerup.pulseTime) * 0.2;
        
        // Rotation for power-ups
        const rotation = time * 0.5;
        
        const centerX = powerup.x + powerup.width / 2;
        const centerY = powerup.y + powerup.height / 2 + floatOffset;
        
        // Translate and apply transformations
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.scale(pulseScale, pulseScale);
        
        // Get power-up config
        const config = this.powerUpTypes[powerup.type];
        const assetKey = config?.asset;
        
        // Use appropriate sprite if available
        if (assetKey && this.images[assetKey] && this.loaded) {
            // Base size for power-ups (bigger and more noticeable)
            const powerupSize = 28; // Bigger for visibility
            const aspectRatio = this.images[assetKey].naturalWidth / this.images[assetKey].naturalHeight;
            const powerupWidth = powerupSize * aspectRatio;
            const powerupHeight = powerupSize;
            ctx.drawImage(
                this.images[assetKey],
                -powerupWidth/2,
                -powerupHeight/2,
                powerupWidth,
                powerupHeight
            );
        } else {
            // Fallback: Draw procedural power-up based on type
            ctx.fillStyle = this.colors.powerups[powerup.type] || '#ffffff';
        ctx.beginPath();
            ctx.arc(0, 0, powerup.width/2, 0, Math.PI * 2);
        ctx.fill();
            
            // Add type indicator
            ctx.fillStyle = '#ffffff';
            ctx.font = `${powerup.width * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const symbols = { corn: '🌽', shield: '🛡️', magnet: '🧲' };
            ctx.fillText(symbols[powerup.type] || '⚡', 0, 0);
        }
        
        // No glow effects - clean power-up drawing
        
        ctx.restore();
    }

    drawGameOver(ctx, canvasWidth, canvasHeight, score, bestScore) {
        ctx.save();
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Game Over text
        ctx.font = 'bold 32px "Fredoka", cursive';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText('Game Over!', canvasWidth/2 + 2, canvasHeight/2 - 48);
        ctx.fillStyle = this.colors.ui.text;
        ctx.fillText('Game Over!', canvasWidth/2, canvasHeight/2 - 50);
        
        // Score display
        ctx.font = 'bold 20px "Fredoka", cursive';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText(`Score: ${score}`, canvasWidth/2 + 1, canvasHeight/2 - 9);
        ctx.fillStyle = this.colors.ui.score;
        ctx.fillText(`Score: ${score}`, canvasWidth/2, canvasHeight/2 - 10);
        
        // Best score
        if(bestScore > 0) {
            ctx.fillStyle = this.colors.ui.textShadow;
            ctx.fillText(`Best: ${bestScore}`, canvasWidth/2 + 1, canvasHeight/2 + 21);
            ctx.fillStyle = this.colors.ui.text;
            ctx.fillText(`Best: ${bestScore}`, canvasWidth/2, canvasHeight/2 + 20);
        }
        
        ctx.restore();
    }

    // Asset loading system
    async loadAssets() {
        const assetKeys = Object.keys(this.assetPaths);
        let loadedCount = 0;
        
        console.log('🎨 Loading custom game assets...');
        
        const loadPromises = assetKeys.map(key => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    loadedCount++;
                    this.loadingProgress = (loadedCount / assetKeys.length) * 100;
                    console.log(`✅ Loaded ${key}: ${this.loadingProgress.toFixed(0)}%`);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`⚠️ Failed to load ${key}, using fallback`);
                    this.images[key] = null; // Will trigger fallback rendering
                    loadedCount++;
                    this.loadingProgress = (loadedCount / assetKeys.length) * 100;
                    resolve(); // Don't reject, just use fallback
                };
                img.src = this.assetPaths[key];
            });
        });
        
        try {
            await Promise.all(loadPromises);
            this.loaded = true;
            console.log('🎉 All game assets loaded successfully!');
        } catch (error) {
            console.warn('⚠️ Some assets failed to load, using fallbacks');
            this.loaded = true; // Still mark as loaded to proceed
        }
    }

    // Check if assets are ready
    isReady() {
        return this.loaded;
    }

    // Get appropriate sprite based on player state
    getPlayerSprite(velocityX, isGrounded) {
        // Choose sprite based on movement direction
        if (velocityX < -0.5 && this.images.leftJump) {
            return this.images.leftJump;
        } else if (velocityX > 0.5 && this.images.rightJump) {
            return this.images.rightJump;
        } else if (this.images.jump) {
            return this.images.jump;
        }
        return null; // Fallback to procedural drawing
    }

    // Update method for animated assets
    update(deltaTime) {
        // Add any asset animations here (rotating elements, pulsing effects, etc.)
        // This method is called every frame to update dynamic visual elements
    }
}

// Export singleton instance
const gameAssets = new GameAssets();
console.log('🎨 Game assets loaded');