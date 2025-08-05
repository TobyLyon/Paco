import Phaser from 'phaser'

export default class CoopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CoopScene' })
    
    this.stakedChickens = []
    this.availableChickens = []
    this.selectedChicken = null
  }

  create() {
    // Create coop management UI
    this.createCoopInterface()
    this.loadChickenData()
    this.createControls()
    
    console.log('🏠 Coop management scene loaded')
  }

  createCoopInterface() {
    // Background
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x1a1a1a,
      0.9
    )

    // Title
    this.add.text(
      this.scale.width / 2,
      50,
      "Chicken Coop Management",
      {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: '#FFD700',
        align: 'center'
      }
    ).setOrigin(0.5)

    // Close button
    const closeBtn = this.add.text(
      this.scale.width - 50,
      50,
      '×',
      {
        fontSize: '40px',
        fontFamily: 'monospace',
        color: '#ff4444',
        align: 'center'
      }
    ).setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.closeCoopScene())

    // Sections
    this.createStakedSection()
    this.createAvailableSection()
    this.createStatsSection()
  }

  createStakedSection() {
    const startY = 120
    
    // Section title
    this.add.text(100, startY, 'Staked Chickens (Earning PACO)', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00FF00'
    })

    // Staked chickens container
    this.stakedContainer = this.add.container(100, startY + 40)
    
    // Placeholder for staked chickens grid
    this.stakedGrid = this.add.grid(
      0, 0,
      600, 200,
      50, 50,
      0x333333,
      0.5,
      0x666666,
      1
    ).setOrigin(0)
    
    this.stakedContainer.add(this.stakedGrid)
  }

  createAvailableSection() {
    const startY = 380
    
    // Section title
    this.add.text(100, startY, 'Available Chickens', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FFAA00'
    })

    // Available chickens container
    this.availableContainer = this.add.container(100, startY + 40)
    
    // Placeholder for available chickens grid
    this.availableGrid = this.add.grid(
      0, 0,
      600, 200,
      50, 50,
      0x222222,
      0.5,
      0x444444,
      1
    ).setOrigin(0)
    
    this.availableContainer.add(this.availableGrid)
  }

  createStatsSection() {
    const startX = this.scale.width - 300
    const startY = 120
    
    // Stats panel background
    const statsPanel = this.add.rectangle(
      startX + 150, startY + 200,
      280, 400,
      0x2a2a2a,
      0.8
    )
    statsPanel.setStrokeStyle(2, 0xFFD700)

    // Stats title
    this.add.text(startX + 10, startY, 'Farm Statistics', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FFD700'
    })

    // Create stat displays
    this.totalYieldText = this.add.text(startX + 10, startY + 50, 'Total Yield: 0 PACO/hr', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    })

    this.stakedCountText = this.add.text(startX + 10, startY + 80, 'Staked Chickens: 0', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    })

    this.availableCountText = this.add.text(startX + 10, startY + 110, 'Available Chickens: 0', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    })

    // Action buttons
    this.createActionButtons(startX, startY + 200)
  }

  createActionButtons(x, y) {
    // Stake All button
    const stakeAllBtn = this.add.rectangle(x + 140, y, 120, 40, 0x00AA00)
      .setStrokeStyle(2, 0x00FF00)
      .setInteractive()
      .on('pointerdown', () => this.stakeAllChickens())
      .on('pointerover', () => stakeAllBtn.setFillStyle(0x00CC00))
      .on('pointerout', () => stakeAllBtn.setFillStyle(0x00AA00))

    this.add.text(x + 140, y, 'Stake All', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    }).setOrigin(0.5)

    // Unstake All button
    const unstakeAllBtn = this.add.rectangle(x + 140, y + 50, 120, 40, 0xAA0000)
      .setStrokeStyle(2, 0xFF0000)
      .setInteractive()
      .on('pointerdown', () => this.unstakeAllChickens())
      .on('pointerover', () => unstakeAllBtn.setFillStyle(0xCC0000))
      .on('pointerout', () => unstakeAllBtn.setFillStyle(0xAA0000))

    this.add.text(x + 140, y + 50, 'Unstake All', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    }).setOrigin(0.5)

    // Collect Yield button
    const collectBtn = this.add.rectangle(x + 140, y + 100, 120, 40, 0xFFAA00)
      .setStrokeStyle(2, 0xFFD700)
      .setInteractive()
      .on('pointerdown', () => this.collectYield())
      .on('pointerover', () => collectBtn.setFillStyle(0xFFCC00))
      .on('pointerout', () => collectBtn.setFillStyle(0xFFAA00))

    this.add.text(x + 140, y + 100, 'Collect Yield', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#000000'
    }).setOrigin(0.5)
  }

  createControls() {
    // ESC key to close
    this.input.keyboard.on('keydown-ESC', () => {
      this.closeCoopScene()
    })
  }

  loadChickenData() {
    // Get chicken data from main game scene
    const mainScene = this.scene.get('MainGameScene')
    if (mainScene && mainScene.chickens) {
      this.refreshChickenDisplay()
    }
  }

  refreshChickenDisplay() {
    // Clear existing displays
    this.clearChickenDisplays()
    
    // Get updated chicken data
    const mainScene = this.scene.get('MainGameScene')
    if (!mainScene || !mainScene.chickens) return

    const allChickens = mainScene.chickens.children.entries
    this.stakedChickens = allChickens.filter(chicken => chicken.isStaked)
    this.availableChickens = allChickens.filter(chicken => !chicken.isStaked)

    // Display staked chickens
    this.displayChickens(this.stakedChickens, this.stakedContainer, true)
    
    // Display available chickens
    this.displayChickens(this.availableChickens, this.availableContainer, false)
    
    // Update stats
    this.updateStats()
  }

  displayChickens(chickens, container, isStaked) {
    const startX = 25
    const startY = 25
    const spacing = 60
    const columns = 10

    chickens.forEach((chicken, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = startX + col * spacing
      const y = startY + row * spacing

      this.createChickenCard(chicken, x, y, container, isStaked)
    })
  }

  createChickenCard(chicken, x, y, container, isStaked) {
    // Card background
    const tierColors = {
      common: 0x888888,
      uncommon: 0x00AA00,
      rare: 0x0066FF,
      legendary: 0xAA00AA
    }

    const card = this.add.rectangle(x, y, 50, 50, tierColors[chicken.tier] || 0x888888)
      .setStrokeStyle(2, isStaked ? 0x00FF00 : 0xFFAA00)
      .setInteractive()
      .on('pointerdown', () => this.onChickenCardClicked(chicken))

    // Chicken sprite (placeholder)
    const sprite = this.add.text(x, y - 10, '🐔', {
      fontSize: '20px'
    }).setOrigin(0.5)

    // Yield rate
    const yieldText = this.add.text(x, y + 15, `${chicken.yieldRate}/hr`, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#FFFFFF'
    }).setOrigin(0.5)

    container.add([card, sprite, yieldText])
  }

  clearChickenDisplays() {
    // Clear containers
    this.stakedContainer.removeAll(true)
    this.availableContainer.removeAll(true)

    // Re-add grids
    this.stakedGrid = this.add.grid(0, 0, 600, 200, 50, 50, 0x333333, 0.5, 0x666666, 1).setOrigin(0)
    this.availableGrid = this.add.grid(0, 0, 600, 200, 50, 50, 0x222222, 0.5, 0x444444, 1).setOrigin(0)
    
    this.stakedContainer.add(this.stakedGrid)
    this.availableContainer.add(this.availableGrid)
  }

  updateStats() {
    const totalYield = this.stakedChickens.reduce((sum, chicken) => sum + chicken.yieldRate, 0)
    
    this.totalYieldText.setText(`Total Yield: ${totalYield} PACO/hr`)
    this.stakedCountText.setText(`Staked Chickens: ${this.stakedChickens.length}`)
    this.availableCountText.setText(`Available Chickens: ${this.availableChickens.length}`)
  }

  // Event handlers
  onChickenCardClicked(chicken) {
    console.log('Chicken card clicked:', chicken.tier, 'Staked:', chicken.isStaked)
    
    if (chicken.isStaked) {
      this.unstakeChicken(chicken)
    } else {
      this.stakeChicken(chicken)
    }
  }

  stakeChicken(chicken) {
    chicken.isStaked = true
    this.refreshChickenDisplay()
    
    // Play sound effect
    this.playSound('stake')
  }

  unstakeChicken(chicken) {
    chicken.isStaked = false
    this.refreshChickenDisplay()
    
    // Check for coyote raid risk
    this.checkRaidRisk()
    
    // Play sound effect
    this.playSound('unstake')
  }

  stakeAllChickens() {
    this.availableChickens.forEach(chicken => {
      chicken.isStaked = true
    })
    this.refreshChickenDisplay()
  }

  unstakeAllChickens() {
    this.stakedChickens.forEach(chicken => {
      chicken.isStaked = false
    })
    this.refreshChickenDisplay()
    this.checkRaidRisk()
  }

  collectYield() {
    const mainScene = this.scene.get('MainGameScene')
    if (mainScene) {
      mainScene.collectYield()
    }
    
    this.checkRaidRisk()
  }

  checkRaidRisk() {
    // Simulate coyote raid risk
    const raidChance = 0.1 // 10% chance
    
    if (Math.random() < raidChance) {
      this.triggerCoyoteRaid()
    }
  }

  triggerCoyoteRaid() {
    console.log('🐺 Coyote raid triggered!')
    
    // Create raid notification
    const raidText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      '🐺 COYOTE RAID! 🐺\nSome PACO was stolen!',
      {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: '#FF0000',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5)

    // Animate and remove notification
    this.tweens.add({
      targets: raidText,
      alpha: 0,
      duration: 3000,
      onComplete: () => raidText.destroy()
    })

    // Dispatch event to React
    window.dispatchEvent(new CustomEvent('paco-game-event', {
      detail: {
        type: 'raid-started',
        data: { stolenAmount: 50 }
      }
    }))
  }

  playSound(soundKey) {
    // Play sound effects
    // if (this.sound.get(soundKey)) {
    //   this.sound.play(soundKey, { volume: 0.5 })
    // }
  }

  closeCoopScene() {
    this.scene.stop()
  }
}