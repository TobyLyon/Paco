import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, MinusIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/outline'
import useWallet from '../../hooks/useWallet'
import useInventory from '../hooks/useInventory'
import useApprovals from '../hooks/useApprovals'

export default function CreateTrade() {
  const navigate = useNavigate()
  const { address, signTypedData } = useWallet()
  const { inventory, loading: inventoryLoading, refetch: refetchInventory } = useInventory(address)
  const { approvals, checkApproval, grantApproval } = useApprovals(address)

  const [giveItems, setGiveItems] = useState([])
  const [takeItems, setTakeItems] = useState([])
  const [takerAddress, setTakerAddress] = useState('')
  const [expiry, setExpiry] = useState(24) // hours
  const [feeBps, setFeeBps] = useState(0)
  const [step, setStep] = useState('compose') // 'compose', 'review', 'sign'
  const [riskReport, setRiskReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const SWAP_ESCROW_ADDRESS = process.env.REACT_APP_TRADES_SWAP_ESCROW_ADDRESS

  useEffect(() => {
    if (giveItems.length > 0 || takeItems.length > 0) {
      generateRiskReport()
    }
  }, [giveItems, takeItems, takerAddress])

  const generateRiskReport = async () => {
    try {
      const response = await fetch('/api/trades/risk/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giveItems,
          takeItems,
          takerAddress: takerAddress || null,
          makerAddress: address
        })
      })
      const report = await response.json()
      setRiskReport(report)
    } catch (error) {
      console.error('Failed to generate risk report:', error)
    }
  }

  const addGiveItem = (item) => {
    setGiveItems(prev => [...prev, {
      itemType: item.type === 'ERC721' ? 0 : item.type === 'ERC1155' ? 1 : 2,
      contractAddr: item.contractAddress,
      tokenId: item.tokenId || 0,
      amount: item.amount || 1
    }])
  }

  const removeGiveItem = (index) => {
    setGiveItems(prev => prev.filter((_, i) => i !== index))
  }

  const addTakeItem = () => {
    setTakeItems(prev => [...prev, {
      itemType: 0, // Default to ERC721
      contractAddr: '',
      tokenId: 0,
      amount: 1
    }])
  }

  const updateTakeItem = (index, field, value) => {
    setTakeItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const removeTakeItem = (index) => {
    setTakeItems(prev => prev.filter((_, i) => i !== index))
  }

  const validateTrade = () => {
    if (giveItems.length === 0) {
      throw new Error('You must offer at least one item')
    }
    if (takeItems.length === 0) {
      throw new Error('You must request at least one item')
    }
    if (expiry < 1 || expiry > 24) {
      throw new Error('Expiry must be between 1 and 24 hours')
    }
    if (takerAddress && !takerAddress.startsWith('0x')) {
      throw new Error('Invalid taker address')
    }
  }

  const checkApprovals = async () => {
    const needsApproval = []
    
    for (const item of giveItems) {
      const isApproved = await checkApproval(item.contractAddr, SWAP_ESCROW_ADDRESS)
      if (!isApproved) {
        needsApproval.push(item.contractAddr)
      }
    }
    
    return needsApproval
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // Validate trade
      validateTrade()
      
      // Check approvals
      const needsApproval = await checkApprovals()
      if (needsApproval.length > 0) {
        throw new Error(`You need to approve these contracts: ${needsApproval.join(', ')}`)
      }
      
      // Generate order
      const order = {
        maker: address,
        taker: takerAddress || '0x0000000000000000000000000000000000000000',
        giveItems,
        takeItems,
        expiry: Math.floor(Date.now() / 1000) + (expiry * 3600),
        nonce: Date.now(),
        feeBps: feeBps
      }
      
      // Sign order
      const signature = await signTypedData(order)
      
      // Submit to API
      const response = await fetch('/api/trades/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, signature })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create trade')
      }
      
      const result = await response.json()
      navigate(`/trades/trade/${result.orderId}`)
      
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const proceedToReview = () => {
    try {
      validateTrade()
      setStep('review')
    } catch (error) {
      alert(error.message)
    }
  }

  if (step === 'review') {
    return <ReviewStep 
      giveItems={giveItems}
      takeItems={takeItems}
      takerAddress={takerAddress}
      expiry={expiry}
      feeBps={feeBps}
      riskReport={riskReport}
      onBack={() => setStep('compose')}
      onSubmit={handleSubmit}
      loading={loading}
    />
  }

  return (
    <div className="trades-create">
      <div className="trades-card">
        <div className="trades-card-header">
          <h1 className="trades-card-title">Create New Trade</h1>
          <p className="text-gray-600">Set up a peer-to-peer NFT trade on Abstract Mainnet</p>
        </div>
      </div>

      <div className="trades-grid-two">
        {/* Your Side */}
        <div className="trades-card">
          <h2 className="text-lg font-semibold mb-4 text-green-700">
            💰 What you're offering
          </h2>
          
          <div className="space-y-3">
            {giveItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium">
                    {item.itemType === 0 ? 'ERC721' : item.itemType === 1 ? 'ERC1155' : 'ERC20'}
                  </div>
                  <div className="text-sm text-gray-600 font-mono">
                    {item.contractAddr?.slice(0, 8)}...{item.contractAddr?.slice(-6)}
                  </div>
                  {item.tokenId > 0 && (
                    <div className="text-xs text-gray-500">Token #{item.tokenId}</div>
                  )}
                </div>
                <button
                  onClick={() => removeGiveItem(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {inventoryLoading ? (
              <div className="text-center py-4">
                <div className="trades-spinner"></div>
                <p className="text-sm text-gray-500">Loading your inventory...</p>
              </div>
            ) : (
              <InventoryPicker 
                inventory={inventory}
                onSelectItem={addGiveItem}
                selectedItems={giveItems}
              />
            )}
          </div>
        </div>

        {/* Their Side */}
        <div className="trades-card">
          <h2 className="text-lg font-semibold mb-4 text-blue-700">
            🎯 What you want in return
          </h2>
          
          <div className="space-y-3">
            {takeItems.map((item, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg">
                <div className="trades-form-group">
                  <label className="trades-label">Item Type</label>
                  <select
                    value={item.itemType}
                    onChange={(e) => updateTakeItem(index, 'itemType', parseInt(e.target.value))}
                    className="trades-input"
                  >
                    <option value={0}>ERC721 NFT</option>
                    <option value={1}>ERC1155 NFT</option>
                    <option value={2}>ERC20 Token</option>
                  </select>
                </div>
                
                <div className="trades-form-group">
                  <label className="trades-label">Contract Address</label>
                  <input
                    type="text"
                    value={item.contractAddr}
                    onChange={(e) => updateTakeItem(index, 'contractAddr', e.target.value)}
                    placeholder="0x..."
                    className="trades-input font-mono"
                  />
                </div>
                
                {item.itemType !== 2 && (
                  <div className="trades-form-group">
                    <label className="trades-label">Token ID</label>
                    <input
                      type="number"
                      value={item.tokenId}
                      onChange={(e) => updateTakeItem(index, 'tokenId', parseInt(e.target.value) || 0)}
                      className="trades-input"
                    />
                  </div>
                )}
                
                {item.itemType !== 0 && (
                  <div className="trades-form-group">
                    <label className="trades-label">Amount</label>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateTakeItem(index, 'amount', parseInt(e.target.value) || 1)}
                      min="1"
                      className="trades-input"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => removeTakeItem(index)}
                  className="trades-button-danger mt-2"
                >
                  <MinusIcon className="w-4 h-4 mr-1" />
                  Remove Item
                </button>
              </div>
            ))}
            
            <button
              onClick={addTakeItem}
              className="trades-button-secondary w-full"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Trade Settings */}
      <div className="trades-card">
        <h2 className="text-lg font-semibold mb-4">Trade Settings</h2>
        
        <div className="trades-grid-two">
          <div className="trades-form-group">
            <label className="trades-label">
              <ClockIcon className="w-4 h-4 inline mr-1" />
              Expiry (hours)
            </label>
            <input
              type="number"
              value={expiry}
              onChange={(e) => setExpiry(parseInt(e.target.value) || 1)}
              min="1"
              max="24"
              className="trades-input"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 24 hours for safety</p>
          </div>
          
          <div className="trades-form-group">
            <label className="trades-label">Specific Taker (optional)</label>
            <input
              type="text"
              value={takerAddress}
              onChange={(e) => setTakerAddress(e.target.value)}
              placeholder="0x... (leave empty for anyone)"
              className="trades-input font-mono"
            />
          </div>
        </div>
      </div>

      {/* Risk Preview */}
      {riskReport && riskReport.flags.length > 0 && (
        <div className="trades-card border-orange-200 bg-orange-50">
          <div className="trades-risk-banner">
            <div className="trades-risk-icon">⚠️</div>
            <div className="trades-risk-text">
              <strong>Risk Warnings:</strong>
              <ul className="mt-2 space-y-1">
                {riskReport.flags.map((flag, index) => (
                  <li key={index} className="text-sm">• {flag.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate('/trades')}
          className="trades-button-secondary"
        >
          Cancel
        </button>
        <button
          onClick={proceedToReview}
          className="trades-button"
          disabled={giveItems.length === 0 || takeItems.length === 0}
        >
          Review Trade
        </button>
      </div>
    </div>
  )
}

// Inventory picker component
function InventoryPicker({ inventory, onSelectItem, selectedItems }) {
  const [filter, setFilter] = useState('all')
  
  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true
    return item.type === filter
  })

  const isSelected = (item) => {
    return selectedItems.some(selected => 
      selected.contractAddr === item.contractAddress && 
      selected.tokenId === item.tokenId
    )
  }

  return (
    <div>
      <div className="flex space-x-2 mb-3">
        {['all', 'ERC721', 'ERC1155'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded text-sm ${
              filter === type 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {filteredInventory.map((item, index) => (
          <button
            key={`${item.contractAddress}-${item.tokenId}-${index}`}
            onClick={() => !isSelected(item) && onSelectItem(item)}
            disabled={isSelected(item)}
            className={`p-2 rounded-lg border text-left ${
              isSelected(item)
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="font-medium text-sm">{item.name || `Token #${item.tokenId}`}</div>
            <div className="text-xs text-gray-500">{item.type}</div>
            <div className="text-xs text-gray-400 font-mono">
              {item.contractAddress.slice(0, 8)}...
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Review step component
function ReviewStep({ giveItems, takeItems, takerAddress, expiry, feeBps, riskReport, onBack, onSubmit, loading }) {
  return (
    <div className="trades-create">
      <div className="trades-card">
        <div className="trades-card-header">
          <h1 className="trades-card-title">Review Your Trade</h1>
          <p className="text-gray-600">Double-check everything before signing</p>
        </div>
      </div>

      {/* Trade Summary */}
      <div className="trades-grid-two">
        <div className="trades-card">
          <h3 className="font-semibold text-green-700 mb-3">You Give</h3>
          {giveItems.map((item, index) => (
            <div key={index} className="p-2 bg-green-50 rounded mb-2">
              <div className="text-sm">
                {item.itemType === 0 ? 'ERC721' : item.itemType === 1 ? 'ERC1155' : 'ERC20'}
                {item.tokenId > 0 && ` #${item.tokenId}`}
                {item.amount > 1 && ` (${item.amount})`}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {item.contractAddr.slice(0, 8)}...{item.contractAddr.slice(-6)}
              </div>
            </div>
          ))}
        </div>

        <div className="trades-card">
          <h3 className="font-semibold text-blue-700 mb-3">You Get</h3>
          {takeItems.map((item, index) => (
            <div key={index} className="p-2 bg-blue-50 rounded mb-2">
              <div className="text-sm">
                {item.itemType === 0 ? 'ERC721' : item.itemType === 1 ? 'ERC1155' : 'ERC20'}
                {item.tokenId > 0 && ` #${item.tokenId}`}
                {item.amount > 1 && ` (${item.amount})`}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {item.contractAddr.slice(0, 8)}...{item.contractAddr.slice(-6)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Report */}
      {riskReport && riskReport.score > 0 && (
        <div className={`trades-card ${riskReport.score > 50 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <h3 className="font-semibold mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-orange-500" />
            Risk Assessment (Score: {riskReport.score}/100)
          </h3>
          {riskReport.flags.map((flag, index) => (
            <div key={index} className="mb-2">
              <div className="font-medium text-sm">{flag.type}</div>
              <div className="text-sm text-gray-600">{flag.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button onClick={onBack} className="trades-button-secondary">
          Back to Edit
        </button>
        <button 
          onClick={onSubmit} 
          className="trades-button"
          disabled={loading}
        >
          {loading ? 'Creating Trade...' : 'Sign & Create Trade'}
        </button>
      </div>
    </div>
  )
}