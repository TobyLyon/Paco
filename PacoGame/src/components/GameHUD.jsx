import React from 'react'
import { motion } from 'framer-motion'
import { Coins, Settings, Bird } from 'lucide-react'

export default function GameHUD({ gameState = {} }) {
  const {
    pacoBalance = 0,
    unclaimedYield = 0,
    stakedChickens = 0,
    totalYieldRate = 0
  } = gameState

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
                  {Math.floor(pacoBalance)}
                </div>
                <div className="text-xs text-gray-400">PACO</div>
              </div>
            </motion.div>

            {/* Unclaimed Yield */}
            {unclaimedYield > 0 && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="game-panel flex items-center space-x-2 bg-green-800 border-green-600"
              >
                <Coins className="text-green-400" size={16} />
                <div>
                  <div className="text-green-400 font-bold">
                    +{Math.floor(unclaimedYield)}
                  </div>
                  <div className="text-xs text-gray-400">Unclaimed</div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Side - Settings */}
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="pixel-button p-2"
            >
              <Settings size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Quick Stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="flex justify-center">
          <div className="game-panel flex space-x-6">
            <div className="flex items-center space-x-2">
              <Bird className="text-blue-400" size={16} />
              <div>
                <div className="font-bold text-blue-400">{stakedChickens}</div>
                <div className="text-xs text-gray-400">Staked</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Coins className="text-green-400" size={16} />
              <div>
                <div className="font-bold text-green-400">{totalYieldRate}/hr</div>
                <div className="text-xs text-gray-400">Yield</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Message */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-gray-900 bg-opacity-80 p-6 rounded-lg border border-paco-yellow"
        >
          <h2 className="text-2xl font-bold text-paco-yellow mb-2">
            🐔 Welcome to Paco's Farm! 🐔
          </h2>
          <p className="text-gray-300 mb-4">
            Your secret alpha farming game is ready!
          </p>
          <div className="text-sm text-gray-400">
            <p>• Connect wallet ✅</p>
            <p>• NFT verification ✅</p>
            <p>• Game engine loading... 🎮</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}