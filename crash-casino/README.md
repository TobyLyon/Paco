# 🎰 PacoRocko - Crash Casino Game

## 🚀 Overview

PacoRocko is a provably fair crash-style gambling game integrated into the Paco ecosystem. Players bet on a multiplier that increases over time until it "crashes" - the goal is to cash out before the crash happens.

## 🏗️ Architecture

```
crash-casino/
├── backend/
│   ├── src/
│   │   ├── game-engine.ts          # Core crash algorithm & fairness
│   │   ├── websocket-server.ts     # Real-time communication
│   │   ├── bet-manager.ts          # Bet placement & validation
│   │   ├── round-manager.ts        # Round lifecycle management
│   │   ├── provably-fair.ts        # Seed generation & verification
│   │   └── admin-api.ts            # Admin endpoints
│   ├── contracts/
│   │   ├── CrashCasino.sol         # Main betting contract
│   │   ├── PacoToken.sol           # Token integration
│   │   └── deploy.ts               # Deployment scripts
│   ├── types/
│   │   └── game-types.ts           # TypeScript definitions
│   └── tests/
│       ├── game-engine.test.ts
│       └── provably-fair.test.ts
├── frontend/
│   ├── pacorocko.html              # Main game page
│   ├── css/
│   │   └── crash-casino.css        # Game styling
│   ├── js/
│   │   ├── crash-client.js         # WebSocket client
│   │   ├── bet-interface.js        # Betting UI logic
│   │   ├── multiplier-display.js   # Real-time multiplier
│   │   └── web3-integration.js     # Wallet & contract interaction
│   └── assets/
│       ├── crash-sounds/           # Audio effects
│       └── crash-graphics/         # Visual assets
└── docs/
    ├── API.md                      # WebSocket API documentation
    ├── PROVABLY_FAIR.md           # Fairness verification guide
    └── DEPLOYMENT.md              # Setup & deployment guide
```

## 🎮 Game Flow

1. **Connect Wallet** - MetaMask integration with Abstract L2
2. **Place Bet** - Choose bet amount, submit to smart contract
3. **Watch Multiplier** - Real-time multiplier increases from 1.00x
4. **Cash Out** - Click to secure winnings before crash
5. **Round End** - Multiplier crashes, payouts processed
6. **Verify Fairness** - Check round results with seeds

## 🔧 Integration Points

### Express Server Routes
```javascript
// Add to dev-server.js
app.get('/PacoRocko', (req, res) => {
    res.sendFile(path.join(__dirname, 'crash-casino/frontend/pacorocko.html'))
})

app.use('/crash-api', crashApiRoutes)
app.use('/crash-ws', crashWebSocketHandler)
```

### WebSocket Communication
- Real-time multiplier updates
- Bet placement confirmations  
- Cash-out notifications
- Round state changes

### Smart Contract Integration
- Bet escrow on Abstract L2
- Automated payouts
- Provably fair seed verification
- Admin fund management

## 🛡️ Security Features

- **Provably Fair**: Client + Server seed + Nonce algorithm
- **Rate Limiting**: Prevent spam betting
- **Bet Validation**: Server-side verification
- **Smart Contract Escrow**: Funds held securely
- **Admin Controls**: House edge, max bet limits

## 📊 Admin Dashboard

Access via `/PacoRocko/admin` with proper authentication:
- Round history & statistics
- Player bet analytics  
- House edge configuration
- Fund management tools
- Fairness verification logs

## 🚀 Development Status

- [ ] Backend game engine
- [ ] WebSocket server
- [ ] Smart contract development
- [ ] Frontend UI implementation
- [ ] Web3 integration
- [ ] Testing & security audit
- [ ] Production deployment

---

**Built with 🐔 by the Paco team**