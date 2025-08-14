import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TradesLayout from './components/TradesLayout'
import TradeDashboard from './pages/TradeDashboard'
import CreateTrade from './pages/CreateTrade'
import TradeDetail from './pages/TradeDetail'
import MyTrades from './pages/MyTrades'
import useChainGuard from '../hooks/useChainGuard'
import useWallet from '../hooks/useWallet'
import './styles/trades.css'

const ABSTRACT_CHAIN_ID = 2741

function TradesApp() {
  const { isConnected } = useWallet()
  const chainGuard = useChainGuard(ABSTRACT_CHAIN_ID)

  // Redirect to main app if wallet not connected
  if (!isConnected) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="trades-app">
      <TradesLayout chainGuard={chainGuard}>
        <Routes>
          <Route path="/" element={<TradeDashboard />} />
          <Route path="/create" element={<CreateTrade />} />
          <Route path="/trade/:orderId" element={<TradeDetail />} />
          <Route path="/my-trades" element={<MyTrades />} />
          <Route path="*" element={<Navigate to="/trades" replace />} />
        </Routes>
      </TradesLayout>
    </div>
  )
}

export default TradesApp