// ===== PACO JUMP - GAME PHYSICS MODULE =====

/**
 * Game Physics Engine
 * Handles all physics calculations, collision detection, and movement
 * Designed for smooth 60fps performance on mobile devices
 */

class GamePhysics {
    constructor() {
        // CLASSIC DOODLE JUMP PHYSICS VALUES
        this.gravity = 0.5;              // Simple gravity per frame
        this.jumpForce = 16;             // Auto-jump force when hitting platform - MUST MATCH gameAssets.config.player.jumpForce!
        this.horizontalSpeed = 5;        // Left/right movement speed (increased for better feel)
        this.friction = 0.85;            // Horizontal friction (simple!)
        this.terminalVelocity = 15;      // Max fall speed
        
        // Simple collision settings (like original)
        this.platformTolerance = 5;      // Landing tolerance - much simpler!
    }

    // Update player physics - SIMPLE DOODLE JUMP STYLE!
    updatePlayer(player, deltaTime, canvasWidth) {
        // FLYING MODE (corn power-up)
        if (player.isFlying && player.flyingTimeLeft > 0) {
            player.flyingTimeLeft -= deltaTime;
            
            // Reduced gravity + upward force when flying
            player.velocityY += this.gravity * 0.3;  // Much less gravity
            player.velocityY -= player.flyingPower * 0.6;  // Flying force
            
            if (player.flyingTimeLeft <= 0) {
                player.isFlying = false;
                player.flyingTimeLeft = 0;
                console.log('🌽 Flying mode ended');
            }
        } else {
            // SIMPLE GRAVITY - just add it every frame!
            player.velocityY += this.gravity;
        }
        
        // SIMPLE HORIZONTAL FRICTION (not complex air resistance!)
        player.velocityX *= this.friction;
        
        // CLAMP VELOCITIES  
        player.velocityY = Math.min(player.velocityY, this.terminalVelocity);
        player.velocityX = Math.max(-15, Math.min(15, player.velocityX));
        
        // UPDATE POSITION - SIMPLE!
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // SCREEN WRAPPING (classic Doodle Jump!)
        if (player.x + player.width < 0) {
            player.x = canvasWidth;
        } else if (player.x > canvasWidth) {
            player.x = -player.width;
        }
        
        // SIMPLE ROTATION based on horizontal movement
        const targetRotation = player.velocityX * 0.05;
        player.rotation = this.lerp(player.rotation, targetRotation, 0.2);
        
        // TRAIL EFFECT (occasionally)
        if (Math.random() < 0.7) {
            this.updatePlayerTrail(player);
        }
    }

    // Update player trail effect
    updatePlayerTrail(player) {
        if (!player.trail) {
            player.trail = [];
        }
        
        // Add current position to trail
        player.trail.unshift({
            x: player.x + player.width/2,
            y: player.y + player.height/2,
            alpha: 1.0
        });
        
        // Update trail alpha and remove old positions
        for (let i = player.trail.length - 1; i >= 0; i--) {
            player.trail[i].alpha -= 0.15;
            if (player.trail[i].alpha <= 0 || i >= gameAssets.config.effects.trailLength) {
                player.trail.splice(i, 1);
            }
        }
    }

    // Check collision - SIMPLE DOODLE JUMP STYLE!
    checkPlatformCollision(player, platform) {
        // ONLY CHECK IF FALLING (original Doodle Jump behavior)
        if (player.velocityY <= 0) {
            return false; // Moving up or not moving, no collision
        }
        
        // SIMPLE HORIZONTAL OVERLAP CHECK
        const playerCenter = player.x + player.width / 2;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        // Player center must be over platform
        if (playerCenter < platformLeft || playerCenter > platformRight) {
            return false;
        }
        
        // SIMPLE VERTICAL COLLISION (like original!)
        const playerBottom = player.y + player.height;
        const platformTop = platform.y;
        
        // Landing on platform with simple tolerance
        if (playerBottom >= platformTop - this.platformTolerance && 
            playerBottom <= platformTop + this.platformTolerance) {
            return true;
        }
        
        return false;
    }

    // Handle platform jump - STRATEGIC BOUNCE SYSTEM!
    handlePlatformJump(player, platform) {
        // STRATEGIC JUMP FORCES WITH COLOR CODING
        let jumpForce = this.jumpForce;
        let particleColor = 'feather';
        
        switch(platform.type) {
            case 'superspring':
                jumpForce = this.jumpForce * 2.1; // MEGA BOOST for very difficult sections!
                particleColor = 'gold';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 35);
                break;
            case 'spring':
                jumpForce = this.jumpForce * 1.7; // Strong spring boost
                particleColor = 'green';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 25);
                break;
            case 'minispring':
                jumpForce = this.jumpForce * 1.35; // Small helpful boost
                particleColor = 'blue';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 15);
                break;
            case 'cloud':
                jumpForce = this.jumpForce * 0.8; // Softer cloud bounce
                break;
            case 'evil':
                jumpForce = this.jumpForce * 0.6; // Weaker evil platform
                break;
            default:
                jumpForce = this.jumpForce; // Normal bounce
                break;
        }
        
        // AUTO-BOUNCE! (key Doodle Jump mechanic)
        player.velocityY = -jumpForce;
        
        // Position player on platform surface
        player.y = platform.y - player.height;
        
        // Small random horizontal variation (subtle!)
        const horizontalBoost = (Math.random() - 0.5) * 1.0;
        player.velocityX += horizontalBoost;
        
        return {
            type: platform.type,
            jumpForce: jumpForce,
            position: { x: platform.x, y: platform.y }
        };
    }

    // Update platform physics - SIMPLE DOODLE JUMP STYLE!
    updatePlatform(platform, deltaTime, canvasWidth) {
        if (platform.type === 'moving') {
            // Initialize movement if not set
            if (platform.velocityX === undefined) {
                platform.velocityX = (Math.random() > 0.5 ? 1 : -1) * 2;
            }
            
            // SIMPLE PLATFORM MOVEMENT!
            platform.x += platform.velocityX;
            
            // BOUNCE OFF WALLS (simple!)
            if (platform.x <= 0 || platform.x >= canvasWidth - platform.width) {
                platform.velocityX = -platform.velocityX;
                platform.x = Math.max(0, Math.min(canvasWidth - platform.width, platform.x));
            }
        }
        
        if (platform.type === 'breaking' && platform.breakTimer !== undefined) {
            // SIMPLE BREAK TIMER 
            platform.breakTimer += deltaTime;
            if (platform.breakTimer >= 30) { // ~500ms at 60fps
                platform.broken = true;
            }
        }
    }

    // Create particle effects
    createJumpParticles(x, y, type = 'feather') {
        const particles = [];
        const particleCount = gameAssets.config.effects.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 10,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: -Math.random() * 3 - 1,
                size: Math.random() * 3 + 2,
                type: type,
                alpha: 1.0,
                life: 60 // 1 second at 60fps
            });
        }
        
        return particles;
    }

    // DOODLE JUMP HORIZONTAL MOVEMENT - CLASSIC FEEL!
    movePlayerHorizontal(player, direction) {
        // direction: -1 for left, 1 for right, 0 for no input
        if (direction !== 0) {
            // ACCELERATE in movement direction (like original!)
            player.velocityX += direction * this.horizontalSpeed * 0.5; // Increased from 0.3 to 0.5
        }
        
        // CLAMP TO MAX SPEED (more responsive)
        const maxSpeed = this.horizontalSpeed * 3.0; // Increased from 2.5 to 3.0
        player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
    }

    // Update particles - SIMPLE style!
    updateParticles(particles, deltaTime) {
        // Simple particle updates
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // SIMPLE position updates
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            
            // Simple gravity for particles
            particle.velocityY += this.gravity * 0.2;
            
            // SIMPLE particle aging
            if (particle.life !== undefined) {
                particle.life--;
                particle.alpha = particle.life / 60;
                
                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            } else if (particle.decay !== undefined) {
                particle.alpha -= particle.decay;
                
                if (particle.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }
        }
    }

    // Generate platforms using procedural generation
    generatePlatforms(startY, endY, canvasWidth, existingPlatforms = []) {
        const platforms = [];
        const platformConfig = gameAssets.config.platform;
        
        let currentY = startY;
        
        while (currentY > endY) {
            // Progressive difficulty based on height
            const height = Math.abs(currentY);
            let minGap, maxGap;
            
            if (height < 400) {
                // Very easy start - close platforms for confidence building
                minGap = platformConfig.easyMinGap;
                maxGap = platformConfig.easyMaxGap;
            } else if (height < 1000) {
                // Early game - gentle progression  
                const factor = (height - 400) / 600; // 0 to 1
                minGap = platformConfig.easyMinGap + factor * (platformConfig.minGap - platformConfig.easyMinGap) * 0.7;
                maxGap = platformConfig.easyMaxGap + factor * (platformConfig.maxGap - platformConfig.easyMaxGap) * 0.7;
            } else if (height < 2500) {
                // Mid game - normal difficulty with good flow
                const factor = (height - 1000) / 1500; // 0 to 1
                minGap = platformConfig.minGap * (0.9 + factor * 0.1);
                maxGap = platformConfig.maxGap * (0.9 + factor * 0.1);
            } else if (height < 7500) {
                // Advanced - challenging but fair with gradual increase
                const factor = Math.min(1, (height - 2500) / 5000); // 0 to 1 over 5000 pixels
                minGap = platformConfig.minGap + factor * (platformConfig.hardMinGap - platformConfig.minGap) * 0.85;
                maxGap = platformConfig.maxGap + factor * (platformConfig.hardMaxGap - platformConfig.maxGap) * 0.75; // Cap at 75% of max hard gap
            } else {
                // Expert level - maximum challenge but still beatable
                minGap = platformConfig.minGap + (platformConfig.hardMinGap - platformConfig.minGap) * 0.85;
                maxGap = platformConfig.maxGap + (platformConfig.hardMaxGap - platformConfig.maxGap) * 0.75; // Never go full hard mode
            }
            
            // Calculate next platform position with progressive difficulty
            const gapSize = minGap + Math.random() * (maxGap - minGap);
            currentY -= gapSize;
            
            // IMPROVED X positioning - guarantee reachability based on physics
            let x;
            if (platforms.length === 0) {
                // First platform - place reasonably centered
                x = (canvasWidth - platformConfig.width) / 2 + (Math.random() - 0.5) * 100;
            } else {
                // Calculate actual horizontal reach based on jump physics
                const lastPlatform = platforms[platforms.length - 1];
                const jumpForce = this.jumpForce; // Use physics engine jump force for consistency
                const gravity = this.gravity;
                const maxSpeed = gameAssets.config.player.maxSpeed;
                
                // Physics-based horizontal reach calculation
                // Time to fall from jump height: t = 2 * jumpForce / gravity
                const jumpTime = (2 * jumpForce) / gravity;
                // Horizontal distance with air control: distance = maxSpeed * jumpTime * airControlFactor
                const maxHorizontalReach = Math.min(150, maxSpeed * jumpTime * 0.8); // 0.8 = air control factor
                
                // Ensure platform is within reach, with safety margin
                const safetyMargin = 20;
                const effectiveReach = maxHorizontalReach - safetyMargin;
                
                const minX = Math.max(0, lastPlatform.x - effectiveReach);
                const maxX = Math.min(canvasWidth - platformConfig.width, lastPlatform.x + effectiveReach);
                
                // Guarantee valid range
                if (minX >= maxX) {
                    x = Math.max(0, Math.min(canvasWidth - platformConfig.width, lastPlatform.x));
                } else {
                    x = minX + Math.random() * (maxX - minX);
                }
            }
            
            // STRATEGIC PLATFORM TYPE DETERMINATION
            let type = 'normal';
            const rand = Math.random();
            
            // Check if we need a strategic bounce platform
            const gapFromLast = platforms.length > 0 ? Math.abs(currentY - platforms[platforms.length - 1].y) : 0;
            const horizontalDistanceFromLast = platforms.length > 0 ? Math.abs(x - platforms[platforms.length - 1].x) : 0;
            
            // Calculate if this gap is approaching maximum reachability  
            const actualJumpForce = this.jumpForce; // Use physics engine jump force for consistency
            const maxReachableGap = (actualJumpForce * actualJumpForce) / this.gravity; // Physics-based max height
            const isLargeGap = gapFromLast > maxReachableGap * 0.7; // 70% of max reach
            const isVeryLargeGap = gapFromLast > maxReachableGap * 0.85; // 85% of max reach
            const isHorizontallyDifficult = horizontalDistanceFromLast > 120;
            
            // Count recent spring platforms to avoid clustering
            let recentSprings = 0;
            let recentEvil = 0;
            for (let i = Math.max(0, platforms.length - 3); i < platforms.length; i++) {
                if (platforms[i].type.includes('spring')) recentSprings++;
                if (platforms[i].type === 'evil') recentEvil++;
            }
            
            // STRATEGIC PLACEMENT LOGIC - SAFETY FIRST, THEN DIFFICULTY
            // Always prioritize reachability over difficulty level
            if (isVeryLargeGap && recentSprings === 0) {
                // Emergency super spring for very difficult sections (ANY height)
                type = 'superspring';
            } else if (isLargeGap && recentSprings < 2) {
                // Regular spring for challenging sections (ANY height)
                type = 'spring';
            } else if (gapFromLast > maxReachableGap * 0.6 && recentSprings < 1) {
                // Safety net for medium-large gaps at ANY height
                type = Math.random() < 0.8 ? 'spring' : 'minispring';
            } else if (recentEvil >= 2) {
                // Force a helpful platform after multiple evil platforms
                type = Math.random() < 0.7 ? 'spring' : 'minispring';
            } else if (height < 400) {
                // Early game - mostly normal with frequent helpful springs
                if (gapFromLast > maxReachableGap * 0.4) type = 'minispring'; // Extra safety for early game
                else if (rand < 0.25) type = 'minispring'; // More frequent mini springs
            } else if (height < 800) {
                // Early-mid game - introduce springs strategically
                if (rand < 0.08) type = 'spring';
                else if (rand < 0.18) type = 'minispring';
                else if (rand < 0.25) type = 'moving';
            } else if (height < 1500) {
                // Mid game - balanced challenge with strategic recovery
                if (isHorizontallyDifficult && rand < 0.3) type = 'spring'; // Help with horizontal challenges
                else if (rand < 0.05) type = 'spring';
                else if (rand < 0.15) type = 'minispring';
                else if (rand < 0.25) type = 'moving';
                else if (rand < 0.35) type = 'cloud';
                else if (rand < 0.42) type = 'breaking';
            } else if (height < 3000) {
                // Advanced game - more challenge but strategic recovery
                if (isHorizontallyDifficult && rand < 0.4) type = 'spring'; // More help for horizontal challenges
                else if (rand < 0.08) type = 'spring';
                else if (rand < 0.18) type = 'minispring';
                else if (rand < 0.30) type = 'moving';
                else if (rand < 0.40) type = 'cloud';
                else if (rand < 0.50) type = 'breaking';
                else if (rand < 0.53) type = 'evil';
            } else {
                // Expert level - maximum strategic placement with guaranteed help
                if (isVeryLargeGap && rand < 0.8) type = 'superspring'; // Very high chance of mega help
                else if (isLargeGap && rand < 0.6) type = 'spring'; // Higher chance of spring help
                else if (isHorizontallyDifficult && rand < 0.7) type = 'spring'; // Much higher chance for horizontal challenges
                else if (rand < 0.15) type = 'spring'; // More springs in general
                else if (rand < 0.28) type = 'minispring'; // More mini springs
                else if (rand < 0.38) type = 'moving';
                else if (rand < 0.46) type = 'cloud';
                else if (rand < 0.54) type = 'breaking';
                else if (rand < 0.56) type = 'evil'; // Reduce evil platforms at expert level
            }
            
            platforms.push({
                x: x,
                y: currentY,
                width: platformConfig.width,
                height: platformConfig.height,
                type: type,
                touched: false,
                broken: false
            });
        }
        
        return platforms;
    }

    // Calculate score based on height reached
    calculateScore(playerY, startY) {
        const heightDifference = Math.max(0, startY - playerY);
        return Math.floor(heightDifference / 10) * gameAssets.config.score.heightMultiplier;
    }

    // Linear interpolation utility
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // Check if point is in circle (for circular collision detection)
    pointInCircle(pointX, pointY, circleX, circleY, radius) {
        const dx = pointX - circleX;
        const dy = pointY - circleY;
        return dx * dx + dy * dy <= radius * radius;
    }

    // Check rectangle collision
    rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Get camera target position (following player with some offset)
    getCameraTarget(player, canvasHeight) {
        // Keep player in lower third of screen when jumping up
        return player.y - canvasHeight * 0.7;
    }

    // Update camera with smooth following - IMPROVED for frame-rate independence
    updateCamera(camera, targetY, deltaTime) {
        const normalizedDelta = deltaTime / 16.67; // Consistent normalization
        const followSpeed = 0.1;
        
        // Smooth camera interpolation with frame-rate independence
        const lerpFactor = Math.min(1.0, followSpeed * normalizedDelta);
        camera.y = this.lerp(camera.y, targetY, lerpFactor);
        
        // Prevent camera from going down (only follow upward movement)
        camera.y = Math.min(camera.y, camera.maxY || camera.y);
        camera.maxY = camera.y;
    }
}

// Export singleton instance
const gamePhysics = new GamePhysics();
console.log('⚡ Game physics loaded');
console.log('⚡ Game physics loaded');