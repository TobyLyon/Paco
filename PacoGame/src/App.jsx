import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">🐔 Oops! Something went wrong</h1>
            <p className="text-gray-300 mb-4">The farm encountered an error. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-paco-yellow text-black font-bold rounded hover:bg-paco-orange"
            >
              Refresh Farm
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

// Main game container component
function GameContainer({ isConnected, hasAccess, nftLoading, showGame, gameState }) {
  // Show wallet gate if not connected (NFT gating removed for development)
  if (!isConnected) {
    return <WalletGate hasAccess={true} loading={false} />
  }

  // Show loading while farm loads
  if (nftLoading) {
    return <LoadingScreen message="Loading your chickens and coops..." />
  }

  // Show loading until game is ready
  if (!showGame) {
    return <LoadingScreen message="Preparing Paco's Farm..." />
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