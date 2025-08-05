import Phaser from 'phaser'

export default class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainGameScene' })
    
    // Game state
    this.player = null
    this.chickens = null
    this.coops = null
    this.cursors = null
    this.gameWidth = 0
    this.gameHeight = 0
    
    // UI state
    this.selectedChicken = null
    this.cameraFollowTarget = null
  }

  preload() {
    // Set loading progress
    this.load.on('progress', (percent) => {
      console.log('Loading:', Math.round(percent * 100) + '%')
    })

    // Load placeholder sprites (will replace with actual pixel art)
    this.createPlaceholderSprites()
    
    // Load game assets
    this.loadGameAssets()
  }

  create() {
    this.gameWidth = this.scale.width
    this.gameHeight = this.scale.height
    
    // Store game reference globally for React communication
    window.phaserGame = this
    
    // Create the game world
    this.createWorld()
    this.createPlayer()
    this.createChickens()
    this.createCoops()
    this.createControls()
    this.createUI()
    
    // Setup camera
    this.setupCamera()
    
    // Start background music (if available)
    this.startBackgroundMusic()
    
    console.log('🐔 Paco\'s Farm loaded successfully!')
  }

  update(time, delta) {
    // Handle player movement
    this.handlePlayerMovement()
    
    // Update chickens
    if (this.chickens) {
      this.chickens.children.entries.forEach(chicken => {
        this.updateChicken(chicken, delta)
      })
    }
    
    // Update camera follow
    this.updateCamera()
  }

  createPlaceholderSprites() {
    // Create simple colored rectangles as placeholders
    this.load.image('grass-tile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    
    // Generate placeholder sprites programmatically
    this.generatePlaceholderSprite('player', 32, 32, 0xFFD700) // Yellow player
    this.generatePlaceholderSprite('chicken', 24, 24, 0xFFFFFF) // White chicken
    this.generatePlaceholderSprite('coop', 64, 64, 0x8B4513) // Brown coop
    this.generatePlaceholderSprite('corn', 16, 16, 0xFFFF00) // Yellow corn
  }

  generatePlaceholderSprite(key, width, height, color) {
    this.add.graphics()
      .fillStyle(color)
      .fillRect(0, 0, width, height)
      .generateTexture(key, width, height)
      .destroy()
  }

  loadGameAssets() {
    // TODO: Replace with actual pixel art assets
    // this.load.image('chicken-idle', '/assets/sprites/chicken-idle.png')
    // this.load.image('chicken-walk', '/assets/sprites/chicken-walk.png')
    // this.load.image('coop-base', '/assets/sprites/coop-base.png')
    // this.load.image('farm-tileset', '/assets/sprites/farm-tileset.png')
    
    // Load audio
    // this.load.audio('background-music', '/assets/audio/farm-theme.mp3')
    // this.load.audio('chicken-cluck', '/assets/audio/cluck.wav')
  }

  createWorld() {
    // Create tiled background
    const tileSize = 64
    const tilesX = Math.ceil(this.gameWidth / tileSize) + 2
    const tilesY = Math.ceil(this.gameHeight / tileSize) + 2
    
    this.grassTiles = this.add.group()
    
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tile = this.add.rectangle(
          x * tileSize, 
          y * tileSize, 
          tileSize, 
          tileSize, 
          0x228B22 // Forest green
        )
        tile.setOrigin(0, 0)
        tile.setStrokeStyle(1, 0x006400, 0.3) // Darker green border
        this.grassTiles.add(tile)
      }
    }
    
    // Set world bounds larger than screen for scrolling
    this.physics.world.setBounds(0, 0, tilesX * tileSize, tilesY * tileSize)
  }

  createPlayer() {
    // Player character (Paco?)
    this.player = this.physics.add.sprite(
      this.gameWidth / 2, 
      this.gameHeight / 2, 
      'player'
    )
    
    this.player.setCollideWorldBounds(true)
    this.player.setScale(1.5)
    this.player.body.setSize(20, 20) // Smaller collision box
    
    // Player animations would go here
    // this.createPlayerAnimations()
  }

  createChickens() {
    this.chickens = this.physics.add.group()
    
    // Create some initial chickens
    for (let i = 0; i < 5; i++) {
      this.spawnChicken(
        Phaser.Math.Between(100, this.gameWidth - 100),
        Phaser.Math.Between(100, this.gameHeight - 100)
      )
    }
  }

  spawnChicken(x, y) {
    const chicken = this.physics.add.sprite(x, y, 'chicken')
    
    chicken.setScale(1.2)
    chicken.setCollideWorldBounds(true)
    chicken.body.setSize(16, 16)
    
    // Chicken properties
    chicken.tier = Phaser.Math.RND.pick(['common', 'uncommon', 'rare'])
    chicken.isStaked = false
    chicken.yieldRate = this.getChickenYieldRate(chicken.tier)
    chicken.wanderTimer = 0
    chicken.targetX = x
    chicken.targetY = y
    
    // Make chickens interactive
    chicken.setInteractive()
    chicken.on('pointerdown', () => this.onChickenClicked(chicken))
    
    // Add visual indicator for tier
    const tierColors = {
      common: 0xFFFFFF,
      uncommon: 0x00FF00,
      rare: 0x0066FF
    }
    
    chicken.setTint(tierColors[chicken.tier])
    
    this.chickens.add(chicken)
    return chicken
  }

  createCoops() {
    this.coops = this.physics.add.staticGroup()
    
    // Create a main coop
    const coop = this.add.sprite(200, 200, 'coop')
    coop.setScale(1.5)
    coop.setInteractive()
    coop.on('pointerdown', () => this.onCoopClicked(coop))
    
    this.coops.add(coop)
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys()
    
    // WASD keys
    this.wasd = this.input.keyboard.addKeys('W,S,A,D')
    
    // Click to move
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) return
      
      // Check if we clicked on a game object
      const clickedObjects = this.input.hitTestPointer(pointer)
      if (clickedObjects.length === 0) {
        // Clicked on empty space - move player
        this.movePlayerTo(pointer.worldX, pointer.worldY)
      }
    })
  }

  createUI() {
    // UI elements that should stay fixed to camera
    // Most UI is handled by React, but some game-specific UI can go here
    
    // Example: floating damage numbers, particle effects, etc.
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(1)
  }

  handlePlayerMovement() {
    const speed = 200
    
    let velocityX = 0
    let velocityY = 0
    
    // Keyboard movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed
    }
    
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed
    }
    
    this.player.setVelocity(velocityX, velocityY)
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      this.player.setVelocity(velocityX * 0.707, velocityY * 0.707)
    }
  }

  updateChicken(chicken, delta) {
    // Simple wandering AI
    chicken.wanderTimer -= delta
    
    if (chicken.wanderTimer <= 0) {
      // Pick new wander target
      chicken.targetX = chicken.x + Phaser.Math.Between(-100, 100)
      chicken.targetY = chicken.y + Phaser.Math.Between(-100, 100)
      chicken.wanderTimer = Phaser.Math.Between(2000, 5000) // 2-5 seconds
    }
    
    // Move towards target
    const distance = Phaser.Math.Distance.Between(
      chicken.x, chicken.y, 
      chicken.targetX, chicken.targetY
    )
    
    if (distance > 5) {
      const angle = Phaser.Math.Angle.Between(
        chicken.x, chicken.y,
        chicken.targetX, chicken.targetY
      )
      
      const speed = 50
      chicken.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      )
    } else {
      chicken.setVelocity(0, 0)
    }
  }

  updateCamera() {
    // Additional camera logic if needed
  }

  // Event handlers
  onChickenClicked(chicken) {
    console.log('Chicken clicked:', chicken.tier)
    
    this.selectedChicken = chicken
    
    // Dispatch event to React
    window.dispatchEvent(new CustomEvent('paco-game-event', {
      detail: {
        type: 'chicken-clicked',
        data: {
          tier: chicken.tier,
          isStaked: chicken.isStaked,
          yieldRate: chicken.yieldRate
        }
      }
    }))
    
    // Visual feedback
    this.tweens.add({
      targets: chicken,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 100,
      yoyo: true
    })
  }

  onCoopClicked(coop) {
    console.log('Coop clicked')
    
    // Switch to coop management scene
    this.scene.launch('CoopScene')
  }

  movePlayerTo(x, y) {
    // Smooth movement to clicked position
    this.tweens.add({
      targets: this.player,
      x: x,
      y: y,
      duration: 1000,
      ease: 'Power2'
    })
  }

  getChickenYieldRate(tier) {
    const rates = {
      common: 10,
      uncommon: 25,
      rare: 50,
      legendary: 100
    }
    return rates[tier] || 10
  }

  startBackgroundMusic() {
    // if (this.sound.get('background-music')) {
    //   this.backgroundMusic = this.sound.add('background-music', { loop: true, volume: 0.3 })
    //   this.backgroundMusic.play()
    // }
  }

  // Public methods for React communication
  collectYield() {
    const totalYield = this.chickens.children.entries
      .filter(chicken => chicken.isStaked)
      .reduce((sum, chicken) => sum + chicken.yieldRate, 0)
    
    console.log('Collecting yield:', totalYield)
    
    window.dispatchEvent(new CustomEvent('paco-game-event', {
      detail: {
        type: 'yield-collected',
        data: { amount: totalYield }
      }
    }))
  }
}