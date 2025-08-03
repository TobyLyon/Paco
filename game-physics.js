// ===== PACO JUMP - GAME PHYSICS MODULE =====

/**
 * Game Physics Engine
 * Handles all physics calculations, collision detection, and movement
 * Designed for smooth 60fps performance on mobile devices
 */

class GamePhysics {
    constructor() {
        this.gravity = 0.5;
        this.friction = 0.8;
        this.airResistance = 0.98; // Slightly more resistance for better control
        this.terminalVelocity = 20;
        
        // Platform collision settings
        this.platformCollisionBuffer = 5;
        this.velocityThreshold = 0.1; // Minimum velocity for platform collision
    }

    // Update player physics - optimized for stability
    updatePlayer(player, deltaTime, canvasWidth) {
        // Clamp delta time for stability
        deltaTime = Math.min(deltaTime, 3.0); // Prevent physics explosions
        
        // Handle flying mode
        if (player.isFlying && player.flyingTimeLeft > 0) {
            // Count down flying time
            player.flyingTimeLeft -= deltaTime * 16.67; // Convert to milliseconds
            
            // Apply reduced gravity and upward flying force
            const reducedGravity = this.gravity * 0.6; // Less dramatic gravity reduction (was 0.3)
            player.velocityY += reducedGravity * deltaTime;
            player.velocityY -= player.flyingPower * deltaTime; // Continuous upward force
            
            // End flying mode when time runs out
            if (player.flyingTimeLeft <= 0) {
                player.isFlying = false;
                player.flyingTimeLeft = 0;
                console.log('🌽 Flying mode ended');
            }
        } else {
            // Normal gravity when not flying
            player.velocityY += this.gravity * deltaTime;
        }
        
        // Apply air resistance with stability check
        player.velocityX *= Math.pow(this.airResistance, deltaTime / 16.67);
        
        // Clamp velocities for stability
        player.velocityY = Math.min(player.velocityY, this.terminalVelocity);
        player.velocityX = Math.max(-15, Math.min(15, player.velocityX)); // Prevent extreme speeds
        
        // Update position with clamped movement
        const maxMovement = 20; // Prevent teleporting
        const deltaX = Math.max(-maxMovement, Math.min(maxMovement, player.velocityX * deltaTime));
        const deltaY = Math.max(-maxMovement, Math.min(maxMovement, player.velocityY * deltaTime));
        
        player.x += deltaX;
        player.y += deltaY;
        
        // Handle horizontal screen wrapping
        if (player.x + player.width < 0) {
            player.x = canvasWidth;
        } else if (player.x > canvasWidth) {
            player.x = -player.width;
        }
        
        // Update player rotation based on movement (smoother)
        const targetRotation = Math.max(-0.3, Math.min(0.3, player.velocityX * 0.08));
        player.rotation = this.lerp(player.rotation, targetRotation, 0.15);
        
        // Update trail positions (less frequently for performance)
        if (Math.random() < 0.7) { // 70% chance to update trail each frame
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

    // Check collision between player and platform
    checkPlatformCollision(player, platform) {
        // Only check collision if player is falling (any downward velocity)
        if (player.velocityY < 0) {
            return false; // Player is moving up, no collision
        }
        
        // Check horizontal overlap
        const playerCenterX = player.x + player.width/2;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        if (playerCenterX < platformLeft || playerCenterX > platformRight) {
            return false;
        }
        
        // Check vertical collision - player must be landing on top of platform
        const playerBottom = player.y + player.height;
        const platformTop = platform.y;
        
        // Allow collision if player is just above or touching the platform top
        if (playerBottom >= platformTop && playerBottom <= platformTop + platform.height + this.platformCollisionBuffer) {
            // Additional check: only trigger if player was above platform in previous frame
            // This prevents collision when player is inside or below platform
            if (player.y <= platformTop) {
                return true;
            }
        }
        
        return false;
    }

    // Handle player jumping from platform
    handlePlatformJump(player, platform) {
        // Calculate jump force based on platform type
        let jumpForce = gameAssets.config.player.jumpForce;
        
        switch(platform.type) {
            case 'spring':
                // Spring platforms now give FLYING POWER! 🌽✈️
                jumpForce *= 1.3; // Reduced initial boost (was 1.8)
                // Enable flying mode for 3 seconds
                if (!player.isFlying) {
                    player.flyingJustActivated = true; // Flag for sound playing
                }
                player.isFlying = true;
                player.flyingTimeLeft = 3000; // 3 seconds in milliseconds
                player.flyingPower = 0.15; // Reduced upward force (was 0.3)
                console.log('🌽✈️ FLYING MODE ACTIVATED!');
                break;
            case 'cloud':
                jumpForce *= 0.8; // Cloud platforms are softer
                break;
            case 'breaking':
                // Breaking platforms will be handled separately
                jumpForce *= 1.0;
                break;
            case 'evil':
                jumpForce *= 0.6; // Evil platforms reduce jump force (challenging!)
                break;
        }
        
        // Apply jump velocity
        player.velocityY = -jumpForce;
        
        // Position player on top of platform
        player.y = platform.y - player.height;
        
        // Add slight horizontal velocity for variety
        const horizontalBoost = (Math.random() - 0.5) * 2;
        player.velocityX += horizontalBoost;
        
        // Clamp horizontal velocity
        player.velocityX = Math.max(-gameAssets.config.player.maxSpeed, 
                                  Math.min(gameAssets.config.player.maxSpeed, player.velocityX));
        
        return {
            type: platform.type,
            jumpForce: jumpForce,
            position: { x: platform.x, y: platform.y }
        };
    }

    // Update platform physics (for moving platforms)
    updatePlatform(platform, deltaTime, canvasWidth) {
        if (platform.type === 'moving') {
            // Initialize movement if not set
            if (platform.velocityX === undefined) {
                platform.velocityX = (Math.random() > 0.5 ? 1 : -1) * 2;
            }
            
            // Update position
            platform.x += platform.velocityX * deltaTime;
            
            // Bounce off screen edges
            if (platform.x <= 0 || platform.x + platform.width >= canvasWidth) {
                platform.velocityX *= -1;
                platform.x = Math.max(0, Math.min(canvasWidth - platform.width, platform.x));
            }
        }
        
        // Handle breaking platforms
        if (platform.type === 'breaking' && platform.touched) {
            if (!platform.breakTimer) {
                platform.breakTimer = 0;
            }
            
            platform.breakTimer += deltaTime;
            
            // Platform breaks after a short delay
            if (platform.breakTimer > 30) { // 30 frames = 0.5 seconds at 60fps
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

    // Update particles
    updateParticles(particles, deltaTime) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // Update position
            particle.x += particle.velocityX * deltaTime;
            particle.y += particle.velocityY * deltaTime;
            
            // Apply gravity to particles
            particle.velocityY += this.gravity * 0.3 * deltaTime;
            
            // Fade out
            particle.life -= deltaTime;
            particle.alpha = particle.life / 60;
            
            // Remove dead particles
            if (particle.life <= 0) {
                particles.splice(i, 1);
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
            } else if (height < 5000) {
                // Advanced - challenging but fair
                const factor = Math.min(1, (height - 2500) / 2500); // 0 to 1
                minGap = platformConfig.minGap + factor * (platformConfig.hardMinGap - platformConfig.minGap) * 0.8;
                maxGap = platformConfig.maxGap + factor * (platformConfig.hardMaxGap - platformConfig.maxGap) * 0.8;
            } else {
                // Expert level - maximum challenge for competition
                minGap = platformConfig.hardMinGap;
                maxGap = platformConfig.hardMaxGap;
            }
            
            // Calculate next platform position with progressive difficulty
            const gapSize = minGap + Math.random() * (maxGap - minGap);
            currentY -= gapSize;
            
            // Smarter X positioning - ensure platforms are reachable
            let x;
            if (platforms.length === 0) {
                // First platform - place reasonably centered
                x = (canvasWidth - platformConfig.width) / 2 + (Math.random() - 0.5) * 100;
            } else {
                // Place within reasonable horizontal distance from last platform
                const lastPlatform = platforms[platforms.length - 1];
                const maxHorizontalReach = 120; // Player can reach this far horizontally
                const minX = Math.max(0, lastPlatform.x - maxHorizontalReach);
                const maxX = Math.min(canvasWidth - platformConfig.width, lastPlatform.x + maxHorizontalReach);
                x = minX + Math.random() * (maxX - minX);
            }
            
            // Determine platform type based on height/difficulty
            let type = 'normal';
            const rand = Math.random();
            
            if (height < 400) {
                // Very easy start - mostly normal with occasional help
                if (rand < 0.05) type = 'spring';
            } else if (height < 1000) {
                // Early game - introduce variety gradually
                if (rand < 0.1) type = 'spring';
                else if (rand < 0.15) type = 'moving';
            } else if (height < 1800) {
                // Mid game - balanced mix for skill building
                if (rand < 0.12) type = 'spring';
                else if (rand < 0.22) type = 'moving';
                else if (rand < 0.28) type = 'cloud';
                else if (rand < 0.32) type = 'breaking';
            } else if (height < 3500) {
                // Advanced - introduce evil flockos earlier for contest excitement!
                if (rand < 0.14) type = 'spring';
                else if (rand < 0.26) type = 'moving';
                else if (rand < 0.34) type = 'cloud';
                else if (rand < 0.42) type = 'breaking';
                else if (rand < 0.46) type = 'evil'; // Appear at 1800+ height
            } else {
                // Expert level - maximum challenge for competition
                if (rand < 0.16) type = 'spring'; // Slightly more springs for high-level recovery
                else if (rand < 0.28) type = 'moving';
                else if (rand < 0.38) type = 'cloud';
                else if (rand < 0.48) type = 'breaking';
                else if (rand < 0.52) type = 'evil';
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

    // Update camera with smooth following
    updateCamera(camera, targetY, deltaTime) {
        const followSpeed = 0.1;
        camera.y = this.lerp(camera.y, targetY, followSpeed);
        
        // Prevent camera from going down (only follow upward movement)
        camera.y = Math.min(camera.y, camera.maxY || camera.y);
        camera.maxY = camera.y;
    }
}

// Export singleton instance
const gamePhysics = new GamePhysics();
console.log('⚡ Game physics loaded');