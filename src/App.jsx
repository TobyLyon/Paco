import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Components
import WalletGate from './components/WalletGate'
import GameHUD from './components/GameHUD'
import PhaserGame from './components/PhaserGame'
import LoadingScreen from './components/LoadingScreen'

// Hooks
import useWallet from './hooks/useWallet'
import useNFTOwnership from './hooks/useNFTOwnership'
import useGameState from './hooks/useGameState'

function App() {
  const [isGameReady, setIsGameReady] = useState(false)
  const [showGame, setShowGame] = useState(false)
  
  const { isConnected, address } = useWallet()
  const { hasAccess, isLoading: nftLoading } = useNFTOwnership(address)
  const { gameState, initializeGame } = useGameState()

  // Initialize game when wallet connects and has access
  useEffect(() => {
    if (isConnected && hasAccess && !isGameReady) {
      initializeGame(address)
      setIsGameReady(true)
    }
  }, [isConnected, hasAccess, address, isGameReady, initializeGame])

  // Show game after brief delay for dramatic effect
  useEffect(() => {
    if (isGameReady) {
      const timer = setTimeout(() => setShowGame(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [isGameReady])

  return (
    <Router>
      <div className="w-full h-screen bg-gray-900 overflow-hidden">
        <Routes>
          <Route path="/" element={
            <GameContainer 
              isConnected={isConnected}
              hasAccess={hasAccess}
              nftLoading={nftLoading}
              showGame={showGame}
              gameState={gameState}
            />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />  
        </Routes>
        
        {/* Global Toast Notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #FFD700',
              fontFamily: 'monospace',
            },
          }}
        />
      </div>
    </Router>
  )
}

// Main game container component
function GameContainer({ isConnected, hasAccess, nftLoading, showGame, gameState }) {
  // Show wallet gate if not connected or no access
  if (!isConnected || (!hasAccess && !nftLoading)) {
    return <WalletGate hasAccess={hasAccess} loading={nftLoading} />
  }

  // Show loading while checking NFTs
  if (nftLoading) {
    return <LoadingScreen message="Checking your chicken coop..." />
  }

  // Show loading until game is ready
  if (!showGame) {
    return <LoadingScreen message="Preparing your farm..." />
  }

  // Main game interface
  return (
    <div className="relative w-full h-full">
      {/* Game HUD - overlays on top of Phaser canvas */}
      <GameHUD gameState={gameState} />
      
      {/* Phaser Game Canvas */}
      <PhaserGame />
      
      {/* Development Debug Panel (only in dev) */}
      {import.meta.env.DEV && (
        <div className="absolute top-4 right-4 bg-red-900 p-2 rounded text-xs opacity-50">
          <div>DEBUG MODE</div>
          <div>Connected: {isConnected ? '✅' : '❌'}</div>
          <div>Access: {hasAccess ? '✅' : '❌'}</div>
          <div>Game Ready: {showGame ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  )
}

export default App