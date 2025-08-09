# 🔐 Production Wallet Integration - Paco's Crash Casino

Complete wallet integration for Abstract L2 with support for ALL major EVM wallets.

## 🚀 Features

### ✅ Supported Wallets
- **MetaMask** (injected + extension)
- **Rabby Wallet** (automatic detection)
- **Trust Wallet** (mobile + desktop)
- **Rainbow Wallet** (mobile + extension)
- **OKX Wallet** (all platforms)
- **Coinbase Wallet** (Smart Wallet enabled)
- **Ledger** (via WalletConnect)
- **Argent** (via WalletConnect)
- **300+ more wallets** via WalletConnect protocol

### ✅ Network Support
- **Abstract Mainnet** (Chain ID: 2741)
- **Abstract Sepolia** (Chain ID: 11124)
- **Auto-switching** to correct network
- **Dev/Prod environment** detection

### ✅ Production Features
- **Secure WalletConnect integration**
- **React Query optimization**
- **TypeScript support**
- **Error handling & user feedback**
- **Network status indicators**
- **Account management UI**

## 📁 File Structure

```
src/
├── lib/
│   └── abstractChains.ts          # Chain configurations
├── components/
│   ├── WalletProviders.tsx        # Main provider wrapper
│   ├── ConnectButton.tsx          # Reusable connect button
│   └── WalletGate.jsx             # Authentication gate
├── hooks/
│   └── useWallet.js               # Wallet state hook
└── main.jsx                       # App entry with providers
```

## 🔧 Setup Instructions

### 1. Install Dependencies

All required dependencies are already included in `package.json`:

```json
{
  "@rainbow-me/rainbowkit": "^2.2.8",
  "@tanstack/react-query": "^5.59.0",
  "wagmi": "^2.12.0",
  "viem": "^2.21.0"
}
```

### 2. Environment Configuration

Copy `env-template-wallet.txt` to `.env` and configure:

```bash
# Required: Get from https://cloud.walletconnect.com/
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Network selection
VITE_DEV_MODE=true  # false for production
```

### 3. WalletConnect Setup

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a free account
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env` file

## 🎯 Usage Examples

### Basic Connection

```jsx
import { ConnectButton } from './components/ConnectButton'

function App() {
  return (
    <div>
      <ConnectButton />
    </div>
  )
}
```

### Using Wallet State

```jsx
import useWallet from './hooks/useWallet'

function GameComponent() {
  const { 
    isConnected, 
    address, 
    isAbstract, 
    isWalletReady,
    formatAddress 
  } = useWallet()

  if (!isConnected) {
    return <ConnectButton />
  }

  if (!isAbstract) {
    return <div>Please switch to Abstract L2</div>
  }

  return (
    <div>
      Welcome {formatAddress(address)}!
      Ready to play: {isWalletReady ? '✅' : '❌'}
    </div>
  )
}
```

### Custom Connect Button

```jsx
import { CustomConnectButton } from './components/ConnectButton'

function Navbar() {
  return (
    <nav>
      <CustomConnectButton className="ml-auto" />
    </nav>
  )
}
```

### Network Status Check

```jsx
import { useAbstractChain } from './components/WalletProviders'

function NetworkIndicator() {
  const { isAbstract, isMainnet, isTestnet, targetChain } = useAbstractChain()

  return (
    <div>
      <div>Connected to Abstract: {isAbstract ? '✅' : '❌'}</div>
      <div>Network: {isMainnet ? 'Mainnet' : isTestnet ? 'Testnet' : 'Other'}</div>
      <div>Target: {targetChain.name}</div>
    </div>
  )
}
```

## 🔄 Auto Network Switching

The system automatically:

1. **Detects wallet connection**
2. **Checks current network**
3. **Prompts switch to Abstract L2**
4. **Shows user-friendly feedback**
5. **Handles connection errors gracefully**

```typescript
// Auto-switching logic in WalletProviders.tsx
useEffect(() => {
  if (isConnected && chainId !== targetChain.id) {
    switchChain({ chainId: targetChain.id })
  }
}, [isConnected, chainId])
```

## 🌐 Chain Configuration

### Abstract Mainnet
```typescript
{
  id: 2741,
  name: 'Abstract',
  rpcUrls: {
    default: {
      http: ['https://api.mainnet.abs.xyz'],
      webSocket: ['wss://api.mainnet.abs.xyz/ws']
    }
  },
  blockExplorers: {
    default: { url: 'https://abscan.org' }
  }
}
```

### Abstract Sepolia
```typescript
{
  id: 11124,
  name: 'Abstract Sepolia',
  rpcUrls: {
    default: {
      http: ['https://api.testnet.abs.xyz'],
      webSocket: ['wss://api.testnet.abs.xyz/ws']
    }
  },
  blockExplorers: {
    default: { url: 'https://sepolia.abscan.org' }
  }
}
```

## 🛡️ Security Features

### Environment Variables
- **No hardcoded private keys**
- **Secure WalletConnect Project ID**
- **Environment-based configuration**

### Connection Security
- **Client-side only wallet interaction**
- **No private key exposure**
- **Secure message signing**
- **Connection state validation**

### Error Handling
- **Network mismatch detection**
- **Connection failure recovery**
- **User-friendly error messages**
- **Graceful fallbacks**

## 🚀 Production Deployment

### Vercel Deployment
```bash
# Build command
npm run build

# Environment variables required:
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_DEV_MODE=false
```

### Network Configuration
- **Development**: Uses Abstract Sepolia (testnet)
- **Production**: Uses Abstract Mainnet automatically
- **Override**: Set `VITE_DEV_MODE=false` to force mainnet

## 🔍 Debugging

### Connection Issues
```javascript
// Check in browser console
console.log('Wallet State:', useWallet())
console.log('Chain Info:', useAbstractChain())
```

### Common Issues
1. **Missing WalletConnect Project ID**: Check `.env` file
2. **Wrong network**: Auto-switch should trigger
3. **Connection timeout**: Check internet connection
4. **Mobile wallet issues**: Ensure WalletConnect QR modal works

### Debug Mode
```jsx
// Add to App.jsx for development
{import.meta.env.DEV && (
  <div className="debug-panel">
    <div>Connected: {isConnected ? '✅' : '❌'}</div>
    <div>Abstract: {isAbstract ? '✅' : '❌'}</div>
    <div>Chain: {chainId}</div>
  </div>
)}
```

## 📱 Mobile Support

### Tested Wallets
- ✅ **MetaMask Mobile**
- ✅ **Trust Wallet**
- ✅ **Rainbow Wallet**
- ✅ **Coinbase Wallet**
- ✅ **WalletConnect compatible wallets**

### Mobile Features
- **Deep link support**
- **QR code scanning**
- **In-app browser compatibility**
- **Responsive UI**

## 🎨 UI Components

### WalletGate Component
- **Animated connection flow**
- **Network status indicators**
- **Error state handling**
- **Loading states**

### ConnectButton Variants
- **Standard RainbowKit button**
- **Custom styled button**
- **Compact network indicator**
- **Account management modal**

## 🔧 Advanced Configuration

### Custom Connectors
```typescript
// Add custom wallet connector
import { myCustomWallet } from 'my-wallet-connector'

const config = getDefaultConfig({
  // ... existing config
  connectors: [
    ...defaultConnectors,
    myCustomWallet()
  ]
})
```

### Theme Customization
```typescript
<RainbowKitProvider
  theme="dark"
  showConnectionStatus={true}
  appInfo={{
    appName: "Your App Name",
    learnMoreUrl: 'https://your-site.com'
  }}
>
```

## 📊 Analytics Integration

### Connection Tracking
```javascript
// Track wallet connections
useEffect(() => {
  if (isConnected) {
    analytics.track('wallet_connected', {
      address: address,
      chain: chainId,
      connector: connector?.name
    })
  }
}, [isConnected, address, chainId])
```

---

## 🎯 Next Steps

After successful wallet integration:

1. **Test all wallet connections**
2. **Verify network switching**
3. **Test mobile compatibility**
4. **Add crash game logic**
5. **Implement betting interface**
6. **Deploy to production**

## 🆘 Support

For issues or questions:
- Check the console for error messages
- Verify WalletConnect Project ID
- Test with different wallets
- Check network configuration

---

**Built with ❤️ for Paco's Crash Casino on Abstract L2** 🐔🚀
