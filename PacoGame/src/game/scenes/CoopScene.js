import Phaser from 'phaser'

export default class CoopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CoopScene' })
  }

  preload() {
    // Load Paco assets for coop management
    this.load.image('chicken', '/PACO-THE-CHICKEN.png')
    this.load.image('background', '/bg.png')
    this.load.image('corn', '/corn.png')
  }

  create() {
    // Background
    const bg = this.add.image(400, 300, 'background')
    bg.setDisplaySize(800, 600)
    bg.setAlpha(0.2)

    // Title
    const title = this.add.text(400, 50, '🏠 Chicken Coop Management 🐔', {
      fontSize: '28px',
      fontFamily: 'monospace',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3
    })
    title.setOrigin(0.5)

    // Placeholder for coop management UI
    const placeholder = this.add.text(400, 300, 'Coop Management\nComing Soon!', {
      fontSize: '24px',
      fontFamily: 'monospace',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    })
    placeholder.setOrigin(0.5)

    // Back button
    const backButton = this.add.text(100, 550, '← Back to Farm', {
      fontSize: '16px',
      fontFamily: 'monospace',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    })
    backButton.setInteractive({ cursor: 'pointer' })
    backButton.on('pointerdown', () => {
      this.scene.start('MainGameScene')
    })

    console.log('🏠 CoopScene created!')
  }
}