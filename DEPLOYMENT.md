# 🚀 **DEPLOYMENT GUIDE**

## 🌐 **FRONTEND DEPLOYMENT** 

### **Vercel (Current Setup)**
- **Auto-deploys** from GitHub main branch
- **Domain**: https://pacothechicken.xyz
- **Build**: Static files from root directory

### **Environment Variables in Vercel**
```bash
TWITTER_CLIENT_ID=N3BYdkxPZFJIS1lmSzkyRUJkcUM6MTpjaQ
TWITTER_CLIENT_SECRET=W9nOOIEQ5XOG-08XKGCLa5xj2gtLEJO9yZIC-z9_FXnrTmEw_-
TWITTER_REDIRECT_URI=https://pacothechicken.xyz/auth/callback
NEXT_PUBLIC_SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WALLETCONNECT_PROJECT_ID=1e3c0a8da83dc6e1810db1a0637970ad
```

## 🖥️ **BACKEND DEPLOYMENT**

### **Render (Current Setup)**
- **Service**: Web Service
- **Repo**: GitHub auto-deploy
- **Start Command**: `node server.js`
- **URL**: https://paco-x57j.onrender.com

### **Environment Variables in Render**
```bash
# All frontend vars above PLUS:
CORS_ORIGIN=https://pacothechicken.xyz
HOUSE_WALLET_ADDRESS=0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a
HOUSE_WALLET_PRIVATE_KEY=07ddef36f9e1b64485acf5d9ae86c9120efb031aec27905869388a124205a4d5
ABSTRACT_NETWORK=mainnet
JWT_SECRET=paco-super-secret-jwt-key-2025
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🗄️ **DATABASE SETUP**

### **Supabase Configuration**
1. **Create project** at https://supabase.com
2. **Copy Project URL** and **anon key** 
3. **Get service role key** from Settings → API
4. **Run SQL schema**:
   ```sql
   -- Copy entire contents of crash-casino-database-schema-abstract.sql
   -- Paste in Supabase SQL Editor and run
   ```

### **Required Tables**
- `game_scores` - Jump game leaderboards
- `crash_bets` - Casino betting history  
- `crash_rounds` - Casino game rounds
- `chat_messages` - Real-time chat
- `user_profiles` - Twitter-linked profiles

## 🔧 **CRASH CASINO SPECIFIC**

### **WebSocket Connection**
- **Frontend connects to**: `https://paco-x57j.onrender.com`
- **Protocol**: WebSocket over HTTPS (wss://)
- **Path**: `/crash-ws`

### **Wallet Integration**
- **Network**: Abstract L2 mainnet
- **House Wallet**: Real ETH transactions
- **Supported**: MetaMask, WalletConnect, Abstract Global Wallet

### **Testing Real Transactions**
1. **Connect wallet** with Abstract ETH
2. **Place small bet** (0.001 ETH minimum)
3. **Verify transaction** on Abstract explorer
4. **Check house wallet** receives funds

## 🚨 **TROUBLESHOOTING**

### **Common Issues**
| Problem | Solution |
|---------|----------|
| WebSocket fails | Check Render backend is running |
| Wallet won't connect | Verify WalletConnect Project ID |
| Database errors | Check Supabase service role key |
| Twitter auth fails | Verify client secret and redirect URI |
| Crash casino 404 | Ensure path: `/crash-casino/frontend/pacorocko.html` |

### **Health Checks**
- **Backend**: https://paco-x57j.onrender.com/health
- **Database**: Supabase dashboard → Table Editor
- **Frontend**: https://pacothechicken.xyz

### **Logs**
- **Render**: Dashboard → Logs tab
- **Vercel**: Dashboard → Functions tab
- **Browser**: F12 → Console tab

## 🔄 **DEPLOYMENT FLOW**

### **For Code Changes**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
- **Vercel** auto-deploys frontend
- **Render** auto-deploys backend

### **For Environment Variables**
- **Vercel**: Settings → Environment Variables
- **Render**: Settings → Environment

### **For Database Changes**
- **Run SQL** in Supabase SQL Editor
- **Test** with health check endpoints

---

**🎯 Current Status: Production Ready**