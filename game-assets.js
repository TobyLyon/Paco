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
        
        // Asset paths - ALL ASSETS IN GAME SUBDIRECTORY FOR CONSISTENCY
        this.assetPaths = {
            // Player sprites
            jump: 'game/jump.png',
            leftJump: 'game/left_jump.png',
            rightJump: 'game/right_jump.png', 
            walk: 'game/walk.gif',
            
            // Platform decorations
            corn: 'game/corn.png',
            taco: 'game/taco.png',
            
            // Enemies/obstacles
            evilFlocko: 'game/evil-flocko.png'
        };
        
        // Power-up types using existing assets
        this.powerUpTypes = {
            corn: {
                name: 'Fly Boost',
                description: 'Super jump power!',
                duration: 3000, // 3 seconds (reduced from 5)
                asset: 'corn', // Use corn sprite
                rarity: 0.25 // Reduced spawn rate (was 0.4)
            },
            shield: {
                name: 'Shield Power', 
                description: 'Invincibility protection!',
                duration: 4000, // 4 seconds
                asset: null, // Use emoji fallback - no custom sprite
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
            
            // Platform colors - STRATEGIC BOUNCE SYSTEM
            platform: {
                normal: '#8B4513',
                spring: '#22c55e',        // Green - Standard spring (1.7x bounce)
                superspring: '#ffd700',   // Bright Gold - MEGA spring (2.1x bounce)  
                minispring: '#87ceeb',    // Light Blue - Mini spring (1.35x bounce)
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

    // Sound effect configuration - ENHANCED FOR ADDICTIVE AUDIO! 🎵
    getSoundEffects() {
        return {
            // === CORE MOVEMENT SOUNDS ===
            jump: { frequency: 400, duration: 0.1 },
            platform: { frequency: 300, duration: 0.05 },
            bounce: { frequency: 600, duration: 0.15 },
            
            // === ENHANCED PLATFORM SOUNDS ===
            springBounce: { frequency: 800, duration: 0.2 }, // Standard spring - satisfying pop! 🟢
            superSpringBounce: { frequency: 1200, duration: 0.4 }, // MEGA spring - epic launch! 🟡
            miniSpringBounce: { frequency: 650, duration: 0.15 }, // Mini spring - cute hop! 🔵
            movingPlatform: { frequency: 420, duration: 0.08 }, // Moving platform wobble
            breakingPlatform: { frequency: 180, duration: 0.6 }, // Platform breaking - ominous crack!
            cloudPlatform: { frequency: 550, duration: 0.12 }, // Soft cloud bounce - airy feel
            
            // === COLLECTION & REWARD SOUNDS ===
            powerup: { frequency: 800, duration: 0.2 },
            taco: { frequency: 660, duration: 0.2 }, // Taco collection sound! 🌮
            tacoStreak: { frequency: 880, duration: 0.3 }, // Multiple tacos in a row! 🌮🌮
            score: { frequency: 523, duration: 0.1 },
            scoreStreak: { frequency: 740, duration: 0.15 }, // Rapid scoring combo!
            comboBonus: { frequency: 987, duration: 0.4 }, // Combo multiplier achieved! ⚡
            
            // === MILESTONE SOUNDS ===
            milestone100: { frequency: 600, duration: 0.3 }, // Every 100 points - gentle chime
            milestone500: { frequency: 800, duration: 0.4 }, // Every 500 points - satisfying ding
            milestone1000: { frequency: 1100, duration: 0.6 }, // Every 1000 points - epic fanfare!
            newPersonalBest: { frequency: 1400, duration: 1.0 }, // New high score - celebration!
            
            // === POWER-UP ENHANCED SOUNDS ===
            flying: { frequency: 880, duration: 0.4 }, // Flying power-up sound! 🌽✈️
            powerupCorn: { frequency: 950, duration: 0.5 }, // Super flight activation! 🌽
            powerupShield: { frequency: 440, duration: 0.6 }, // Evil shield activation! 👹
            powerupMagnet: { frequency: 740, duration: 0.4 }, // Taco magnet activation! 🧲
            powerupExpire: { frequency: 350, duration: 0.3 }, // Power-up expiring
            powerupLowTime: { frequency: 450, duration: 0.1 }, // Power-up running out - warning beep
            
            // === PERFECT TIMING & SKILL SOUNDS ===
            perfectBounce: { frequency: 1200, duration: 0.3 }, // Perfect timing bounce! ⚡
            skillStreak: { frequency: 1050, duration: 0.25 }, // Multiple perfect bounces in a row
            
            // === DANGER & DEATH SOUNDS ===
            fall: { frequency: 200, duration: 0.3 },
            evilFlockoDeath: { frequency: 150, duration: 0.8 }, // Deep, ominous death sound! 💀
            evilFlockoDefeat: { frequency: 1300, duration: 0.5 }, // Defeating evil flocko - triumphant!
            dangerZone: { frequency: 250, duration: 0.2 }, // Getting close to death zone
            lastChance: { frequency: 300, duration: 0.4 }, // Very close to game over - urgent!
            
            // === ATMOSPHERIC SOUNDS ===
            heightGain: { frequency: 480, duration: 0.08 }, // Subtle upward progress sound
            windWhoosh: { frequency: 200, duration: 0.15 }, // High altitude wind effect
            spaceAmbient: { frequency: 350, duration: 0.25 }, // Entering space zone
            
            // === UI & FEEDBACK SOUNDS ===
            gameStart: { frequency: 523, duration: 0.3 }, // Game starting - uplifting tone
            gameOver: { frequency: 220, duration: 1.2 }, // Game over - somber but not harsh
            newGame: { frequency: 659, duration: 0.4 }, // Starting new game - hopeful tone
            buttonHover: { frequency: 400, duration: 0.05 }, // UI feedback - subtle
            buttonClick: { frequency: 600, duration: 0.08 }, // UI confirmation - crisp
            
            // === COMBO SYSTEM SOUNDS ===
            combo2x: { frequency: 700, duration: 0.2 }, // 2x combo multiplier
            combo3x: { frequency: 850, duration: 0.25 }, // 3x combo multiplier  
            combo5x: { frequency: 1000, duration: 0.3 }, // 5x combo multiplier
            comboMax: { frequency: 1200, duration: 0.5 }, // Maximum combo - epic!
            comboLost: { frequency: 400, duration: 0.2 } // Combo broken - disappointed but not harsh
        };
    }

    // Game configuration
    getGameConfig() {
        // Detect mobile for larger canvas
        const isMobile = window.innerWidth <= 768;
        const canvasWidth = isMobile ? 360 : 320;   // 40px wider on mobile
        const canvasHeight = isMobile ? 560 : 480;  // 80px taller on mobile
        
        return {
            // Canvas settings
            canvas: {
                width: canvasWidth,
                height: canvasHeight
            },
            
            // Player settings
            player: {
                width: 32,
                height: 32,
                jumpForce: 16, // Increased from 14 to compensate for removed timing bounce (14 * 1.15 ≈ 16)
            maxSpeed: 5.5, // Further tuned for smoother control
                gravity: 0.5
            },
            
            // Platform settings - CONSERVATIVE FOR GUARANTEED REACHABILITY
            platform: {
                width: 60,
                height: 12,
                spacing: 80,
                minGap: 20,        // Safer start gaps
                maxGap: 50,        // Much more conservative max gap
                easyMinGap: 15,    // Very easy gaps for beginners  
                easyMaxGap: 30,    // Conservative easy max gap
                hardMinGap: 30,    // Conservative gaps at high altitudes
                hardMaxGap: 60     // Safe but challenging gap (well below max reachable)
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
        
        // Add platform details based on type - STRATEGIC SPRING SYSTEM
        switch(type) {
            case 'superspring':
                // MEGA SPRING - Bright gold with large visual indicator
                ctx.fillStyle = '#FFD700'; // Bright gold
                ctx.fillRect(x, y - 4, width, height + 8); // Thicker platform
                
                // Draw large spring coils with golden glow
                ctx.strokeStyle = '#FFB000';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for(let i = 0; i < 4; i++) {
                    const coilX = x + 8 + (i * 11);
                    ctx.moveTo(coilX, y - 2);
                    ctx.quadraticCurveTo(coilX + 6, y - 8, coilX + 12, y - 2);
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                
                // Add sparkle effect
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(x + width/4, y - 6, 2, 2);
                ctx.fillRect(x + 3*width/4, y - 6, 2, 2);
                break;
                
            case 'spring':
                // STANDARD SPRING - Green with corn sprite or coils
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
                
            case 'minispring':
                // MINI SPRING - Light blue with small bouncy indicator
                ctx.fillStyle = '#87CEEB'; // Light blue
                ctx.fillRect(x, y, width, height);
                
                // Draw small spring coils
                ctx.strokeStyle = '#4682B4';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for(let i = 0; i < 2; i++) {
                    const coilX = x + 15 + (i * 15);
                    ctx.moveTo(coilX, y + 2);
                    ctx.quadraticCurveTo(coilX + 3, y - 2, coilX + 6, y + 2);
                }
                ctx.stroke();
                
                // Add small bounce indicator
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(x + width/2, y - 3, 2, 0, Math.PI * 2);
                ctx.fill();
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

    // Draw progressive background - Earth's atmosphere to deep space!
    drawBackground(ctx, canvasWidth, canvasHeight, scrollY, playerScore = 0) {
        // Calculate altitude progression (0 = ground, 1 = deep space)
        const maxAltitude = 5000; // Score at which we reach deep space
        const altitudeProgress = Math.min(playerScore / maxAltitude, 1);
        
        // Define our atmospheric layers with smooth transitions
        const atmosphericLayers = [
            // Layer 0: Earth's surface (bright sky blue)
            { top: '#87CEEB', middle: '#B0E0E6', bottom: '#E0F6FF', clouds: 0.6, stars: 0 },
            // Layer 1: Lower atmosphere (deeper blue)
            { top: '#4682B4', middle: '#6495ED', bottom: '#87CEEB', clouds: 0.4, stars: 0 },
            // Layer 2: Upper atmosphere (purple-blue)
            { top: '#191970', middle: '#4169E1', bottom: '#6495ED', clouds: 0.2, stars: 0.1 },
            // Layer 3: Edge of space (dark purple)
            { top: '#0B0B2F', middle: '#1E1E3F', bottom: '#2F2F4F', clouds: 0.05, stars: 0.3 },
            // Layer 4: Deep space (black with stars)
            { top: '#000000', middle: '#0A0A0A', bottom: '#1A1A1A', clouds: 0, stars: 1 }
        ];
        
        // Calculate which layers to blend between
        const layerIndex = altitudeProgress * (atmosphericLayers.length - 1);
        const lowerLayerIndex = Math.floor(layerIndex);
        const upperLayerIndex = Math.min(lowerLayerIndex + 1, atmosphericLayers.length - 1);
        const blendFactor = layerIndex - lowerLayerIndex;
        
        const lowerLayer = atmosphericLayers[lowerLayerIndex];
        const upperLayer = atmosphericLayers[upperLayerIndex];
        
        // Blend between the two layers
        const blendedLayer = {
            top: this.blendColors(lowerLayer.top, upperLayer.top, blendFactor),
            middle: this.blendColors(lowerLayer.middle, upperLayer.middle, blendFactor),
            bottom: this.blendColors(lowerLayer.bottom, upperLayer.bottom, blendFactor),
            clouds: lowerLayer.clouds + (upperLayer.clouds - lowerLayer.clouds) * blendFactor,
            stars: lowerLayer.stars + (upperLayer.stars - lowerLayer.stars) * blendFactor
        };
        
        // Create the atmospheric gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, blendedLayer.top);
        gradient.addColorStop(0.3, blendedLayer.middle);
        gradient.addColorStop(1, blendedLayer.bottom);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw stars in space (higher altitude = more stars)
        if (blendedLayer.stars > 0) {
            this.drawStars(ctx, canvasWidth, canvasHeight, scrollY, blendedLayer.stars);
        }
        
        // Draw clouds (fewer as we go higher)
        if (blendedLayer.clouds > 0) {
            this.drawClouds(ctx, canvasWidth, canvasHeight, scrollY, blendedLayer.clouds);
        }
    }
    
    // Helper function to blend two hex colors
    blendColors(color1, color2, factor) {
        // Convert hex to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        // Blend the colors
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Draw stars for space sections
    drawStars(ctx, canvasWidth, canvasHeight, scrollY, opacity) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        
        // Create a deterministic star field based on scroll position (ensure positive seed)
        const starSeed = Math.abs(Math.floor(scrollY / 100));
        const starCount = Math.floor(50 * opacity);
        
        for (let i = 0; i < starCount; i++) {
            // Use pseudo-random positioning based on seed (ensure positive values)
            const x = Math.abs((starSeed + i * 37) % 97) * (canvasWidth / 97);
            const y = Math.abs(((starSeed + i * 73) % 113) * (canvasHeight / 113) + (scrollY * 0.02)) % canvasHeight;
            const size = Math.max(1, Math.abs((starSeed + i * 17) % 3) + 1); // Ensure size is always positive and at least 1
            
            // Safety check to prevent negative radius
            if (size > 0) {
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add twinkling effect for larger stars
                if (size > 2) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size + 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                }
            }
        }
        
        ctx.restore();
    }
    
    // Draw clouds for atmospheric sections
    drawClouds(ctx, canvasWidth, canvasHeight, scrollY, opacity) {
        if (opacity <= 0) return;
        
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
        
        const cloudOffset = (scrollY * 0.08) % 600;
        const cloudCount = Math.floor(4 * opacity);
        
        for(let i = 0; i < cloudCount; i++) {
                const cloudY = (i * 150) - cloudOffset;
                if(cloudY > -60 && cloudY < canvasHeight + 60) {
                    this.drawCloud(ctx, 60 + (i * 90) % (canvasWidth - 120), cloudY, 35, 18);
                }
            }
        
        ctx.restore();
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
            // Larger taco size for better visibility and collection
            const tacoSize = 80; // 2x bigger as requested
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
            // Fallback: Draw procedural taco with larger size
            const fallbackWidth = 80; // 2x bigger to match sprite size
            const fallbackHeight = 80;
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(-fallbackWidth/2, -fallbackHeight/2, fallbackWidth, fallbackHeight);
            
            // Add some taco details (scaled for larger size)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(-36, -36, 72, 8); // Green lettuce stripe (2x size)
            ctx.fillStyle = '#FF6347';
            ctx.fillRect(-36, -20, 72, 6); // Red tomato stripe (2x size)
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
            // Standard uniform size for all collectibles
            const powerupSize = 40; // Uniform size matching tacos
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
            ctx.arc(0, 0, 20, 0, Math.PI * 2); // Standard 40px diameter (20px radius)
        ctx.fill();
            
            // Add type indicator
            ctx.fillStyle = '#ffffff';
            ctx.font = `24px Arial`; // Standard size for uniform appearance
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