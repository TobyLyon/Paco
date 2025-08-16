# 🏗️ Architecture Map

## System Overview

The crash casino is built on a **server-authority pattern** with real-time WebSocket communication, atomic database operations, and production-grade monitoring.

## Core Components

### 🖥️ Frontend Layer
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                             │
├─────────────────────────────────────────────────────────┤
│  • pacorocko.html (Main UI)                           │
│  • bet-interface-clean.js (Balance & Betting)         │
│  • crash-client.js (WebSocket Client)                 │
│  • production-balance-manager.js (OCC Balance)        │
│  • wallet-bridge.js (Blockchain Integration)          │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
- User connects wallet → balance loads via production API
- User places bet → optimistic update → server validation → balance sync
- Real-time multiplier updates via WebSocket events
- Cashout → immediate UI feedback → server confirmation

### 🔧 Backend Core
```
┌─────────────────────────────────────────────────────────┐
│                   Backend Core                          │
├─────────────────────────────────────────────────────────┤
│  • server.js (Express + Socket.IO entry)              │
│  • unified-production-integration.js (Main Logic)     │
│  • unified-crash-engine.js (Game Engine)              │
│  • production-balance-api.js (Ledger Operations)      │
│  • nonce-manager.js (Transaction Sequencing)          │
│  • production-socket-manager.js (WebSocket Events)    │
└─────────────────────────────────────────────────────────┘
```

**Ownership:**
- **Game Engine**: Round lifecycle, multiplier calculation, crash detection
- **Balance API**: Atomic ledger operations, OCC version control
- **Socket Manager**: Event broadcasting, reconnection handling
- **Nonce Manager**: Transaction ordering, fee bumping

### 🗄️ Database Layer (Supabase)
```
┌─────────────────────────────────────────────────────────┐
│                Database (Supabase)                      │
├─────────────────────────────────────────────────────────┤
│  Tables:                                               │
│  • ledger (append-only, source of truth)              │
│  • accounts (balance snapshots + OCC versions)        │
│  • deposits_seen (idempotency for indexer)            │
│  • indexer_checkpoint (block tracking)                │
│                                                        │
│  RPC Functions:                                        │
│  • rpc_place_bet (atomic bet placement)               │
│  • rpc_process_win/loss (settlement)                  │
│  • rpc_record_deposit (deposit attribution)           │
│  • rpc_get_balance (balance retrieval)                │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
- All money operations go through atomic RPC functions
- Ledger table is append-only (never modified)
- Accounts table maintains current state + version for OCC
- Idempotency enforced via unique constraints

### 🔍 Blockchain Indexer
```
┌─────────────────────────────────────────────────────────┐
│                Deposit Indexer                          │
├─────────────────────────────────────────────────────────┤
│  • production-deposit-indexer.js                      │
│  • WebSocket monitoring (fast)                        │
│  • HTTP polling (reliable)                            │
│  • 25-block reorg buffer                              │
│  • 12-block confirmation threshold                    │
│  • Checkpointing system                               │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Monitors ETH transfers to hot wallet address
2. Detects deposits via dual monitoring (WS + HTTP)
3. Waits for confirmations before crediting
4. Records in `deposits_seen` + `ledger` atomically
5. Updates user balance in `accounts` table

### 🎲 Game Logic
```
┌─────────────────────────────────────────────────────────┐
│                 Game Logic                              │
├─────────────────────────────────────────────────────────┤
│  • provably-fair-rng.js (Crash Generation)            │
│  • multiplier-calculator.js (Validation)              │
│  • Commit-reveal seed system                          │
│  • 3% house edge (1/33 instant crashes)               │
│  • Deterministic from server+client seeds             │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Server generates seed + hash (commit phase)
2. Client provides seed, round starts
3. Combined seeds → SHA-256 → crash multiplier
4. Server broadcasts multiplier updates
5. Crash point reached → settle all bets
6. Reveal server seed for verification

### 🏥 Monitoring & Health
```
┌─────────────────────────────────────────────────────────┐
│              Monitoring System                          │
├─────────────────────────────────────────────────────────┤
│  • health-invariants-endpoint.js (Critical Checks)    │
│  • prometheus-metrics.js (Performance Metrics)        │
│  • verify-seeds-endpoint.js (Fairness Verification)   │
│  • Real-time invariant monitoring                     │
│  • Grafana dashboard integration                      │
└─────────────────────────────────────────────────────────┘
```

**Critical Invariants:**
- `ledger_snapshot_drift_wei = 0` (MUST be zero)
- No negative balances ever
- Indexer lag < 18 blocks
- Hot wallet balance > minimum threshold

## Data Flow Diagrams

### 💰 Bet Placement Flow
```
Frontend                Backend                 Database
   │                       │                       │
   │ Place Bet (OCC v5)    │                       │
   ├─────────────────────→ │                       │
   │                       │ rpc_place_bet()       │
   │                       ├─────────────────────→ │
   │                       │                       │ ← Lock row, validate version
   │                       │                       │ ← Move available→locked
   │                       │                       │ ← Increment version
   │                       │ {balance, v6}         │
   │                       │ ←─────────────────────┤
   │ Balance Updated       │                       │
   │ ←─────────────────────┤                       │
```

### 🏆 Win Settlement Flow
```
Game Engine            Balance API             Blockchain           Database
    │                      │                       │                   │
    │ Process Win           │                       │                   │
    ├─────────────────────→ │                       │                   │
    │                      │ Transfer House→Hot    │                   │
    │                      ├─────────────────────→ │                   │
    │                      │                       │ ← Send ETH        │
    │                      │ TX Receipt            │                   │
    │                      │ ←─────────────────────┤                   │
    │                      │ rpc_process_win()     │                   │
    │                      ├─────────────────────────────────────────→ │
    │                      │                       │                   │ ← Move locked→available
    │                      │                       │                   │ ← Add winnings
    │                      │ Updated Balance       │                   │
    │                      │ ←─────────────────────────────────────────┤
    │ Win Processed        │                       │                   │
    │ ←─────────────────────┤                       │                   │
```

### 🔍 Deposit Detection Flow
```
Blockchain              Indexer                 Database              Frontend
    │                      │                       │                     │
    │ ETH Transfer          │                       │                     │
    ├─────────────────────→ │                       │                     │
    │                      │ Detect via WS/HTTP    │                     │
    │                      │                       │                     │
    │                      │ Wait 12 blocks        │                     │
    │                      │                       │                     │
    │                      │ rpc_record_deposit()  │                     │
    │                      ├─────────────────────→ │                     │
    │                      │                       │ ← Credit balance    │
    │                      │                       │ ← Update ledger     │
    │                      │ Success               │                     │
    │                      │ ←─────────────────────┤                     │
    │                      │ Notify Frontend       │                     │
    │                      ├─────────────────────────────────────────────→ │
    │                      │                       │                     │ ← Balance refreshed
```

## Component Dependencies

### 🔗 High-Level Dependencies
```
server.js
├── unified-production-integration.js
│   ├── unified-crash-engine.js
│   ├── production-balance-api.js
│   ├── production-socket-manager.js
│   └── nonce-manager.js
├── production-deposit-indexer.js
├── health-invariants-endpoint.js
└── prometheus-metrics.js
```

### 🔄 Data Dependencies
```
Frontend Balance Manager
├── Depends on: production-balance-api.js
├── Triggers: OCC version updates
└── Listens: Socket balance events

Game Engine
├── Depends on: provably-fair-rng.js
├── Depends on: production-balance-api.js
└── Broadcasts: Round events via Socket.IO

Deposit Indexer
├── Depends on: Blockchain RPC
├── Depends on: production-balance-api.js
└── Triggers: Balance updates

Health Monitoring
├── Depends on: All major components
├── Monitors: Ledger invariants
└── Provides: /health/* endpoints
```

## Critical Paths

### 🎯 Bet-to-Settlement (P0)
1. Frontend → `production-balance-manager.js`
2. API → `production-balance-api.js.placeBet()`
3. Database → `rpc_place_bet()` (atomic)
4. Game → `unified-crash-engine.js` (tracking)
5. Settlement → `rpc_process_win/loss()` (atomic)

### 💰 Deposit Attribution (P0)
1. Blockchain → ETH transfer
2. Indexer → `production-deposit-indexer.js`
3. Detection → Dual monitoring (WS + HTTP)
4. Confirmation → 12 blocks
5. Credit → `rpc_record_deposit()` (atomic)

### 🏥 System Health (P0)
1. Invariants → `health-invariants-endpoint.js`
2. Checks → Ledger drift, negative balances
3. Metrics → `prometheus-metrics.js`
4. Alerts → Grafana/monitoring system

### 🔄 Real-time Updates (P1)
1. Events → `production-socket-manager.js`
2. Broadcasting → Event ring buffer
3. Reconnection → `lastEventId` replay
4. Frontend → Balance synchronization

## Security Boundaries

### 🔒 Trust Boundaries
- **Frontend**: Untrusted, optimistic updates only
- **WebSocket**: Authenticated, but validated server-side
- **Database**: Trusted, atomic operations only
- **Blockchain**: External, requires confirmation

### 🛡️ Input Validation
- All money amounts validated as BigInt
- User addresses normalized (lowercase)
- Client IDs validated as UUIDs
- OCC versions validated server-side

### 🔐 Access Controls
- RPC functions enforce user isolation
- Admin endpoints require authentication
- Health endpoints rate limited
- Feature flags require authorization

This architecture ensures **casino-grade reliability** with atomic operations, zero race conditions, and comprehensive monitoring.
