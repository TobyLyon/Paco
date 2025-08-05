import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import { Shield, Chicken, Crown, Zap } from 'lucide-react'

export default function WalletGate({ hasAccess, loading }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-paco-yellow via-paco-orange to-paco-red">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-gray-900 bg-opacity-90 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-paco-yellow shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-24 h-24 mx-auto mb-4 bg-paco-yellow rounded-full flex items-center justify-center"
          >
            <Chicken size={48} className="text-gray-900" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Paco's Farm
          </h1>
          <p className="text-paco-yellow text-sm">
            Secret Alpha • NFT Holders Only
          </p>
        </div>

        {/* Connection Status */}
        <div className="space-y-6">
          {loading ? (
            <LoadingState />
          ) : hasAccess === false ? (
            <NoAccessState />
          ) : (
            <ConnectState />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Built on Abstract L2 • Powered by PACO</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Shield size={12} />
            <Zap size={12} />
            <Crown size={12} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ConnectState() {
  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-2 text-paco-yellow mb-4">
        <Shield size={20} />
        <span className="font-semibold">Connect Your Wallet</span>
      </div>
      
      <p className="text-gray-300 text-sm mb-6">
        Connect your wallet to check for Chicken or Coyote NFTs and enter the farm!
      </p>
      
      <div className="flex justify-center">
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated')

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openConnectModal}
                        className="pixel-button text-lg px-8 py-3 rounded-lg"
                      >
                        Connect Wallet
                      </motion.button>
                    )
                  }

                  return (
                    <div className="text-center">
                      <div className="text-green-400 mb-2">✅ Wallet Connected</div>
                      <p className="text-xs text-gray-400">Checking NFT ownership...</p>
                    </div>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 mx-auto border-4 border-paco-yellow border-t-transparent rounded-full"
      />
      <p className="text-paco-yellow font-semibold">Checking your NFTs...</p>
      <p className="text-gray-400 text-sm">
        Verifying Chicken Coop, Chicken, or Coyote ownership
      </p>
    </div>
  )
}

function NoAccessState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center space-y-4"
    >
      <div className="w-16 h-16 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
        <Shield size={32} className="text-white" />
      </div>
      
      <h3 className="text-xl font-bold text-red-400">Access Denied</h3>
      
      <div className="bg-red-900 bg-opacity-50 rounded-lg p-4 text-sm">
        <p className="text-red-200 mb-3">
          You need one of these NFTs to enter Paco's Farm:
        </p>
        <ul className="text-left space-y-1 text-red-300">
          <li>🏠 Chicken Coop NFT (required for farming)</li>
          <li>🐔 Chicken NFT (for staking & earning)</li>
          <li>🐺 Coyote NFT (for raiding other farms)</li>
        </ul>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.open('https://opensea.io', '_blank')}
        className="pixel-button bg-paco-red border-red-400 hover:bg-red-500"
      >
        Get NFTs on OpenSea
      </motion.button>
      
      <p className="text-xs text-gray-500 mt-4">
        Join our Discord for updates and NFT drops!
      </p>
    </motion.div>
  )
}