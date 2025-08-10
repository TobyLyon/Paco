# 🛠️ RENDER DEBUGGING CHECKLIST

## **STEP 1: Environment Variables Audit**

### **Required Environment Variables for Render**
Check that ALL of these are set in Render Settings → Environment:

```bash
# Core Application
NODE_ENV=production
PORT=3001
JWT_SECRET=paco-super-secret-jwt-key-2025

# CORS & Security
CORS_ORIGIN=https://pacothechicken.xyz

# Supabase Configuration
SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Abstract Wallet Integration
HOUSE_WALLET_ADDRESS=0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a
HOUSE_WALLET_PRIVATE_KEY=07ddef36f9e1b64485acf5d9ae86c9120efb031aec27905869388a124205a4d5
ABSTRACT_NETWORK=mainnet
WALLETCONNECT_PROJECT_ID=1e3c0a8da83dc6e1810db1a0637970ad

# Twitter OAuth
TWITTER_CLIENT_ID=N3BYdkxPZFJIS1lmSzkyRUJkcUM6MTpjaQ
TWITTER_CLIENT_SECRET=W9nOOIEQ5XOG-08XKGCLa5xj2gtLEJO9yZIC-z9_FXnrTmEw_-
TWITTER_REDIRECT_URI=https://pacothechicken.xyz/auth/callback
```

## **STEP 2: Critical File Path Verification**

### **Check these files exist on Render**
```bash
/crash-casino/backend/src/game-engine-compiled.js
/crash-casino/backend/src/websocket-server-compiled.js
/crash-casino/backend/wallet-integration-abstract.js
/crash-casino/backend/house-wallet.js
```

## **STEP 3: Database Connection Test**

### **Test Supabase Connection**
```javascript
// Add this to server.js for debugging
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test connection on startup
supabase.from('crash_rounds').select('count').then(result => {
    console.log('✅ Supabase connected:', result);
}).catch(error => {
    console.error('❌ Supabase connection failed:', error);
});
```

## **STEP 4: WebSocket Path Verification**

### **Verify WebSocket endpoint works**
Test these URLs:
- ✅ https://paco-x57j.onrender.com/health
- ✅ wss://paco-x57j.onrender.com/crash-ws

## **STEP 5: Module Loading Debug**

### **Add Debug Logging to production-integration.js**
```javascript
console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 Available files:', require('fs').readdirSync('./crash-casino/backend/src/'));
console.log('🔍 Environment variables loaded:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
```

## **STEP 6: Wallet Integration Test**

### **Test Abstract Wallet Connection**
```javascript
// Add to wallet initialization
const houseWallet = getHouseWallet();
console.log('🏦 House wallet loaded:', houseWallet ? 'SUCCESS' : 'FAILED');
console.log('🏦 Wallet address:', houseWallet?.address);
console.log('🌐 Network:', process.env.ABSTRACT_NETWORK);
```

## **STEP 7: Dependencies Version Check**

### **Check Node.js version compatibility**
- Render Node.js version: Should be >= 16 (check package.json engines)
- Local Node.js version: `node --version`
- Dependency conflicts: Check package-lock.json

## **STEP 8: Static File Serving**

### **Verify frontend file access**
Test these paths work:
- ✅ https://pacothechicken.xyz/pacorocko
- ✅ https://pacothechicken.xyz/crash-casino/frontend/pacorocko.html

## **KNOWN FIXES**

### **Fix 1: Environment Variable Names**
Some variables have different names in different contexts:
```bash
# Frontend needs:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Backend needs:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### **Fix 2: Cache Clearing Issues**
The production-integration.js already includes cache clearing, but may need:
```javascript
// Clear ALL related cache
const modulePatterns = [
    './backend/src/game-engine-compiled.js',
    './backend/src/websocket-server-compiled.js',
    './backend/wallet-integration-abstract.js',
    './backend/wallet-integration.js',
    './backend/house-wallet.js'
];

modulePatterns.forEach(pattern => {
    try {
        delete require.cache[require.resolve(pattern)];
    } catch (e) {
        console.log(`⚠️ Could not clear cache for ${pattern}`);
    }
});
```

### **Fix 3: WebSocket CORS Headers**
```javascript
// In websocket server setup
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/crash-ws'
});
```

### **Fix 4: Database Schema Issues**
Make sure crash_rounds table exists:
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('crash_rounds', 'crash_bets', 'crash_payouts');
```

## **DEBUGGING COMMANDS**

### **Local vs Production Comparison**
```bash
# Local
npm run dev
# Check: http://localhost:3000/health

# Production equivalent
curl https://paco-x57j.onrender.com/health
```

### **Log Analysis**
In Render Dashboard → Logs, look for:
- ❌ Module not found errors
- ❌ Environment variable undefined
- ❌ Database connection timeouts
- ❌ WebSocket connection failures
- ❌ CORS policy violations

### **Browser Console Checks**
```javascript
// In browser console
console.log('WebSocket URL:', window.location.hostname);
console.log('Socket connection:', crashGameClient?.socket?.connected);
console.log('Environment detected:', window.location.hostname === 'localhost' ? 'local' : 'production');
```
