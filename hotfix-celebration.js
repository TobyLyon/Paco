/**
 * 🔥 HOTFIX: Add missing celebration event handlers
 * This fixes the missing balanceWinnings and cashoutSuccess event handlers
 */

// Wait for the crash game client to be ready
let celebrationRetryCount = 0;
const MAX_CELEBRATION_RETRIES = 30; // 30 seconds max wait

function addCelebrationHandlers() {
    celebrationRetryCount++;
    
    if (!window.crashGameClient?.socket) {
        if (celebrationRetryCount >= MAX_CELEBRATION_RETRIES) {
            console.warn('⏰ HOTFIX: Timeout waiting for crash game client, proceeding without celebration handlers');
            return;
        }
        console.log(`⏳ Waiting for crash game client... (${celebrationRetryCount}/${MAX_CELEBRATION_RETRIES})`);
        setTimeout(addCelebrationHandlers, 1000);
        return;
    }

    console.log('🔥 HOTFIX: Adding celebration event handlers');

    // Add balanceWinnings handler
    window.crashGameClient.socket.on('balanceWinnings', (data) => {
        console.log('💰 HOTFIX: Balance winnings received from server:', data);
        console.log('🎊 HOTFIX: Triggering celebration for balance winnings');
        
        if (window.betInterface && window.betInterface.handleSuccessfulCashout) {
            window.betInterface.handleSuccessfulCashout(data);
        } else {
            // Fallback celebration
            showFallbackCelebration(data);
        }
    });

    // Add cashoutSuccess handler  
    window.crashGameClient.socket.on('cashoutSuccess', (data) => {
        console.log('💰 HOTFIX: Cashout success received:', data);
        console.log('🎊 HOTFIX: Triggering celebration for cashout success');
        
        if (window.betInterface && window.betInterface.handleSuccessfulCashout) {
            window.betInterface.handleSuccessfulCashout(data);
        } else {
            // Fallback celebration
            showFallbackCelebration(data);
        }
    });

    console.log('✅ HOTFIX: Celebration handlers added successfully');
}

// Fallback celebration if bet interface method doesn't exist
function showFallbackCelebration(data) {
    const winnings = data.payout || data.winnings || 0;
    const multiplier = data.multiplier || 0;
    
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        background: linear-gradient(45deg, #10b981, #fbbf24);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
        animation: cashoutPop 3s ease-out forwards;
        pointer-events: none;
        text-align: center;
        color: white;
        font-family: sans-serif;
    `;
    
    celebration.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">CASHED OUT!</div>
        <div style="font-size: 32px; font-weight: bold; color: #fbbf24; margin-bottom: 5px;">${multiplier.toFixed(2)}x</div>
        <div style="font-size: 18px; opacity: 0.9;">+${winnings.toFixed(4)} ETH</div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes cashoutPop {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(celebration);
    
    // Remove after animation
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, 3000);
    
    console.log(`🎊 HOTFIX: Fallback celebration shown for ${multiplier.toFixed(2)}x cashout`);
}

// Start the hotfix
addCelebrationHandlers();
