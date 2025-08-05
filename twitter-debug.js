// Twitter Authentication Diagnostic Script
// Run this in browser console to debug authentication issues

function runTwitterDiagnostics() {
    console.log('🔍 TWITTER AUTHENTICATION DIAGNOSTICS');
    console.log('=====================================');
    
    // 1. Check environment injection
    console.log('\n1. 🌍 Environment Configuration:');
    const metaTag = document.querySelector('meta[name="twitter-client-id"]');
    const clientIdFromMeta = metaTag ? metaTag.getAttribute('content') : 'NOT FOUND';
    console.log('   Meta tag content:', clientIdFromMeta);
    
    if (clientIdFromMeta === '__TWITTER_CLIENT_ID__') {
        console.error('   ❌ Placeholder not replaced! Build process failed.');
        console.log('   💡 Run: npm run build');
        console.log('   💡 Ensure .env file exists with TWITTER_CLIENT_ID');
    } else if (clientIdFromMeta === 'NOT FOUND') {
        console.error('   ❌ Meta tag missing! HTML file corrupted.');
    } else if (!clientIdFromMeta) {
        console.error('   ❌ Empty client ID! Environment variable not set.');
    } else {
        console.log('   ✅ Client ID found in meta tag');
    }
    
    // 2. Check Twitter Auth module
    console.log('\n2. 🐦 Twitter Auth Module:');
    if (typeof twitterAuth !== 'undefined') {
        console.log('   ✅ TwitterAuth module loaded');
        console.log('   Config:', {
            clientId: twitterAuth.config.clientId ? 'SET' : 'NOT SET',
            redirectUri: twitterAuth.config.redirectUri,
            scopes: twitterAuth.config.scopes
        });
        console.log('   Authenticated:', twitterAuth.authenticated);
        if (twitterAuth.user) {
            console.log('   User:', twitterAuth.user);
        }
    } else {
        console.error('   ❌ TwitterAuth module not found!');
    }
    
    // 3. Check API endpoints
    console.log('\n3. 🔗 API Endpoints:');
    const currentDomain = window.location.origin;
    console.log('   Current domain:', currentDomain);
    console.log('   Token endpoint:', `${currentDomain}/api/twitter/token`);
    console.log('   User endpoint:', `${currentDomain}/api/twitter/user`);
    
    // 4. Test API availability
    console.log('\n4. 🧪 Testing API Availability:');
    
    // Test debug endpoint (only available in development)
    fetch('/api/twitter/debug')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 404) {
                console.log('   ℹ️ Debug endpoint not available (production mode)');
                return null;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        })
        .then(data => {
            if (data) {
                console.log('   ✅ Debug endpoint response:', data);
            }
        })
        .catch(error => {
            console.error('   ❌ Debug endpoint failed:', error);
        });
    
    // 5. Check for common issues
    console.log('\n5. 🔧 Common Issues Check:');
    
    // Check if popup blockers might be an issue
    const popup = window.open('', 'test', 'width=1,height=1');
    if (popup) {
        popup.close();
        console.log('   ✅ Popup windows allowed');
    } else {
        console.warn('   ⚠️  Popup windows may be blocked');
    }
    
    // Check HTTPS/HTTP
    if (window.location.protocol === 'https:') {
        console.log('   ✅ Using HTTPS');
    } else {
        console.warn('   ⚠️  Using HTTP - some features may not work');
    }
    
    // 6. Environment detection
    console.log('\n6. 🌐 Environment Detection:');
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('   🏠 Development environment detected');
        console.log('   Expected redirect:', `http://${hostname}:${window.location.port || '3000'}/auth/callback`);
    } else {
        console.log('   🌍 Production environment detected');
        console.log('   Expected redirect:', 'https://pacothechicken.xyz/auth/callback');
    }
    
    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('=====================================');
    
    return {
        clientIdFromMeta,
        twitterAuthLoaded: typeof twitterAuth !== 'undefined',
        currentDomain,
        environment: hostname === 'localhost' ? 'development' : 'production'
    };
}

// Auto-run diagnostics when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTwitterDiagnostics);
} else {
    runTwitterDiagnostics();
}

// Make function available globally
window.runTwitterDiagnostics = runTwitterDiagnostics;

console.log('🔧 Twitter diagnostic script loaded. Run runTwitterDiagnostics() anytime.');