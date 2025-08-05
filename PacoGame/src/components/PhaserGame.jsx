import React, { useEffect, useRef } from 'react'

export default function PhaserGame() {
  const gameRef = useRef(null)

  useEffect(() => {
    // For now, we'll show a placeholder canvas
    // The full Phaser integration will be added later
    
    if (gameRef.current) {
      // Create a simple canvas placeholder
      const canvas = document.createElement('canvas')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvas.style.background = 'linear-gradient(45deg, #2d5a3d 0%, #1a4a2e 50%, #0f3024 100%)'
      
      // Clear existing content
      gameRef.current.innerHTML = ''
      gameRef.current.appendChild(canvas)
      
      // Draw simple placeholder content
      const ctx = canvas.getContext('2d')
      
      // Draw grass background pattern
      ctx.fillStyle = '#2d5a3d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw grid pattern
      ctx.strokeStyle = '#1a4a2e'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 64) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      
      // Draw placeholder chicken
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw chicken face
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(canvas.width / 2 - 10, canvas.height / 2 - 10, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(canvas.width / 2 + 10, canvas.height / 2 - 10, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw beak
      ctx.fillStyle = '#FF8C00'
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, canvas.height / 2)
      ctx.lineTo(canvas.width / 2 - 5, canvas.height / 2 + 5)
      ctx.lineTo(canvas.width / 2 + 5, canvas.height / 2 + 5)
      ctx.fill()
      
      // Draw text
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('🐔 PACO\'S FARM 🐔', canvas.width / 2, 100)
      
      ctx.fillStyle = '#FFF'
      ctx.font = '16px monospace'
      ctx.fillText('Phaser.js game engine loading...', canvas.width / 2, canvas.height - 100)
      ctx.fillText('Click the chicken to collect PACO!', canvas.width / 2, canvas.height - 70)
      
      // Add click handler for chicken
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        const chickenX = canvas.width / 2
        const chickenY = canvas.height / 2
        
        const distance = Math.sqrt((x - chickenX) ** 2 + (y - chickenY) ** 2)
        
        if (distance < 40) {
          // Dispatch event to React
          window.dispatchEvent(new CustomEvent('paco-game-event', {
            detail: {
              type: 'chicken-clicked',
              data: { pacoEarned: 10 }
            }
          }))
          
          // Visual feedback
          ctx.fillStyle = '#FF4500'
          ctx.beginPath()
          ctx.arc(chickenX, chickenY, 35, 0, Math.PI * 2)
          ctx.fill()
          
          setTimeout(() => {
            ctx.fillStyle = '#FFD700'
            ctx.beginPath()
            ctx.arc(chickenX, chickenY, 30, 0, Math.PI * 2)
            ctx.fill()
          }, 200)
        }
      })
      
      // Handle window resize
      const handleResize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        // Redraw everything
      }
      
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  // Listen for game events
  useEffect(() => {
    const handleGameEvent = (event) => {
      const { type, data } = event.detail
      
      switch (type) {
        case 'chicken-clicked':
          console.log('🐔 Chicken clicked! Earned:', data.pacoEarned, 'PACO')
          break
        default:
          console.log('Game event:', type, data)
      }
    }
    
    window.addEventListener('paco-game-event', handleGameEvent)
    
    return () => {
      window.removeEventListener('paco-game-event', handleGameEvent)
    }
  }, [])

  return (
    <div 
      ref={gameRef} 
      className="w-full h-full pixel-perfect no-select no-drag"
      style={{ 
        imageRendering: 'pixelated'
      }}
    />
  )
}