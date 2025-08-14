# 🎰 PACO ROCKO CRASH CASINO - COMPLETE SYSTEM OVERVIEW & INDEX

## 🎯 **EXECUTIVE SUMMARY**

**Status: PRODUCTION READY** ✅  
**Last Updated**: January 2025  
**Deployment**: Live at https://pacothechicken.xyz/pacorocko  
**Backend**: https://paco-x57j.onrender.com  

### 🚀 **Core Achievement: Perfect Sync Solution**
The system has successfully implemented a **UNIFIED SYNC ARCHITECTURE** that eliminates the dual-system conflicts that were causing sync issues. The server now maintains complete authority over game timing and state, while the frontend operates as a pure display layer.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **1. UNIFIED GAME ENGINE (Backend Authority)**
- **File**: `crash-casino/backend/unified-crash-engine.js`
- **Purpose**: Single source of truth for all game logic
- **Timing**: 15s betting → variable game → 3s cashout phases
- **Features**:
  - Provably fair RNG with commit-reveal scheme
  - Perfect multiplier calculation: `1.0024 * Math.pow(1.0718, elapsed)`
  - Server-authoritative crash points
  - Real-time countdown synchronization

### **2. FRONTEND CLIENT (Pure Display Layer)**
- **File**: `crash-casino/frontend/js/unified-crash-client.js`
- **Purpose**: React-only display that listens to server events
- **Events**: Responds to `start_betting_phase`, `start_multiplier_count`, `stop_multiplier_count`
- **Features**:
  - Smooth multiplier animation
  - Real-time betting interface
  - Chart.js visualization

### **3. PRODUCTION INTEGRATION**
- **File**: `crash-casino/unified-production-integration.js`
- **Purpose**: Orchestrates the entire crash casino system
- **Features**:
  - Socket.IO server with CORS configuration
  - Wallet integration management
  - Player connection handling
  - Statistics tracking

---

## 💰 **DEPOSIT & WITHDRAWAL SYSTEM**

### **Three-Wallet Architecture** 🏦

#### **1. House Wallet (Cold Storage)**
- **Address**: `0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a`
- **Purpose**: Receives all user deposits
- **Security**: No private key on server (manual access only)
- **Monitoring**: Check via `/admin/wallet-status`

#### **2. Hot Wallet (Operational)**
- **Address**: `0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF`
- **Purpose**: Automated payouts and withdrawals
- **Target Balance**: 0.5 - 5.0 ETH
- **Security**: Private key on server for automated operations

#### **3. Safe Wallet (Deep Cold Storage)**
- **Address**: `0x7A4223A412e455821c4D9480A80fcC0624924c27`
- **Purpose**: Long-term storage of excess funds
- **Security**: Maximum security (multisig recommended)

### **Balance-Based Betting System** 💳

#### **Frontend**: `crash-casino/frontend/js/balance-system.js`
- User deposits ETH to house wallet
- Instant betting without transaction delays
- Real-time balance updates
- Automatic deposit detection

#### **Backend**: `crash-casino/backend/balance-api.js`
- Database-backed balance management
- In-memory cache for fast access
- Deposit processing and attribution
- Withdrawal handling via hot wallet

#### **Deposit Indexer**: `crash-casino/backend/deposit-indexer.js`
- Scans Abstract L2 blocks for deposits
- Automatic balance crediting
- Duplicate prevention
- Professional attribution system

### **Fund Flow Operations** 📊
1. **Deposits** → House Wallet (automatic)
2. **Payouts** ← Hot Wallet (automatic)
3. **Transfers**: House → Hot (when < 0.5 ETH)
4. **Security**: Hot → Safe (when > 5.0 ETH)

---

## 🎮 **GAME ENGINE DETAILS**

### **Crash Point Generation** 🎲
- **Algorithm**: Industry-standard provably fair
- **Formula**: `Math.floor((100 * (1 - houseEdge)) / Math.max(r, 1e-12)) / 100`
- **House Edge**: 1%
- **Range**: 1.00x to 1000.00x
- **Verification**: GET `/proof/:roundId`

### **Multiplier Calculation** 📈
- **Real-time Formula**: `1.0024 * Math.pow(1.0718, time_elapsed)`
- **Update Interval**: Every second
- **Synchronization**: Server-authoritative timing
- **Display**: Smooth client-side animation

### **Phase Management** ⏱️
1. **Betting Phase**: 15 seconds (user-requested timing)
2. **Game Phase**: Variable duration until crash
3. **Cashout Phase**: 3 seconds (proven timing)

---

## 🌐 **WALLET INTEGRATION**

### **Abstract L2 Integration** ⛓️
- **File**: `crash-casino/backend/wallet-integration-abstract.js`
- **Network**: Abstract L2 Mainnet (Chain ID: 2741)
- **RPC**: `https://api.mainnet.abs.xyz`
- **Features**:
  - Player authentication with signature verification
  - ETH balance checking
  - Automated payout processing
  - Transaction monitoring

### **Supported Wallets** 👛
- **MetaMask**: Primary wallet integration
- **WalletConnect**: Multi-wallet support
- **Abstract Global Wallet (AGW)**: Email/passkey authentication
- **EOA Wallets**: Standard Ethereum wallets

### **Transaction Flow** 📋
1. **Player Authentication**: Signature verification
2. **Bet Placement**: Balance-based (no transaction required)
3. **Payout Processing**: Automated via hot wallet
4. **Withdrawal Requests**: Manual processing via API

---

## 📱 **FRONTEND COMPONENTS**

### **Main Interface** 🎨
- **File**: `crash-casino/frontend/pacorocko.html`
- **Framework**: Vanilla JavaScript with modern UI
- **Libraries**: Socket.IO, Chart.js, Ethers.js v6
- **Features**:
  - Real-time multiplier display
  - Interactive betting interface
  - Balance management system
  - Chat integration

### **Betting Interface** 💸
- **File**: `crash-casino/frontend/js/bet-interface-clean.js`
- **Features**:
  - Quick bet buttons (0.005, 0.01, 0.05, 0.1 ETH)
  - Auto-cashout settings
  - Live orders tracking
  - Balance integration

### **Chart Visualization** 📊
- **File**: `crash-casino/frontend/js/crash-chart.js`
- **Technology**: Chart.js with real-time updates
- **Features**:
  - Live multiplier tracking
  - Historical crash points
  - Betting markers
  - Responsive design

---

## 🗄️ **DATABASE SCHEMA**

### **Core Tables** (Supabase PostgreSQL)

#### **User Balances**
```sql
CREATE TABLE user_balances (
    address TEXT PRIMARY KEY,
    balance DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Balance Deposits**
```sql
CREATE TABLE balance_deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tx_hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Crash Rounds**
```sql
CREATE TABLE rounds (
    id TEXT PRIMARY KEY,
    commit_hash TEXT,
    seed_revealed TEXT,
    nonce INTEGER,
    crash_multiplier DECIMAL(8,2),
    started_at TIMESTAMPTZ,
    crashed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
);
```

#### **Payouts**
```sql
CREATE TABLE payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    round_id TEXT,
    user_id UUID,
    amount_wei TEXT,
    dest_address TEXT,
    tx_hash TEXT,
    status TEXT DEFAULT 'queued',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 **DEPLOYMENT CONFIGURATION**

### **Production URLs** 🌐
- **Frontend**: https://pacothechicken.xyz/pacorocko
- **Backend**: https://paco-x57j.onrender.com
- **WebSocket**: wss://paco-x57j.onrender.com
- **Health Check**: https://paco-x57j.onrender.com/health

### **Environment Variables** ⚙️

#### **Required for Backend** (Render)
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Abstract L2 Wallet
HOUSE_WALLET_PRIVATE_KEY=your_house_key
HOT_WALLET_PRIVATE_KEY=your_hot_key
ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz

# API Security
ADMIN_API_KEY=your_admin_key
JWT_SECRET=your_jwt_secret

# External Services
WALLETCONNECT_PROJECT_ID=your_project_id
```

#### **Required for Frontend** (Vercel)
```bash
# Database (public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://tbowrsbjoijdtpdgnoio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Twitter OAuth
TWITTER_CLIENT_ID=your_client_id

# Abstract Network
NEXT_PUBLIC_ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
```

### **Deployment Process** 📦
1. **Code Changes**: Git push auto-deploys via GitHub
2. **Backend**: Render auto-deploys from main branch
3. **Frontend**: Vercel auto-deploys from main branch
4. **Database**: Manual SQL scripts in Supabase

---

## 🐛 **KNOWN ISSUES & STATUS**

### **✅ RESOLVED ISSUES**
1. **Sync Problems**: Fixed with unified server authority
2. **Dual System Conflicts**: Eliminated competing systems
3. **Round History Duplicates**: Single source of truth implemented
4. **Timing Misalignment**: Server-controlled countdown system
5. **Multiplier Discrepancies**: Identical formulas everywhere

### **🚨 CURRENT KNOWN ISSUE**
**Abstract Network RPC Transaction Failures** 
- **Status**: Under investigation
- **Impact**: Users cannot place bets via direct transactions
- **Workaround**: Balance-based betting system works perfectly
- **Details**: See `RPC_BETTING_ISSUE_SUMMARY.md`

### **🔧 TEMPORARY SOLUTION IN PLACE**
The balance-based betting system provides a seamless user experience:
- Users deposit once to house wallet
- Instant betting without transaction delays
- Automatic balance management
- Withdrawals processed via hot wallet

---

## 📋 **API ENDPOINTS**

### **Public Endpoints**
- `GET /health` - Service health check
- `GET /proof/:roundId` - Provably fair verification
- `GET /api/balance/:address` - Get user balance
- `POST /api/deposits/check/:address` - Check for new deposits

### **Admin Endpoints** (Require API Key)
- `POST /admin/pause` - Pause game engine
- `POST /admin/unpause` - Resume game engine
- `GET /admin/wallet-status` - Check wallet balances
- `GET /admin/limits` - Get betting limits
- `POST /admin/limits` - Update betting limits

### **Betting Endpoints**
- `POST /api/bet/balance` - Place bet using balance
- `POST /api/withdraw` - Process withdrawal request
- `POST /api/deposits/manual` - Manual deposit attribution

---

## 🔧 **MONITORING & MAINTENANCE**

### **Health Monitoring** 📊
- **Backend**: `/health` endpoint
- **Database**: Supabase dashboard
- **WebSocket**: Connection logs in Render
- **Wallet Balances**: `/admin/wallet-status`

### **Log Locations** 📝
- **Render Backend**: Dashboard → Logs
- **Vercel Frontend**: Dashboard → Functions
- **Browser Client**: F12 → Console
- **Database**: Supabase → Logs

### **Maintenance Tasks** 🔄
- **Daily**: Monitor hot wallet balance (keep 0.5-5.0 ETH)
- **Weekly**: Check deposit indexer for missed transactions
- **Monthly**: Transfer excess funds from house to safe wallet
- **As Needed**: Update RPC endpoints if Abstract Network issues

---

## 🎯 **DEVELOPMENT ROADMAP**

### **Priority 1: Fix Abstract RPC Issues** 🚨
- Investigate Abstract Network transaction submission
- Test alternative transaction methods
- Consider Web3Auth or Abstract SDK integration

### **Priority 2: Enhanced Features** ✨
- Auto-cashout functionality improvements
- Advanced betting statistics
- Mobile app optimization
- Multi-language support

### **Priority 3: Scaling** 📈
- Redis caching for better performance
- Load balancing for high traffic
- Advanced analytics and reporting
- Referral system integration

---

## 📁 **KEY FILE INDEX**

### **Core Game Files**
- `crash-casino/backend/unified-crash-engine.js` - Main game engine
- `crash-casino/frontend/js/unified-crash-client.js` - Frontend client
- `crash-casino/unified-production-integration.js` - Production orchestration
- `server.js` - Main backend entry point

### **Financial System**
- `crash-casino/backend/balance-api.js` - Balance management
- `crash-casino/backend/deposit-indexer.js` - Deposit processing
- `crash-casino/backend/wallet-integration-abstract.js` - Wallet operations
- `FUND_MANAGEMENT.md` - Three-wallet architecture docs

### **Frontend Interface**
- `crash-casino/frontend/pacorocko.html` - Main game interface
- `crash-casino/frontend/js/bet-interface-clean.js` - Betting system
- `crash-casino/frontend/js/balance-system.js` - Balance frontend
- `crash-casino/frontend/js/crash-chart.js` - Chart visualization

### **Configuration & Deployment**
- `DATABASE_SETUP.sql` - Database schema
- `DEPLOYMENT.md` - Deployment instructions
- `crash-casino/DEPLOYMENT_INSTRUCTIONS.md` - Crash-specific deployment
- `FUND_MANAGEMENT.md` - Wallet management guide

### **Documentation**
- `UNIFIED_SYNC_SOLUTION.md` - Sync architecture explanation
- `COMPLETE_SYSTEM_SIMPLIFICATION.md` - System cleanup documentation
- `RPC_BETTING_ISSUE_SUMMARY.md` - Current issue investigation
- `PROVEN_CRASH_IMPLEMENTATION.md` - Implementation details

---

**🎉 CONCLUSION**: The Paco Rocko crash casino system is production-ready with a robust, scalable architecture. The balance-based betting system provides an excellent user experience while the Abstract RPC issues are being resolved. The system handles real ETH transactions on Abstract L2 with full provably fair verification.

---

*Created: January 2025 | System Status: ✅ PRODUCTION READY*
