# Paco Trades - P2P NFT Trading Platform

A secure, peer-to-peer NFT trading platform built on Abstract Mainnet with comprehensive anti-fraud protections.

## Overview

Paco Trades enables users to safely exchange NFTs (ERC-721/1155) and tokens (ERC-20/Native) through atomic swaps with built-in risk scoring and fraud prevention.

### Key Features

- **Atomic Swaps**: All-or-nothing trades with no partial fills
- **Multi-Token Support**: ERC-721, ERC-1155, ERC-20, and native ETH
- **Anti-Fraud Protection**: Real-time risk scoring and safety checks
- **Social Integration**: Twitter profile verification for identity
- **Chat System**: Secure negotiation between traders
- **Abstract Mainnet Only**: Chain-enforced security (chainId 2741)

## Architecture

### Smart Contracts

- **SwapEscrow.sol**: Non-upgradeable atomic swap contract
- **Chain ID**: 2741 (Abstract Mainnet only)
- **EIP-712**: Typed structured data signing
- **Kill Switch**: Emergency pause functionality

### Frontend Stack

- **Framework**: Next.js/React with TypeScript
- **Wallet**: Abstract Global Wallet (AGW) + EOA support
- **Database**: Supabase with Row Level Security
- **Styling**: CSS modules with `.trades-*` namespace

### Backend Services

- **API**: Node.js/Express on Render
- **Risk Scoring**: Heuristic-based fraud detection
- **Database**: PostgreSQL via Supabase
- **Real-time**: Socket.IO for chat

## Quick Start

### Prerequisites

- Node.js 16+
- Abstract wallet with ETH for gas
- Supabase account
- Render account (for API)

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure required variables:
```env
# Feature flags
TRADES_ENABLED=true
VITE_TRADES_ENABLED=true

# Contract addresses (deploy first)
TRADES_SWAP_ESCROW_ADDRESS=0x...
VITE_TRADES_SWAP_ESCROW_ADDRESS=0x...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Abstract Mainnet
VITE_RPC_URL=https://api.mainnet.abs.xyz
```

### Contract Deployment

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
cd contracts
forge install
```

3. Deploy to Abstract Mainnet:
```bash
export PRIVATE_KEY=0x...
export TRADES_FEE_RECEIVER=0x...  # Your fee receiver address
forge script script/DeploySwapEscrow.s.sol --rpc-url https://api.mainnet.abs.xyz --broadcast --verify
```

4. Update environment with deployed address.

### Database Setup

1. Run Supabase migrations:
```bash
psql $SUPABASE_DATABASE_URL -f migrations/001_trades_tables.sql
```

2. Verify tables and RLS policies are created.

### Frontend Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Navigate to `/trades` to access the trading interface.

### API Deployment

1. Deploy to Render with:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables from `.env.example`

## Usage Guide

### Creating a Trade

1. **Connect Wallet**: Ensure you're on Abstract Mainnet
2. **Navigate to /trades/create**
3. **Select Items**: 
   - "Your side": Pick NFTs/tokens from your inventory
   - "Their side": Specify what you want in return
4. **Set Parameters**:
   - Expiry: Max 24 hours for safety
   - Specific taker: Optional wallet address restriction
5. **Review Risks**: Check the security report
6. **Sign & Create**: Submit the signed order

### Accepting a Trade

1. **Browse Orders**: View available trades at `/trades`
2. **Review Details**: Check items, risk score, and chat
3. **Verify Safety**: Review risk flags and recommendations
4. **Accept Trade**: Execute atomic swap on-chain

### Risk Assessment

The platform automatically flags risky trades based on:

- **Contract Age**: Recently deployed contracts
- **Holder Count**: Collections with few holders
- **Name Similarity**: Look-alike collections
- **Approval Checks**: Dangerous token approvals
- **Value Skew**: Unfair trade ratios

Risk scores range from 0-100:
- **0-30**: Low risk (green)
- **31-70**: Medium risk (yellow)
- **71-100**: High risk (red)

## API Reference

### Orders

- `GET /api/trades/orders` - List orders with filtering
- `POST /api/trades/orders` - Create new order
- `GET /api/trades/orders/:id` - Get order details
- `POST /api/trades/orders/:id/fill` - Fill order
- `POST /api/trades/orders/:id/cancel` - Cancel order

### Risk Assessment

- `GET /api/trades/risk/:orderId` - Get risk report
- `POST /api/trades/risk/preview` - Preview risk before creation

### Query Parameters

```typescript
interface OrderQuery {
  status?: 'open' | 'filled' | 'cancelled' | 'expired'
  maker?: string
  taker?: string
  collection?: string
  sort?: 'recent' | 'expiry' | 'value'
  limit?: number
  offset?: number
}
```

## Security Features

### Smart Contract Security

- **Non-upgradeable**: Immutable contract logic
- **Domain Validation**: Chain ID enforcement
- **Reentrancy Protection**: ReentrancyGuard
- **Expiry Required**: Maximum 24-hour orders
- **Nonce System**: Prevents replay attacks

### Frontend Security

- **Input Validation**: All user inputs sanitized
- **XSS Protection**: Secure rendering of user content
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: API endpoint protection

### Anti-Fraud Measures

1. **Collection Verification**: Interface compliance checks
2. **Contract Analysis**: Bytecode size and proxy warnings
3. **Approval Monitoring**: Detection of dangerous approvals
4. **Social Signals**: Twitter verification integration
5. **Value Analysis**: Floor price deviation alerts

## Risk Mitigation

### For Users

- **Never approve unknown contracts**
- **Verify contract addresses** before trading
- **Check risk scores** before accepting trades
- **Use chat to negotiate** and build trust
- **Start with small trades** for new partners

### For Operators

- **Monitor kill switch** for emergency stops
- **Review risk flags** for pattern detection
- **Update scoring rules** based on new threats
- **Maintain fee receiver** security

## Troubleshooting

### Common Issues

**"Wrong Chain" Error**
- Ensure wallet is connected to Abstract Mainnet (chainId 2741)
- Use the "Switch to Abstract" button if available

**"Insufficient Allowance" Error**
- Approve the SwapEscrow contract for your tokens
- Use "Approve All" for NFT collections

**"Order Expired" Error**
- Orders automatically expire after 24 hours
- Create a new order with fresh expiry

**"Invalid Signature" Error**
- Ensure you're the maker when signing
- Check wallet connection and chain ID

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
VITE_DEBUG_TRADES=true
```

### Support Channels

- **GitHub Issues**: Technical bugs and feature requests
- **Discord**: Community support and discussions
- **Twitter**: Updates and announcements

## Development

### Project Structure

```
/src/trades/
├── components/     # React components
├── hooks/          # Custom hooks
├── pages/          # Page components
├── styles/         # CSS modules
└── utils/          # Utility functions

/trades-api/
├── routes/         # Express routes
├── services/       # Business logic
└── middleware/     # API middleware

/contracts/
├── SwapEscrow.sol  # Main contract
├── test/           # Foundry tests
└── script/         # Deployment scripts
```

### Testing

**Smart Contracts**:
```bash
cd contracts
forge test -vvv
```

**Frontend**:
```bash
npm run test
```

**Integration**:
```bash
npm run test:e2e
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/trades-improvement`
3. Follow the existing code style and patterns
4. Add tests for new functionality
5. Update documentation as needed
6. Submit pull request

### Code Style

- **Components**: PascalCase (e.g., `TradeDashboard`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInventory`)
- **CSS Classes**: `trades-` prefix (e.g., `trades-card`)
- **API Routes**: kebab-case (e.g., `/api/trades/orders`)

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- OpenZeppelin for secure contract templates
- Abstract team for L2 infrastructure
- Supabase for database and auth services
- The Paco community for feedback and testing