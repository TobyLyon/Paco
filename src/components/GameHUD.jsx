import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, 
  Settings, 
  Menu, 
  X,
  Chicken,
  Shield,
  Zap,
  Crown,
  Timer
} from 'lucide-react'

export default function GameHUD({ gameState }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showInventory, setShowInventory] = useState(false)

  const {
    pacoBalance = 0,
    stakedChickens = 0,
    ownedCoyotes = 0,
    yieldPerHour = 0,
    lastRaidTime = null
  } = gameState || {}

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="flex justify-between items-center">
          {/* Left Side - Resources */}
          <div className="flex space-x-4">
            {/* PACO Balance */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="game-panel flex items-center space-x-2 min-w-[120px]"
            >
              <Coins className="text-paco-yellow" size={20} />
              <div>
                <div className="text-paco-yellow font-bold text-lg">
                  {formatNumber(pacoBalance)}
                </div>
                <div className="text-xs text-gray-400">PACO</div>
              </div>
            </motion.div>

            {/* Yield Rate */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="game-panel flex items-center space-x-2"
            >
              <Zap className="text-green-400" size={16} />
              <div>
                <div className="text-green-400 font-bold">
                  {formatNumber(yieldPerHour)}/hr
                </div>
                <div className="text-xs text-gray-400">Yield</div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Menu & Settings */}
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowInventory(!showInventory)}
              className="pixel-button p-2"
            >
              <Chicken size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMenu(!showMenu)}
              className="pixel-button p-2"
            >
              {showMenu ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Quick Stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="flex justify-center">
          <div className="game-panel flex space-x-6">
            <StatItem 
              icon={<Chicken size={16} />}
              value={stakedChickens}
              label="Staked"
              color="text-blue-400"
            />
            <StatItem 
              icon={<Shield size={16} />}
              value={ownedCoyotes}
              label="Coyotes"
              color="text-red-400"
            />
            <StatItem 
              icon={<Timer size={16} />}
              value={lastRaidTime ? timeAgo(lastRaidTime) : 'Never'}
              label="Last Raid"
              color="text-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-0 right-0 h-full w-80 bg-gray-900 bg-opacity-95 backdrop-blur-lg border-l-2 border-paco-yellow p-6 pointer-events-auto"
          >
            <GameMenu onClose={() => setShowMenu(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inventory Panel */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-gray-900 bg-opacity-95 backdrop-blur-lg border-t-2 border-paco-yellow p-6 pointer-events-auto"
          >
            <NFTInventory 
              gameState={gameState} 
              onClose={() => setShowInventory(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Area */}
      <div className="absolute top-20 right-4 space-y-2 pointer-events-auto">
        {/* Raid notifications, yield notifications, etc. will appear here */}
      </div>
    </div>
  )
}

function StatItem({ icon, value, label, color = "text-white" }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={color}>{icon}</div>
      <div>
        <div className={`font-bold ${color}`}>{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  )
}

function GameMenu({ onClose }) {
  return (
    <div className="h-full flexflex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-paco-yellow">Game Menu</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <MenuButton icon={<Settings />} text="Settings" />
        <MenuButton icon={<Crown />} text="Leaderboard" />
        <MenuButton icon={<Shield />} text="How to Play" />
        <MenuButton icon={<Coins />} text="Tokenomics" />
        
        <div className="border-t border-gray-700 pt-4 mt-6">
          <div className="text-sm text-gray-400 mb-2">Links</div>
          <MenuButton 
            text="Discord" 
            onClick={() => window.open('https://discord.gg/paco', '_blank')}
          />
          <MenuButton 
            text="Twitter" 
            onClick={() => window.open('https://twitter.com/pacothechicken', '_blank')}
          />
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Paco's Farm Alpha v0.1.0
      </div>
    </div>
  )
}

function MenuButton({ icon, text, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
    >
      {icon && <div className="text-paco-yellow">{icon}</div>}
      <span className="text-white">{text}</span>
    </motion.button>
  )
}

function NFTInventory({ gameState, onClose }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-paco-yellow">Your NFTs</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-4">
          {/* Placeholder NFT cards - will be replaced with real data */}
          <NFTCard 
            type="chicken" 
            tier="common"
            staked={true}
            yield={10}
          />
          <NFTCard 
            type="chicken" 
            tier="rare"
            staked={false}
            yield={25}
          />
          <NFTCard 
            type="coyote" 
            tier="uncommon"
            raidCooldown={3600}
          />
        </div>
      </div>
    </div>
  )
}

function NFTCard({ type, tier, staked, yield, raidCooldown }) {
  const colors = {
    common: 'border-gray-500',
    uncommon: 'border-green-500',
    rare: 'border-blue-500',
    legendary: 'border-purple-500'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`nft-card ${colors[tier]} relative`}
    >
      {/* NFT Image Placeholder */}
      <div className="w-full h-24 bg-gray-600 rounded mb-2 flex items-center justify-center text-2xl">
        {type === 'chicken' ? '🐔' : '🐺'}
      </div>
      
      <div className="text-center">
        <div className="font-bold capitalize text-sm">{tier} {type}</div>
        
        {yield && (
          <div className="text-xs text-green-400">
            {yield} PACO/hr
          </div>
        )}
        
        {staked && (
          <div className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full" />
        )}
        
        {raidCooldown && (
          <div className="text-xs text-red-400">
            Cooldown: {Math.floor(raidCooldown / 60)}m
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}