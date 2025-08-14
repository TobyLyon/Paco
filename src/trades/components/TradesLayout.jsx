import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import useWallet from '../../hooks/useWallet'

function TradesLayout({ children, chainGuard }) {
  const location = useLocation()
  const { address } = useWallet()

  const navigation = [
    { name: 'Dashboard', href: '/trades', path: '/trades' },
    { name: 'Create Trade', href: '/trades/create', path: '/trades/create' },
    { name: 'My Trades', href: '/trades/my-trades', path: '/trades/my-trades' },
  ]

  const isActiveLink = (path) => {
    if (path === '/trades') {
      return location.pathname === '/trades'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="trades-layout">
      {/* Header */}
      <header className="trades-header">
        <nav className="trades-nav">
          <Link to="/trades" className="trades-logo">
            🔄 PacoTrades
          </Link>
          
          <ul className="trades-nav-links">
            {navigation.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.href}
                  className={`trades-nav-link ${isActiveLink(item.path) ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="trades-wallet-info">
            <span className="trades-address">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No wallet'}
            </span>
            <div className="trades-chain-indicator">
              <span className={`trades-chain-badge ${chainGuard.isOnAbstract ? 'connected' : 'wrong-chain'}`}>
                Abstract {chainGuard.isOnAbstract ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="trades-main">
        {/* Chain Guard Warning */}
        {chainGuard.needsSwitch && (
          <div className="trades-chain-warning">
            <h3>⚠️ Wrong Network</h3>
            <p>Please switch to Abstract Mainnet to use PacoTrades</p>
            <button
              onClick={chainGuard.addOrSwitch}
              className="trades-button"
            >
              Switch to Abstract
            </button>
          </div>
        )}

        {/* Page Content */}
        {chainGuard.isOnAbstract ? children : (
          <div className="trades-loading">
            <div className="trades-spinner"></div>
            <p>Waiting for Abstract Mainnet connection...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default TradesLayout