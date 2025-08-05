import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// Import game scenes
import MainGameScene from '../game/scenes/MainGameScene'
import CoopScene from '../game/scenes/CoopScene'

export default function PhaserGame() {
  const gameRef = useRef(null)
  const phaserGameRef = useRef(null)

  useEffect(() => {
    // Phaser game configuration
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      backgroundColor: '#2d5a3d', // Forest green background
      pixelArt: true, // Enable pixel perfect rendering
      antialias: false,
      roundPixels: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 }, // Top-down game, no gravity
          debug: import.meta.env.DEV // Show physics debug in development
        }
      },
      scene: [MainGameScene, CoopScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
      },
      input: {
        keyboard: true,
        mouse: true,
        touch: true
      },
      render: {
        pixelArt: true,
        antialias: false,
        mipmapFilter: 'LINEAR', // Better for scaled pixel art
        roundPixels: true
      }
    }

    // Create the game instance
    phaserGameRef.current = new Phaser.Game(config)

    // Handle window resize
    const handleResize = () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.scale.resize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    // Global game events for React communication
    setupGameEvents()

    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [])

  return (
    <div 
      ref={gameRef} 
      className="w-full h-full pixel-perfect no-select no-drag"
      style={{ 
        imageRendering: 'pixelated',
        imageRendering: '-moz-crisp-edges',
        imageRendering: 'crisp-edges'
      }}
    />
  )
}

// Setup event listeners for React <-> Phaser communication
function setupGameEvents() {
  // Listen for game events and dispatch to React
  window.addEventListener('paco-game-event', (event) => {
    const { type, data } = event.detail
    
    switch (type) {
      case 'chicken-clicked':
        console.log('Chicken clicked:', data)
        // Could trigger React state updates or modals
        break
        
      case 'yield-collected':
        console.log('Yield collected:', data)
        // Update React state for PACO balance
        break
        
      case 'raid-started':
        console.log('Raid started:', data)
        // Show raid notification in React
        break
        
      default:
        console.log('Unknown game event:', type, data)
    }
  })
}

// Utility function to send events to Phaser from React
export function sendToPhaserGame(eventType, data) {
  if (window.phaserGame) {
    window.phaserGame.events.emit(eventType, data)
  }
}