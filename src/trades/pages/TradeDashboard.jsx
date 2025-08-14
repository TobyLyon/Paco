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
  const [stats, setStats] = useState({
    totalTrades: 0,
    activeTrades: 0,
    totalVolume: 0,
    myActiveTrades: 0
  })

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [filter, sortBy])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/trades/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

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
      open: <span className="trades-status trades-status-open">🟢 Open</span>,
      filled: <span className="trades-status trades-status-filled">🔵 Filled</span>,
      cancelled: <span className="trades-status trades-status-cancelled">🔴 Cancelled</span>,
      expired: <span className="trades-status trades-status-expired">⚫ Expired</span>
    }
    return badges[status] || badges.open
  }

  const formatExpiry = (expiry) => {
    const now = Date.now() / 1000
    const timeLeft = expiry - now
    
    if (timeLeft <= 0) return 'Expired'
    
    const hours = Math.floor(timeLeft / 3600)
    const minutes = Math.floor((timeLeft % 3600) / 60)
    
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="trades-loading">
        <div className="trades-spinner"></div>
        <p>🐔 Loading chicken-powered trades...</p>
        <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '8px' }}>
          Our chickens are gathering the freshest trade data!
        </p>
      </div>
    )
  }

  return (
    <div className="trades-dashboard">
      {/* Dashboard Stats */}
      <div className="trades-dashboard-stats">
        <div className="trades-stat-card">
          <div className="trades-stat-value">{stats.totalTrades}</div>
          <div className="trades-stat-label">🐣 Total Trades</div>
        </div>
        <div className="trades-stat-card">
          <div className="trades-stat-value">{stats.activeTrades}</div>
          <div className="trades-stat-label">🔥 Active Now</div>
        </div>
        <div className="trades-stat-card">
          <div className="trades-stat-value">{stats.totalVolume}Ξ</div>
          <div className="trades-stat-label">💰 Volume Today</div>
        </div>
        <div className="trades-stat-card">
          <div className="trades-stat-value">{stats.myActiveTrades}</div>
          <div className="trades-stat-label">🎯 My Active</div>
        </div>
      </div>

      {/* Header */}
      <div className="trades-card">
        <div className="trades-card-header">
          <div>
            <h1 className="trades-card-title">🐔 Trade Dashboard</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
              Discover and execute NFT trades with chicken-powered security
            </p>
          </div>
          <Link to="/trades/create" className="trades-button">
            <PlusIcon className="w-4 h-4" />
            Create Trade
          </Link>
        </div>

        {/* Filters and Search */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {/* Filter Buttons */}
            <div className="trades-inventory-filter">
              {[
                { key: 'all', label: '🌎 All Trades' },
                { key: 'open', label: '🟢 Open Only' },
                { key: 'my-offers', label: '🎯 My Offers' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={filter === key ? 'active' : ''}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="trades-inventory-filter">
              {[
                { key: 'recent', label: '🕐 Recent' },
                { key: 'expiry', label: '⏰ Expiring' },
                { key: 'value', label: '💎 Value' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={sortBy === key ? 'active' : ''}
                >
                  {label}
                </button>
              ))}
            </div>

            <button onClick={loadOrders} className="trades-button-secondary">
              <RefreshIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="trades-form-group">
            <div style={{ position: 'relative' }}>
              <SearchIcon className="w-4 h-4" style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'rgba(255, 255, 255, 0.5)' 
              }} />
              <input
                type="text"
                placeholder="🔍 Search by contract address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="trades-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trade Orders */}
      {filteredOrders.length === 0 ? (
        <div className="trades-card">
          <div className="trades-empty-state">
            <div className="emoji">🐥</div>
            <h3>No Trades Found</h3>
            <p>
              {filter === 'my-offers' 
                ? "You haven't created any trades yet. Start your first trade to join the chicken coop!"
                : searchTerm 
                ? "No trades match your search. Try a different contract address."
                : "No trades available right now. Be the first chicken to create a trade!"
              }
            </p>
            {filter !== 'my-offers' && !searchTerm && (
              <Link to="/trades/create" className="trades-button" style={{ marginTop: '16px' }}>
                🚀 Create First Trade
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="trades-grid">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }) {
  const expiry = formatExpiry(order.order_data.expiry)
  const isExpired = expiry === 'Expired'
  
  return (
    <div className="trades-card" style={{ marginBottom: '16px' }}>
      <div className="trades-card-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            {getStatusBadge(order.status)}
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
              ⏰ {isExpired ? '🔴 Expired' : `🟡 ${expiry} left`}
            </div>
          </div>
          <Link 
            to={`/trades/trade/${order.id}`}
            className="trades-button-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            View Details
          </Link>
        </div>
      </div>

      {/* Trade Summary */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
          {/* Give Items */}
          <div>
            <h4 style={{ fontSize: '0.875rem', color: '#10b981', marginBottom: '8px', fontWeight: '600' }}>
              🎁 Offering
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              {order.order_data.giveItems.slice(0, 2).map((item, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  {item.tokenType} #{item.tokenId || 'N/A'}
                </div>
              ))}
              {order.order_data.giveItems.length > 2 && (
                <div style={{ color: '#fbbf24', fontStyle: 'italic' }}>
                  +{order.order_data.giveItems.length - 2} more items
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div style={{ textAlign: 'center', fontSize: '1.5rem' }}>
            🔄
          </div>

          {/* Take Items */}
          <div>
            <h4 style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '8px', fontWeight: '600' }}>
              🎯 Requesting
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              {order.order_data.takeItems.slice(0, 2).map((item, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  {item.tokenType} #{item.tokenId || 'N/A'}
                </div>
              ))}
              {order.order_data.takeItems.length > 2 && (
                <div style={{ color: '#fbbf24', fontStyle: 'italic' }}>
                  +{order.order_data.takeItems.length - 2} more items
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Maker Profile */}
      <div style={{ marginBottom: '12px' }}>
        <TwitterProfileCard 
          address={order.order_data.maker}
          size="sm"
          showFollowers={false}
        />
      </div>

      {/* Chat Preview */}
      <ChatRoomCompact orderId={order.id} />
    </div>
  )
}

function getStatusBadge(status) {
  const badges = {
    open: <span className="trades-status trades-status-open">🟢 Open</span>,
    filled: <span className="trades-status trades-status-filled">🔵 Filled</span>,
    cancelled: <span className="trades-status trades-status-cancelled">🔴 Cancelled</span>,
    expired: <span className="trades-status trades-status-expired">⚫ Expired</span>
  }
  return badges[status] || badges.open
}

function formatExpiry(expiry) {
  const now = Date.now() / 1000
  const timeLeft = expiry - now
  
  if (timeLeft <= 0) return 'Expired'
  
  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}