import React from 'react'

export default function LoadingScreen({ message = "Loading Paco's Farm..." }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo-container">
          <img src="/PACO-THE-CHICKEN.png" alt="Paco Loading" className="loading-chicken" />
          <div className="loading-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
        </div>
        {message && (
          <div className="loading-message">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}