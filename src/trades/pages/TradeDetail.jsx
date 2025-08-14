import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ExternalLinkIcon, ClockIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/outline'
import TwitterProfileCard from '../../components/TwitterProfileCard'
import ChatRoom from '../../components/ChatRoom'
import useWallet from '../../hooks/useWallet'
import useChainGuard from '../../hooks/useChainGuard'

export default function TradeDetail() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { address, signTypedData } = useWallet()
  const chainGuard = useChainGuard(2741)

  const [order, setOrder] = useState(null)
  const [riskReport, setRiskReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const autoAccept = searchParams.get('action') === 'accept'

  useEffect(() => {
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (order) {
      loadRiskReport()
    }
  }, [order])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/trades/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Order not found')
      }
      const data = await response.json()
      setOrder(data.order)
    } catch (error) {
      console.error('Failed to load order:', error)
      navigate('/trades')
    } finally {
      setLoading(false)
    }
  }

  const loadRiskReport = async () => {
    try {
      const response = await fetch(`/api/trades/risk/${orderId}`)
      const data = await response.json()
      setRiskReport(data)
    } catch (error) {
      console.error('Failed to load risk report:', error)
    }
  }

  const handleAcceptTrade = async () => {
    if (!chainGuard.isOnAbstract) {
      await chainGuard.addOrSwitch()
      return
    }

    setAccepting(true)
    try {
      // Simulate the fill transaction
      const response = await fetch(`/api/trades/orders/${orderId}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takerAddress: address,
          orderSignature: order.signature
        })
      })

      if (!response.ok) {
        throw new Error('Failed to accept trade')
      }

      const result = await response.json()
      
      // Show success and redirect
      alert('Trade accepted successfully!')
      navigate('/trades/my-trades')

    } catch (error) {
      alert(error.message)
    } finally {
      setAccepting(false)
    }
  }

  const handleCancelTrade = async () => {
    setCancelling(true)
    try {
      const response = await fetch(`/api/trades/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makerAddress: address })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel trade')
      }

      alert('Trade cancelled successfully!')
      navigate('/trades')

    } catch (error) {
      alert(error.message)
    } finally {
      setCancelling(false)
    }
  }

  const copyTradeLink = () => {
    const url = `${window.location.origin}/trades/trade/${orderId}`
    navigator.clipboard.writeText(url)
    alert('Trade link copied to clipboard!')
  }

  const formatTimeRemaining = (expiry) => {
    const now = Date.now()
    const expiryTime = expiry * 1000
    const diff = expiryTime - now

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h remaining`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m remaining`
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'text-green-600 bg-green-100',
      filled: 'text-blue-600 bg-blue-100',
      cancelled: 'text-red-600 bg-red-100',
      expired: 'text-gray-600 bg-gray-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }

  const renderItem = (item, index) => (
    <div key={index} className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium">
              {item.itemType === 0 ? 'ERC721' : item.itemType === 1 ? 'ERC1155' : 'ERC20'}
            </span>
            {item.amount > 1 && (
              <span className="text-sm text-gray-600">× {item.amount}</span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 font-mono mb-1">
            {item.contractAddr}
          </div>
          
          {item.tokenId > 0 && (
            <div className="text-sm text-gray-500">Token #{item.tokenId}</div>
          )}
        </div>
        
        <a
          href={`https://abscan.org/address/${item.contractAddr}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="trades-loading">
        <div className="trades-spinner"></div>
        <p>Loading trade details...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="trades-card text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Trade not found</h3>
        <p className="text-gray-600 mb-6">This trade may have been removed or doesn't exist.</p>
        <button
          onClick={() => navigate('/trades')}
          className="trades-button"
        >
          Back to Trades
        </button>
      </div>
    )
  }

  const isMyTrade = order.maker_address.toLowerCase() === address?.toLowerCase()
  const canAccept = !isMyTrade && order.status === 'open' && (!order.order_data.taker || order.order_data.taker === '0x0000000000000000000000000000000000000000' || order.order_data.taker.toLowerCase() === address?.toLowerCase())
  const canCancel = isMyTrade && order.status === 'open'
  const hasHighRisk = riskReport?.score > 70

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="trades-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Trade Details</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">Trade ID: {orderId}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-1" />
                {formatTimeRemaining(order.order_data.expiry)}
              </span>
              <span>Created: {new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyTradeLink}
              className="trades-button-secondary"
            >
              📋 Copy Link
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="trades-button-secondary"
            >
              💬 Chat
            </button>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      {hasHighRisk && (
        <div className="trades-card border-red-200 bg-red-50">
          <div className="trades-risk-banner">
            <div className="trades-risk-icon">🚨</div>
            <div className="trades-risk-text">
              <strong>High Risk Warning:</strong> This trade has been flagged with a risk score of {riskReport.score}/100.
              <ul className="mt-2 space-y-1">
                {riskReport.flags.slice(0, 3).map((flag, index) => (
                  <li key={index} className="text-sm">• {flag.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trade Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Participants */}
          <div className="trades-card">
            <h2 className="text-lg font-semibold mb-4">Participants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Maker</h3>
                <TwitterProfileCard
                  walletAddress={order.maker_address}
                  twitterHandle={order.maker_profile?.twitter_handle}
                  verified={order.maker_profile?.verified}
                  followerCount={order.maker_profile?.follower_count}
                />
                {isMyTrade && (
                  <div className="mt-2 text-sm text-blue-600 font-medium">This is you</div>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Taker</h3>
                {order.taker_address ? (
                  <TwitterProfileCard
                    walletAddress={order.taker_address}
                    twitterHandle={order.taker_profile?.twitter_handle}
                    verified={order.taker_profile?.verified}
                    followerCount={order.taker_profile?.follower_count}
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      👥
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Open to anyone</div>
                      <div className="text-sm text-gray-500">First come, first served</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trade Items */}
          <div className="trades-card">
            <h2 className="text-lg font-semibold mb-4">Trade Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Give Items */}
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-3 flex items-center">
                  💰 {isMyTrade ? 'You offer' : 'They offer'} ({order.order_data.giveItems.length} items)
                </h3>
                <div className="space-y-3">
                  {order.order_data.giveItems.map(renderItem)}
                </div>
              </div>

              {/* Take Items */}
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                  🎯 {isMyTrade ? 'You want' : 'They want'} ({order.order_data.takeItems.length} items)
                </h3>
                <div className="space-y-3">
                  {order.order_data.takeItems.map(renderItem)}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Report */}
          {riskReport && (
            <div className="trades-card">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Security Report
              </h2>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Score</span>
                  <span className={`font-bold ${riskReport.score > 70 ? 'text-red-600' : riskReport.score > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {riskReport.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${riskReport.score > 70 ? 'bg-red-500' : riskReport.score > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${riskReport.score}%` }}
                  ></div>
                </div>
              </div>

              {riskReport.flags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Flags</h4>
                  <div className="space-y-2">
                    {riskReport.flags.map((flag, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{flag.type}</div>
                          <div className="text-sm text-gray-600">{flag.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskReport.recommendations && riskReport.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {riskReport.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="trades-card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {canAccept && (
                <button
                  onClick={handleAcceptTrade}
                  disabled={accepting || !chainGuard.isOnAbstract}
                  className="trades-button w-full"
                >
                  {accepting ? 'Accepting...' : 'Accept Trade'}
                </button>
              )}
              
              {canCancel && (
                <button
                  onClick={handleCancelTrade}
                  disabled={cancelling}
                  className="trades-button-danger w-full"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Trade'}
                </button>
              )}
              
              {!chainGuard.isOnAbstract && (
                <button
                  onClick={chainGuard.addOrSwitch}
                  className="trades-button w-full"
                >
                  Switch to Abstract
                </button>
              )}

              <button
                onClick={() => navigate('/trades')}
                className="trades-button-secondary w-full"
              >
                Back to Trades
              </button>
            </div>
          </div>

          {/* Chat */}
          {chatOpen && (
            <ChatRoom
              orderId={orderId}
              currentUser={{
                walletAddress: address,
                twitterHandle: null // Would fetch from user profile
              }}
              otherUser={{
                walletAddress: isMyTrade ? order.taker_address : order.maker_address,
                twitterHandle: isMyTrade ? order.taker_profile?.twitter_handle : order.maker_profile?.twitter_handle
              }}
              onClose={() => setChatOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}