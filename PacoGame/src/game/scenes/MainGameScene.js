import Phaser from 'phaser'

export default class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainGameScene' })
    this.clickedChickens = 0
    this.pacoBalance = 0
  }

  preload() {
    // Load real Paco assets!
    this.load.image('chicken', '/PACO-THE-CHICKEN.png')
    this.load.image('background', '/bg.png') 
    this.load.image('corn', '/corn.png')
    this.load.image('paco-pfp', '/PACO-pfp.png')
    
    // Load walking animation if available
    try {
      this.load.image('walk', '/walk.gif')
    } catch (e) {
      console.log('Walk gif not loaded, using static image')
    }
  }

  create() {
    // Create background
    const bg = this.add.image(400, 300, 'background')
    bg.setDisplaySize(800, 600)
    bg.setAlpha(0.3) // Make it subtle so UI is visible

    // Add Paco branding
    const pacoLogo = this.add.image(400, 80, 'paco-pfp')
    pacoLogo.setScale(0.3)
    pacoLogo.setAlpha(0.8)

    // Create main Paco chicken (clickable)
    this.chicken = this.add.image(400, 350, 'chicken')
    this.chicken.setScale(0.6)
    this.chicken.setInteractive({ cursor: 'pointer' })
    
    // Add hover effects
    this.chicken.on('pointerover', () => {
      this.chicken.setScale(0.65)
      this.chicken.setTint(0xFFD700) // Golden tint
    })
    
    this.chicken.on('pointerout', () => {
      this.chicken.setScale(0.6)
      this.chicken.clearTint()
    })

    // Click handler for PACO earning
    this.chicken.on('pointerdown', () => {
      this.clickedChickens++
      this.pacoBalance += 10

      // Create floating "+10 PACO" text
      const earnText = this.add.text(
        this.chicken.x + Phaser.Math.Between(-50, 50), 
        this.chicken.y - 50, 
        '+10 PACO!', 
        {
          fontSize: '18px',
          fontFamily: 'monospace',
          fill: '#FFD700',
          stroke: '#000000',
          strokeThickness: 2
        }
      )

      // Animate the text
      this.tweens.add({
        targets: earnText,
        y: earnText.y - 100,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => earnText.destroy()
      })

      // Chicken bounce animation
      this.tweens.add({
        targets: this.chicken,
        scaleX: 0.7,
        scaleY: 0.5,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      })

      // Emit event to React for state updates
      this.game.events.emit('chickenClick', {
        pacoEarned: 10,
        totalClicks: this.clickedChickens,
        totalBalance: this.pacoBalance
      })

      console.log(`🐔 Paco clicked! Total PACO: ${this.pacoBalance}`)
    })

    // Add some corn scattered around for ambiance
    for (let i = 0; i < 5; i++) {
      const corn = this.add.image(
        Phaser.Math.Between(100, 700),
        Phaser.Math.Between(200, 500),
        'corn'
      )
      corn.setScale(0.3)
      corn.setAlpha(0.6)
      
      // Subtle floating animation
      this.tweens.add({
        targets: corn,
        y: corn.y - 10,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    // Add farm title
    const title = this.add.text(400, 150, "🚜 Paco's Farm 🌾", {
      fontSize: '32px',
      fontFamily: 'monospace',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3
    })
    title.setOrigin(0.5)

    // Add instructions
    const instructions = this.add.text(400, 500, 'Click Paco to earn PACO tokens! 🐔💰', {
      fontSize: '16px',
      fontFamily: 'monospace',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    })
    instructions.setOrigin(0.5)

    console.log('🎮 MainGameScene created with real Paco assets!')
  }

  update() {
    // Add subtle chicken idle animation
    if (this.chicken && this.time.now % 3000 < 50) {
      this.tweens.add({
        targets: this.chicken,
        angle: -2,
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      })
    }
  }
}