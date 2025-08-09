/**
 * Production-Ready Connect Button
 * 
 * Exposes RainbowKit's ConnectButton for use throughout the app
 * Includes network status and automatic chain switching feedback
 */

import React from 'react'
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useAbstractChain } from './WalletProviders'

interface ConnectButtonProps {
  showBalance?: boolean
  chainStatus?: 'full' | 'icon' | 'name' | 'none'
  accountStatus?: 'full' | 'avatar' | 'address' | 'none'
  label?: string
}

/**
 * Simple ConnectButton Export
 * 
 * Use this component anywhere you need wallet connection
 */
export function ConnectButton({
  showBalance = true,
  chainStatus = 'full',
  accountStatus = 'full',
  label = 'Connect Wallet',
}: ConnectButtonProps) {
  return (
    <RainbowConnectButton
      showBalance={showBalance}
      chainStatus={chainStatus}
      accountStatus={accountStatus}
      label={label}
    />
  )
}

/**
 * Custom Connect Button with Abstract L2 Status
 * 
 * Shows additional feedback about Abstract L2 connection
 */
export function CustomConnectButton({ className = '' }: { className?: string }) {
  const { isAbstract, targetChain } = useAbstractChain()

  return (
    <div className={`space-y-2 ${className}`}>
      <RainbowConnectButton.Custom>
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
            <div>
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="bg-paco-yellow text-gray-900 hover:bg-yellow-400 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Connect Wallet
                    </button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="bg-red-600 text-white hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Wrong Network
                    </button>
                  )
                }

                return (
                  <div className="flex items-center space-x-3">
                    {chain && (
                      <button
                        onClick={openChainModal}
                        type="button"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isAbstract
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {chain.hasIcon && (
                          <div className="w-4 h-4 mr-2 inline-block">
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </button>
                    )}

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </RainbowConnectButton.Custom>

      {/* Network status feedback */}
      {!isAbstract && (
        <p className="text-sm text-orange-400 text-center">
          Will auto-switch to {targetChain.name} after connection
        </p>
      )}
    </div>
  )
}

// Export the standard RainbowKit ConnectButton as well
export { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'

// Default export
export default ConnectButton
