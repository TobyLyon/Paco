import React, { useState, useEffect } from 'react'
import { ExternalLinkIcon, VerifiedIcon, UserIcon } from '@heroicons/react/outline'

/**
 * TwitterProfileCard - Display user's Twitter profile for identity verification
 * Used in trades to show user credibility and social proof
 */
export default function TwitterProfileCard({ 
  walletAddress, 
  twitterHandle, 
  displayName,
  verified = false,
  followerCount = 0,
  size = 'default', // 'small', 'default', 'large'
  showMetrics = true,
  className = ''
}) {
  const [imageError, setImageError] = useState(false)
  const [profileData, setProfileData] = useState(null)

  // Fetch Twitter profile data if not provided
  useEffect(() => {
    if (twitterHandle && !profileData) {
      // In production, this would fetch from Twitter API or cached data
      // For now, use mock data
      setProfileData({
        displayName: displayName || twitterHandle,
        verified,
        followerCount,
        pfpUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${twitterHandle}`
      })
    }
  }, [twitterHandle, displayName, verified, followerCount, profileData])

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  const cardSizeClasses = {
    small: 'p-2',
    default: 'p-3',
    large: 'p-4'
  }

  if (!twitterHandle && !walletAddress) {
    return (
      <div className={`flex items-center space-x-2 ${cardSizeClasses[size]} bg-gray-100 rounded-lg ${className}`}>
        <UserIcon className={`${sizeClasses[size]} text-gray-400`} />
        <span className="text-sm text-gray-500">Anonymous User</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${cardSizeClasses[size]} bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Profile Picture */}
      <div className="relative">
        {!imageError && profileData?.pfpUrl ? (
          <img
            src={profileData.pfpUrl}
            alt={`${twitterHandle || 'User'} profile`}
            className={`${sizeClasses[size]} rounded-full object-cover`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center`}>
            <UserIcon className="w-1/2 h-1/2 text-white" />
          </div>
        )}
        
        {verified && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <VerifiedIcon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {profileData?.displayName || twitterHandle || `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}
          </h3>
          {verified && <VerifiedIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
        </div>
        
        {twitterHandle && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>@{twitterHandle}</span>
            {showMetrics && followerCount > 0 && (
              <>
                <span>•</span>
                <span>{followerCount.toLocaleString()} followers</span>
              </>
            )}
          </div>
        )}
        
        {walletAddress && (
          <div className="text-xs text-gray-400 font-mono">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
        )}
      </div>

      {/* External Link */}
      {twitterHandle && (
        <a
          href={`https://twitter.com/${twitterHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

// Helper component for displaying multiple users
export function TwitterProfileStack({ users = [], maxVisible = 3, size = 'small' }) {
  const visibleUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <div key={user.walletAddress || user.twitterHandle || index} className="relative">
            <TwitterProfileCard
              {...user}
              size={size}
              showMetrics={false}
              className="border-2 border-white"
            />
          </div>
        ))}
      </div>
      
      {remainingCount > 0 && (
        <span className="text-sm text-gray-500">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}