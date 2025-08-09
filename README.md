# 🐔 **PACO THE CHICKEN** - Complete Ecosystem

> **Paco memecoin ecosystem on Abstract L2 with PFP generator, jump game, and crash casino**

## 🚀 **QUICK START**

### **Development**
```bash
npm install
npm start                    # Start main site (localhost:3000)
```

### **Production**
- **Frontend**: Auto-deploys to Vercel from GitHub
- **Backend**: Deployed on Render at `https://paco-x57j.onrender.com`

## 🎮 **APPLICATIONS**

### **1. PFP Generator & Restaurant** 
- **File**: `index.html` + `script.js`
- **Features**: Interactive chicken customization with 20+ hats and items
- **Theme**: Restaurant ordering system

### **2. Paco Jump Game**
- **File**: `game.js` + `game-physics.js`  
- **Features**: Doodle Jump-style platformer with Twitter leaderboards
- **Controls**: Arrow keys (desktop) or tap (mobile)

### **3. PacoRocko Crash Casino**
- **Location**: `crash-casino/frontend/pacorocko.html`
- **Backend**: Node.js + Socket.IO + Abstract wallet integration
- **Features**: Provably fair multiplayer crash gambling

### **4. NFT-Gated Farm Game**
- **Files**: `src/App.jsx` + Phaser.js scenes
- **Features**: React + Phaser.js chicken farming simulation

## 🔧 **TECHNICAL SETUP**

### **Environment Variables**
```bash
# Twitter OAuth
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret

# Supabase Database  
NEXT_PUBLIC_SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Abstract L2 Wallet
HOUSE_WALLET_ADDRESS=0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a
HOUSE_WALLET_PRIVATE_KEY=your_private_key
ABSTRACT_NETWORK=mainnet
WALLETCONNECT_PROJECT_ID=your_project_id
```

### **Database Setup**
1. Create Supabase project
2. Run `crash-casino-database-schema-abstract.sql` in SQL Editor
3. Configure Row Level Security policies

### **Crash Casino Deployment**
1. Deploy `server.js` to Render with environment variables
2. Update WebSocket URL in `crash-casino/frontend/js/crash-client.js`
3. Test at your domain + `/crash-casino/frontend/pacorocko.html`

## 📁 **PROJECT STRUCTURE**

```
PACOTHECHICKEN/
├── index.html              # Main PFP generator
├── script.js               # PFP logic  
├── game.js                 # Jump game engine
├── server.js               # Production backend entry
├── assets/                 # Game assets (hats, items)
├── crash-casino/           # Crash gambling game
│   ├── frontend/pacorocko.html
│   ├── backend/src/        # TypeScript game engine
│   └── production-integration.js
├── src/                    # React farm game
│   ├── App.jsx
│   └── components/
└── api/twitter/            # Twitter OAuth handlers
```

## 🛡️ **SECURITY**

- ✅ **Private keys**: Secured in environment variables only
- ✅ **No hardcoded credentials**: All sensitive data uses env vars
- ✅ **Provably fair**: Crash casino uses verifiable randomness
- ✅ **Real transactions**: Direct ETH transfers on Abstract L2

## 🎯 **LIVE URLS**

- **Main Site**: https://pacothechicken.xyz
- **PFP Generator**: https://pacothechicken.xyz (default tab)
- **Jump Game**: https://pacothechicken.xyz (game tab)  
- **Crash Casino**: https://pacothechicken.xyz/crash-casino/frontend/pacorocko.html
- **Backend API**: https://paco-x57j.onrender.com

---

**Built with 🐔 by the Paco team on Abstract L2**