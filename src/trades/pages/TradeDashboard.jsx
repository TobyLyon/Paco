import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, FilterIcon, SearchIcon, RefreshIcon } from '@heroicons/react/outline'
import TwitterProfileCard from '../../components/TwitterProfileCard'
import { ChatRoomCompact } from '../../components/ChatRoom'
import useWallet from '../../hooks/useWallet'

export default function TradeDashboard() {
  const { address } = useWallet()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'open', 'my-offers'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent') // 'recent', 'expiry', 'value'

  useEffect(() => {
    loadOrders()
  }, [filter, sortBy])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: filter === 'open' ? 'open' : '',
        maker: filter === 'my-offers' ? address : '',
        sort: sortBy,
        limit: '20'
      })

      const response = await fetch(`/api/trades/orders?${params}`)
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true
    return order.order_data.giveItems.some(item => 
      item.contractAddr.toLowerCase().includes(searchTerm.toLowerCase())
    ) || order.order_data.takeItems.some(item => 
      item.contractAddr.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getStatusBadge = (status) => {
    const badges = {
      open: 'trades-status-open',
      filled: 'trades-status-filled',
      cancelled: 'trades-status-cancelled',
      expired: 'trades-status-expired'
    }
    return badges[status] || 'trades-status'
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
      return `${days}d remaining`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m remaining`
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

  return (
    <div className="trades-dashboard">
      {/* Header */}
      <div className="trades-card">
        <div className="trades-card-header">
          <div>
            <h1 className="trades-card-title">NFT Trading Dashboard</h1>
            <p className="text-gray-600">Discover and trade NFTs securely on Abstract Mainnet</p>
          </div>
          <Link 
            to="/trades/create" 
            className="trades-button flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Trade</span>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="trades-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All Trades' },
              { key: 'open', label: 'Open' },
              { key: 'my-offers', label: 'My Offers' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by contract..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="trades-input pl-10 w-48"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="trades-input"
            >
              <option value="recent">Most Recent</option>
              <option value="expiry">Expiring Soon</option>
              <option value="value">Highest Value</option>
            </select>

            <button
              onClick={loadOrders}
              className="trades-button-secondary p-2"
              disabled={loading}
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="trades-loading">
            <div className="trades-spinner"></div>
            <p>Loading trades...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="trades-card text-center py-12">
            <div className="text-6xl mb-4">🤝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trades found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'my-offers' 
                ? "You haven't created any trades yet."
                : "No trades match your current filters."
              }
            </p>
            {filter === 'my-offers' && (
              <Link to="/trades/create" className="trades-button">
                Create Your First Trade
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              currentUserAddress={address}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Individual order card component
function OrderCard({ order, currentUserAddress }) {
  const isMyOrder = order.maker_address.toLowerCase() === currentUserAddress?.toLowerCase()
  const hasRiskFlags = order.risk_score > 50

  return (
    <div className={`trades-card ${hasRiskFlags ? 'border-orange-200 bg-orange-50' : ''}`}>
      {/* Risk Warning Banner */}
      {hasRiskFlags && (
        <div className="trades-risk-banner">
          <div className="trades-risk-icon">⚠️</div>
          <div className="trades-risk-text">
            <strong>Risk Warning:</strong> This trade has been flagged for potential risks.
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        {/* Order Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <span className={`trades-status ${getStatusBadge(order.status)}`}>
              {order.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              {formatTimeRemaining(order.order_data.expiry)}
            </span>
            {order.order_data.feeBps > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {order.order_data.feeBps / 100}% fee
              </span>
            )}
          </div>

          <div className="trades-grid-two mb-4">
            {/* Maker Side */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {isMyOrder ? 'You offer:' : 'They offer:'}
              </h4>
              <p className="text-sm text-gray-900 mb-2">
                {getItemSummary(order.order_data.giveItems)}
              </p>
              <TwitterProfileCard
                walletAddress={order.maker_address}
                twitterHandle={order.maker_profile?.twitter_handle}
                size="small"
                className="bg-transparent border-gray-200"
              />
            </div>

            {/* Taker Side */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {isMyOrder ? 'You want:' : 'They want:'}
              </h4>
              <p className="text-sm text-gray-900 mb-2">
                {getItemSummary(order.order_data.takeItems)}
              </p>
              {order.taker_address ? (
                <TwitterProfileCard
                  walletAddress={order.taker_address}
                  twitterHandle={order.taker_profile?.twitter_handle}
                  size="small"
                  className="bg-transparent border-gray-200"
                />
              ) : (
                <div className="text-sm text-gray-500 italic">Open to anyone</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <ChatRoomCompact 
            orderId={order.id}
            messageCount={order.message_count || 0}
            hasUnread={order.has_unread_messages}
          />
          
          <Link
            to={`/trades/trade/${order.id}`}
            className="trades-button-secondary"
          >
            View Details
          </Link>
          
          {!isMyOrder && order.status === 'open' && (
            <Link
              to={`/trades/trade/${order.id}?action=accept`}
              className="trades-button"
            >
              Accept Trade
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}