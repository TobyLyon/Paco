import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/outline'
import TwitterProfileCard from '../../components/TwitterProfileCard'
import useWallet from '../../hooks/useWallet'

export default function MyTrades() {
  const { address } = useWallet()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'active', 'completed', 'cancelled'
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    successRate: 0
  })

  useEffect(() => {
    if (address) {
      loadMyTrades()
    }
  }, [address, filter])

  const loadMyTrades = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        maker: address,
        status: filter === 'all' ? '' : filter === 'active' ? 'open' : filter,
        limit: '50'
      })

      // Also load trades where user is the taker
      const [makerResponse, takerResponse] = await Promise.all([
        fetch(`/api/trades/orders?${params}`),
        fetch(`/api/trades/orders?taker=${address}&limit=50`)
      ])

      const makerData = await makerResponse.json()
      const takerData = await takerResponse.json()

      // Combine and deduplicate trades
      const allTrades = [...(makerData.orders || []), ...(takerData.orders || [])]
      const uniqueTrades = allTrades.filter((trade, index, self) => 
        index === self.findIndex(t => t.id === trade.id)
      )

      // Sort by creation date
      uniqueTrades.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setTrades(uniqueTrades)
      calculateStats(uniqueTrades)

    } catch (error) {
      console.error('Failed to load trades:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (trades) => {
    const total = trades.length
    const active = trades.filter(t => t.status === 'open').length
    const completed = trades.filter(t => t.status === 'filled').length
    const cancelled = trades.filter(t => t.status === 'cancelled' || t.status === 'expired').length
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

    setStats({ total, active, completed, cancelled, successRate })
  }

  const getTradeRole = (trade) => {
    if (trade.maker_address.toLowerCase() === address?.toLowerCase()) {
      return 'maker'
    } else if (trade.taker_address?.toLowerCase() === address?.toLowerCase()) {
      return 'taker'
    }
    return 'unknown'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'filled':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'expired':
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getItemSummary = (items) => {
    if (items.length === 0) return 'No items'
    if (items.length === 1) {
      const item = items[0]
      const type = item.itemType === 0 ? 'NFT' : item.itemType === 1 ? 'NFT' : 'Token'
      return `1 ${type}`
    }
    return `${items.length} items`
  }

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true
    if (filter === 'active') return trade.status === 'open'
    if (filter === 'completed') return trade.status === 'filled'
    if (filter === 'cancelled') return trade.status === 'cancelled' || trade.status === 'expired'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="trades-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Trades</h1>
            <p className="text-gray-600">Manage your trading history and active orders</p>
          </div>
          <Link to="/trades/create" className="trades-button">
            Create New Trade
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="trades-card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Trades</div>
        </div>
        <div className="trades-card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="trades-card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="trades-card text-center">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
        <div className="trades-card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="trades-card">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All Trades' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-4">
        {loading ? (
          <div className="trades-loading">
            <div className="trades-spinner"></div>
            <p>Loading your trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="trades-card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No trades yet' : `No ${filter} trades`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't created or participated in any trades yet."
                : `You don't have any ${filter} trades at the moment.`
              }
            </p>
            {filter === 'all' && (
              <Link to="/trades/create" className="trades-button">
                Create Your First Trade
              </Link>
            )}
          </div>
        ) : (
          filteredTrades.map(trade => (
            <TradeCard 
              key={trade.id} 
              trade={trade} 
              userAddress={address}
              userRole={getTradeRole(trade)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Individual trade card component
function TradeCard({ trade, userAddress, userRole }) {
  const isExpired = Date.now() > trade.order_data.expiry * 1000
  const effectiveStatus = isExpired && trade.status === 'open' ? 'expired' : trade.status

  const getStatusColor = (status) => {
    const colors = {
      open: 'text-yellow-700 bg-yellow-100 border-yellow-200',
      filled: 'text-green-700 bg-green-100 border-green-200',
      cancelled: 'text-red-700 bg-red-100 border-red-200',
      expired: 'text-gray-700 bg-gray-100 border-gray-200'
    }
    return colors[status] || 'text-gray-700 bg-gray-100 border-gray-200'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <ClockIcon className="w-4 h-4" />
      case 'filled':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'cancelled':
        return <XCircleIcon className="w-4 h-4" />
      case 'expired':
        return <ExclamationCircleIcon className="w-4 h-4" />
      default:
        return <ClockIcon className="w-4 h-4" />
    }
  }

  const getItemSummary = (items) => {
    const counts = items.reduce((acc, item) => {
      const type = item.itemType === 0 ? 'NFT' : item.itemType === 1 ? 'NFT' : 'Token'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="trades-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-3">
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(effectiveStatus)}`}>
              {getStatusIcon(effectiveStatus)}
              <span>{effectiveStatus.toUpperCase()}</span>
            </span>
            
            <span className="text-xs text-gray-500">
              {userRole === 'maker' ? 'You created' : 'You accepted'} • {formatDate(trade.created_at)}
            </span>
            
            {trade.order_data.feeBps > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {trade.order_data.feeBps / 100}% fee
              </span>
            )}
          </div>

          {/* Trade Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* You Give/Gave */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {userRole === 'maker' ? 'You offered:' : 'You received:'}
              </h4>
              <p className="text-sm text-gray-900">
                {userRole === 'maker' 
                  ? getItemSummary(trade.order_data.giveItems)
                  : getItemSummary(trade.order_data.takeItems)
                }
              </p>
            </div>

            {/* You Get/Got */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {userRole === 'maker' ? 'You wanted:' : 'You gave:'}
              </h4>
              <p className="text-sm text-gray-900">
                {userRole === 'maker' 
                  ? getItemSummary(trade.order_data.takeItems)
                  : getItemSummary(trade.order_data.giveItems)
                }
              </p>
            </div>

            {/* Trading Partner */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {userRole === 'maker' ? 'Taker:' : 'Maker:'}
              </h4>
              {userRole === 'maker' ? (
                trade.taker_address ? (
                  <TwitterProfileCard
                    walletAddress={trade.taker_address}
                    twitterHandle={trade.taker_profile?.twitter_handle}
                    size="small"
                    showMetrics={false}
                    className="bg-transparent border-none shadow-none p-0"
                  />
                ) : (
                  <span className="text-sm text-gray-500 italic">Open to anyone</span>
                )
              ) : (
                <TwitterProfileCard
                  walletAddress={trade.maker_address}
                  twitterHandle={trade.maker_profile?.twitter_handle}
                  size="small"
                  showMetrics={false}
                  className="bg-transparent border-none shadow-none p-0"
                />
              )}
            </div>
          </div>

          {/* Transaction Hash */}
          {trade.tx_hash && (
            <div className="text-xs text-gray-500">
              Transaction: 
              <a 
                href={`https://abscan.org/tx/${trade.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 ml-1 font-mono"
              >
                {trade.tx_hash.slice(0, 10)}...{trade.tx_hash.slice(-8)}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <Link
            to={`/trades/trade/${trade.id}`}
            className="trades-button-secondary"
          >
            View Details
          </Link>
          
          {effectiveStatus === 'open' && userRole === 'maker' && (
            <Link
              to={`/trades/trade/${trade.id}`}
              className="trades-button-danger"
            >
              Cancel
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}