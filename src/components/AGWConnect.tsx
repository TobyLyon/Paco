import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Props = {
  onConnected?: (address: string) => void
}

export default function AGWConnect({ onConnected }: Props) {
  const [ready, setReady] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReady(typeof window !== 'undefined')
  }, [])

  const connectEmail = async () => {
    setError(null)
    try {
      const { AbstractWalletClient } = await import('@abstract-foundation/agw-client')
      const client = new AbstractWalletClient({})
      const res = await client.login({ strategy: 'email' })
      if (res?.address) {
        setAddress(res.address)
        onConnected?.(res.address)
      }
    } catch (e: any) {
      setError(e?.message || 'AGW email login failed')
    }
  }

  const connectPasskey = async () => {
    setError(null)
    try {
      const { AbstractWalletClient } = await import('@abstract-foundation/agw-client')
      const client = new AbstractWalletClient({})
      const res = await client.login({ strategy: 'passkey' })
      if (res?.address) {
        setAddress(res.address)
        onConnected?.(res.address)
      }
    } catch (e: any) {
      setError(e?.message || 'AGW passkey login failed')
    }
  }

  if (!ready) return null

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-300">Or use Abstract Global Wallet</div>
      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={connectEmail}
          className="pixel-button px-3 py-2 bg-white text-gray-900"
        >
          AGW Email
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={connectPasskey}
          className="pixel-button px-3 py-2 bg-white text-gray-900"
        >
          AGW Passkey
        </motion.button>
      </div>
      {address && (
        <div className="text-xs text-green-400 text-center">Connected: {address.slice(0,6)}...{address.slice(-4)}</div>
      )}
      {error && (
        <div className="text-xs text-red-400 text-center">{error}</div>
      )}
    </div>
  )
}


