// ===== MOBILE AUTHENTICATION STUCK DEBUG SCRIPT =====
// Debug script for mobile authentication getting stuck after successful login
// Run this in browser console when authentication is stuck

/**
 * Mobile Authentication Stuck Debugger
 */
class MobileAuthStuckDebugger {
    constructor() {
        this.authData = null;
        this.currentUrl = window.location.href;
        this.isCallback = window.location.pathname.includes('callback');
    }

    // Check if we're currently stuck on the callback page
    checkIfStuck() {
        console.log('🔍 CHECKING IF AUTHENTICATION IS STUCK...');
        console.log('📍 Current URL:', this.currentUrl);
        console.log('📱 Is callback page:', this.isCallback);
        
        if (this.isCallback) {
            console.log('⚠️ YOU ARE STUCK ON THE CALLBACK PAGE');
            this.analyzeStuckState();
        } else {
            console.log('✅ Not stuck - you are on the main game page');
            this.checkForStoredAuth();
        }
    }

    // Analyze why we might be stuck
    analyzeStuckState() {
        console.log('\n🧪 ANALYZING STUCK STATE...');
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');
        
        console.log('📊 URL Parameters:', {
            code: code ? 'PRESENT' : 'MISSING',
            error: error || 'NONE',
            state: state ? 'PRESENT' : 'MISSING'
        });
        
        // Check localStorage
        const storedCode = localStorage.getItem('twitter_auth_code');
        const storedState = localStorage.getItem('twitter_auth_state_mobile');
        const storedTimestamp = localStorage.getItem('twitter_auth_timestamp');
        
        console.log('💾 LocalStorage Data:', {
            authCode: storedCode ? 'STORED' : 'MISSING',
            authState: storedState ? 'STORED' : 'MISSING',
            timestamp: storedTimestamp ? new Date(parseInt(storedTimestamp)).toLocaleString() : 'MISSING'
        });
        
        // Check window opener
        const hasOpener = window.opener && !window.opener.closed;
        console.log('🪟 Window Opener:', hasOpener ? 'AVAILABLE' : 'NOT AVAILABLE');
        
        // Check device detection
        this.checkDeviceDetection();
        
        // Provide solutions
        this.provideSolutions(code, error);
    }

    // Check device detection logic
    checkDeviceDetection() {
        console.log('\n📱 DEVICE DETECTION ANALYSIS:');
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isLikelyMobile = window.innerWidth < window.innerHeight;
        const hasTouch = navigator.maxTouchPoints > 0;
        const hasOpener = window.opener && !window.opener.closed;
        
        const forceMobileForDevices = isMobile || (isSmallScreen && isTouchDevice);
        const isMobileFlow = forceMobileForDevices || !hasOpener;
        
        console.log('🔍 Detection Results:', {
            userAgent: navigator.userAgent.substring(0, 80) + '...',
            isMobile,
            isSmallScreen,
            isTouchDevice,
            isLikelyMobile,
            hasTouch,
            hasOpener,
            forceMobileForDevices,
            isMobileFlow,
            expectedFlow: isMobileFlow ? 'MOBILE_REDIRECT' : 'DESKTOP_POPUP'
        });
    }

    // Provide solutions based on the situation
    provideSolutions(code, error) {
        console.log('\n🛠️ SOLUTIONS TO TRY:');
        
        if (error) {
            console.log('❌ Authentication Error Detected:', error);
            console.log('💡 Solution: Close this window and try authenticating again');
            console.log('🔧 Run: mobileFix.forceClose()');
        } else if (code) {
            console.log('✅ Authentication Code Found - should have redirected');
            console.log('💡 Solutions:');
            console.log('   1. Force immediate redirect: mobileFix.forceRedirect()');
            console.log('   2. Force close window: mobileFix.forceClose()');
            console.log('   3. Manual redirect: mobileFix.manualRedirect()');
            console.log('   4. Store auth and redirect: mobileFix.storeAndRedirect()');
        } else {
            console.log('⚠️ No authentication code found');
            console.log('💡 Solutions:');
            console.log('   1. Force redirect to home: mobileFix.forceRedirect()');
            console.log('   2. Restart authentication: Close window and try again');
        }
    }

    // Check for stored authentication data
    checkForStoredAuth() {
        console.log('\n💾 CHECKING FOR STORED AUTHENTICATION...');
        
        const storedCode = localStorage.getItem('twitter_auth_code');
        const storedTimestamp = localStorage.getItem('twitter_auth_timestamp');
        
        if (storedCode && storedTimestamp) {
            const timestamp = parseInt(storedTimestamp);
            const age = Date.now() - timestamp;
            const ageMinutes = Math.floor(age / (1000 * 60));
            
            console.log('✅ Found stored authentication data:');
            console.log('📅 Age:', ageMinutes, 'minutes');
            console.log('🔧 Run: mobileFix.processStoredAuth() to process it');
            
            if (ageMinutes > 5) {
                console.log('⚠️ Auth data is old, may need to re-authenticate');
            }
        } else {
            console.log('❌ No stored authentication data found');
        }
    }

    // Force redirect back to game
    forceRedirect() {
        console.log('🚀 FORCING REDIRECT TO GAME...');
        
        // Multiple redirect strategies
        const strategies = [
            () => { window.location.href = '/'; },
            () => { window.location.replace('/'); },
            () => { window.location.assign('/'); },
            () => { window.location = '/'; },
            () => { window.location.href = window.location.origin; }
        ];
        
        let strategyIndex = 0;
        const tryRedirect = () => {
            if (strategyIndex < strategies.length) {
                console.log(`📱 Redirect strategy ${strategyIndex + 1}/${strategies.length}`);
                try {
                    strategies[strategyIndex]();
                } catch (error) {
                    console.log(`❌ Strategy ${strategyIndex + 1} failed:`, error.message);
                    strategyIndex++;
                    setTimeout(tryRedirect, 500);
                }
            } else {
                console.log('❌ All redirect strategies failed');
                console.log('💡 Try manually navigating to the home page');
            }
        };
        
        tryRedirect();
    }

    // Force close window
    forceClose() {
        console.log('🚪 FORCING WINDOW CLOSE...');
        
        const closeMethods = [
            () => window.close(),
            () => window.self.close(),
            () => window.top.close()
        ];
        
        closeMethods.forEach((method, index) => {
            setTimeout(() => {
                try {
                    console.log(`🚪 Close attempt ${index + 1}`);
                    method();
                } catch (error) {
                    console.log(`❌ Close method ${index + 1} failed:`, error.message);
                }
            }, index * 500);
        });
        
        // If close fails, redirect
        setTimeout(() => {
            console.log('🔄 Close failed, trying redirect...');
            this.forceRedirect();
        }, 2000);
    }

    // Store auth data and redirect
    storeAndRedirect() {
        console.log('💾 STORING AUTH DATA AND REDIRECTING...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code) {
            // Store auth data
            localStorage.setItem('twitter_auth_code', code);
            localStorage.setItem('twitter_auth_state_mobile', state || '');
            localStorage.setItem('twitter_auth_timestamp', Date.now().toString());
            
            console.log('✅ Stored authentication data');
            console.log('🚀 Redirecting to game...');
            
            this.forceRedirect();
        } else {
            console.log('❌ No authentication code to store');
            this.forceRedirect();
        }
    }

    // Process stored authentication
    processStoredAuth() {
        console.log('⚙️ PROCESSING STORED AUTHENTICATION...');
        
        if (typeof window.TwitterAuth !== 'undefined') {
            try {
                window.TwitterAuth.checkMobileAuthCallback();
                console.log('✅ Triggered mobile auth callback processing');
            } catch (error) {
                console.log('❌ Failed to process auth callback:', error.message);
            }
        } else {
            console.log('❌ TwitterAuth not available');
        }
    }

    // Manual redirect with user confirmation
    manualRedirect() {
        const userConfirm = confirm('Redirect back to the game now?');
        if (userConfirm) {
            this.forceRedirect();
        } else {
            console.log('🤷‍♂️ User cancelled manual redirect');
        }
    }

    // Emergency reset - clear all auth data
    emergencyReset() {
        console.log('🚨 EMERGENCY RESET - CLEARING ALL AUTH DATA...');
        
        const authKeys = [
            'twitter_auth_code',
            'twitter_auth_state_mobile',
            'twitter_auth_timestamp',
            'twitter_auth_state'
        ];
        
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Cleared: ${key}`);
        });
        
        console.log('✅ All authentication data cleared');
        console.log('🔄 Redirecting to home page...');
        
        setTimeout(() => {
            this.forceRedirect();
        }, 1000);
    }

    // Full diagnostic report
    fullDiagnostic() {
        console.log('🔬 FULL MOBILE AUTH DIAGNOSTIC REPORT');
        console.log('=' .repeat(50));
        
        this.checkIfStuck();
        
        console.log('\n📊 BROWSER INFORMATION:');
        console.log('User Agent:', navigator.userAgent);
        console.log('Screen Size:', `${window.screen.width}x${window.screen.height}`);
        console.log('Window Size:', `${window.innerWidth}x${window.innerHeight}`);
        console.log('Touch Points:', navigator.maxTouchPoints);
        console.log('Standalone:', window.navigator.standalone);
        
        console.log('\n🔧 AVAILABLE FIXES:');
        console.log('mobileFix.forceRedirect() - Force redirect to game');
        console.log('mobileFix.forceClose() - Force close window');
        console.log('mobileFix.storeAndRedirect() - Store auth data and redirect');
        console.log('mobileFix.emergencyReset() - Clear all auth data and redirect');
        console.log('mobileFix.manualRedirect() - Manual redirect with confirmation');
    }
}

// Create global instance for easy access
window.MobileAuthStuckDebugger = MobileAuthStuckDebugger;
window.mobileAuthDebugger = new MobileAuthStuckDebugger();

// Export convenient functions
window.mobileFix = {
    check() {
        return mobileAuthDebugger.checkIfStuck();
    },
    
    forceRedirect() {
        return mobileAuthDebugger.forceRedirect();
    },
    
    forceClose() {
        return mobileAuthDebugger.forceClose();
    },
    
    storeAndRedirect() {
        return mobileAuthDebugger.storeAndRedirect();
    },
    
    processStoredAuth() {
        return mobileAuthDebugger.processStoredAuth();
    },
    
    manualRedirect() {
        return mobileAuthDebugger.manualRedirect();
    },
    
    emergencyReset() {
        return mobileAuthDebugger.emergencyReset();
    },
    
    fullDiagnostic() {
        return mobileAuthDebugger.fullDiagnostic();
    }
};

// Auto-run diagnostic if we're on callback page
if (window.location.pathname.includes('callback')) {
    console.log('🚨 MOBILE AUTH CALLBACK DETECTED - RUNNING AUTO-DIAGNOSTIC...');
    setTimeout(() => {
        mobileAuthDebugger.fullDiagnostic();
        console.log('\n🛠️ QUICK FIXES:');
        console.log('If stuck, try: mobileFix.forceRedirect()');
        console.log('Emergency reset: mobileFix.emergencyReset()');
    }, 1000);
} else {
    console.log('🧪 Mobile authentication debugger loaded!');
    console.log('🧪 Run: mobileFix.check() to check authentication status');
    console.log('🧪 Run: mobileFix.fullDiagnostic() for complete analysis');
}

console.log('🛠️ Mobile authentication stuck debugger ready!');
console.log('🚨 If authentication is stuck, run: mobileFix.forceRedirect()');