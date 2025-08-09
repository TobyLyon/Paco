/**
 * 🎰 Crash Casino Frame Component
 * 
 * Embeds the crash casino and provides wallet state communication
 */

import React, { useEffect, useRef } from 'react'
import useWallet from '../hooks/useWallet'

interface CrashCasinoFrameProps {
  src: string
  className?: string
}

export default function CrashCasinoFrame({ src, className = '' }: CrashCasinoFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { isConnected, address, chainId, isAbstract } = useWallet()

  // Send wallet state to iframe when it changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const walletState = {
        isConnected,
        address,
        chainId,
        isAbstract
      }

      iframeRef.current.contentWindow.postMessage({
        type: 'WALLET_STATE_UPDATE',
        payload: walletState
      }, '*')
    }
  }, [isConnected, address, chainId, isAbstract])

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REQUEST_WALLET_STATE') {
        // Send current wallet state
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const walletState = {
            isConnected,
            address,
            chainId,
            isAbstract
          }

          iframeRef.current.contentWindow.postMessage({
            type: 'WALLET_STATE_UPDATE',
            payload: walletState
          }, '*')
        }
      } else if (event.data.type === 'REQUEST_WALLET_CONNECTION') {
        // Open wallet connection modal
        // This would trigger the RainbowKit modal
        console.log('🔗 Crash casino requesting wallet connection')
        // You could dispatch a custom event here to trigger the connect modal
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isConnected, address, chainId, isAbstract])

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={`w-full h-full border-0 ${className}`}
      title="Crash Casino"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  )
}

/**
 * 🎮 Crash Casino Page Component
 * 
 * Full page crash casino with wallet integration
 */
export function CrashCasinoPage() {
  const { isConnected, isAbstract } = useWallet()

  if (!isConnected) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">🎰 Crash Casino</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to start playing</p>
          {/* ConnectButton would go here */}
        </div>
      </div>
    )
  }

  if (!isAbstract) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">🌐 Wrong Network</h1>
          <p className="text-gray-400 mb-6">Please switch to Abstract L2 to play</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-gray-900">
      <CrashCasinoFrame 
        src="/crash-casino/frontend/pacorocko.html"
        className="w-full h-full"
      />
    </div>
  )
}
