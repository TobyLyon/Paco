import React, { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon, EmojiHappyIcon, ExclamationCircleIcon } from '@heroicons/react/outline'
import TwitterProfileCard from './TwitterProfileCard'

/**
 * ChatRoom - Real-time chat widget for trade negotiations
 * Scoped to specific order IDs to keep conversations organized
 */
export default function ChatRoom({ 
  orderId, 
  currentUser,
  otherUser,
  isOpen = true,
  onClose,
  className = ''
}) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [typing, setTyping] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Mock WebSocket connection (in production, use Socket.IO)
  useEffect(() => {
    if (!orderId) return

    // Simulate connection
    setIsConnected(true)
    
    // Load existing messages
    loadChatHistory()

    // Simulate receiving messages
    const interval = setInterval(() => {
      // In production, this would be real WebSocket events
      if (Math.random() < 0.1) {
        receiveMessage({
          id: Date.now(),
          senderId: otherUser?.walletAddress,
          content: "Is this item still available?",
          timestamp: new Date(),
          type: 'text'
        })
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [orderId, otherUser?.walletAddress])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatHistory = async () => {
    // In production, fetch from API
    const mockMessages = [
      {
        id: 1,
        senderId: otherUser?.walletAddress,
        content: "Hey, interested in your NFT collection!",
        timestamp: new Date(Date.now() - 3600000),
        type: 'text'
      },
      {
        id: 2,
        senderId: currentUser?.walletAddress,
        content: "Sure! What are you looking to trade?",
        timestamp: new Date(Date.now() - 3500000),
        type: 'text'
      }
    ]
    setMessages(mockMessages)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const message = {
      id: Date.now(),
      senderId: currentUser?.walletAddress,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // In production, send via WebSocket/API
    try {
      await fetch(`/api/trades/chat/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const receiveMessage = (message) => {
    setMessages(prev => [...prev, message])
  }

  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    const diffMs = now - messageDate
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else {
      return messageDate.toLocaleDateString()
    }
  }

  const commonEmojis = ['👍', '👎', '🤔', '🔥', '💎', '🚀', '⚡', '✅', '❌', '🤝']

  if (!isOpen) return null

  return (
    <div className={`bg-white border rounded-lg shadow-lg flex flex-col h-96 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="font-medium text-gray-900">Trade Chat</h3>
          <span className="text-xs text-gray-500">#{orderId?.slice(0, 8)}</span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Participants */}
      <div className="p-2 border-b bg-gray-25 flex items-center space-x-2 text-xs">
        <span className="text-gray-500">Participants:</span>
        <TwitterProfileCard 
          {...currentUser} 
          size="small" 
          showMetrics={false}
          className="bg-transparent border-none shadow-none p-0"
        />
        <span className="text-gray-300">•</span>
        <TwitterProfileCard 
          {...otherUser} 
          size="small" 
          showMetrics={false}
          className="bg-transparent border-none shadow-none p-0"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Start the conversation!</p>
            <p className="text-xs">Negotiate terms and build trust</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUser?.walletAddress
            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  isOwnMessage 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Safety Notice */}
      <div className="px-3 py-1 bg-yellow-50 border-t border-yellow-200">
        <div className="flex items-center space-x-1 text-xs text-yellow-800">
          <ExclamationCircleIcon className="w-3 h-3" />
          <span>Never share private keys or send funds outside the platform</span>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="border-t p-2 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setNewMessage(prev => prev + emoji)
                  setShowEmojis(false)
                }}
                className="text-lg hover:bg-gray-200 rounded px-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-center space-x-2 p-3 border-t">
        <button
          onClick={() => setShowEmojis(!showEmojis)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <EmojiHappyIcon className="w-5 h-5" />
        </button>
        
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isConnected}
        />
        
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || !isConnected}
          className="text-blue-500 hover:text-blue-600 disabled:text-gray-300 transition-colors"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Compact version for inline use
export function ChatRoomCompact({ orderId, messageCount = 0, hasUnread = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
        hasUnread 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <div className="relative">
        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
          💬
        </div>
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </div>
      <span className="text-sm text-gray-700">
        Chat {messageCount > 0 && `(${messageCount})`}
      </span>
    </button>
  )
}