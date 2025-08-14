## Abstract Mainnet Wallet Setup

- Add network to MetaMask:
  - Chain Name: Abstract
  - Chain ID: 2741
  - Currency: ETH
  - RPC: https://api.mainnet.abs.xyz
  - Explorer: https://abscan.org/

Use the in-app “Add/Switch to Abstract” button for one-click setup.

Abstract Global Wallet (AGW):
- Use email or passkey via built-in AGW connect.

Funding (bridges):
- Abstract Native Bridge: `https://native-bridge.abs.xyz`
- Additional docs: `https://docs.abs.xyz`

Security:
- Review transactions with `https://revoke.cash`.

## Environment Variables

```bash
# Abstract Mainnet Configuration
ABSTRACT_CHAIN_ID=2741
ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
ABSTRACT_EXPLORER_URL=https://abscan.org

# Three-Wallet Security Architecture
HOUSE_WALLET_ADDRESS=0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a  # Cold storage (deposits only)
HOT_WALLET_ADDRESS=0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF     # Operational (payouts/withdrawals)
SAFE_WALLET_ADDRESS=0x7A4223A412e455821c4D9480A80fcC0624924c27    # Deep cold storage (excess funds)
HOT_WALLET_PRIVATE_KEY=your_hot_wallet_private_key_here

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Security Notes

**Three-Wallet Architecture:**
- **House Wallet**: Cold storage for deposits only (no private key on server)
- **Hot Wallet**: Operational wallet for automated payouts/withdrawals (~1-5 ETH max)
- **Safe Wallet**: Deep cold storage for excess funds (multisig recommended)

**Fund Flow:**
```
📥 Deposits → House Wallet
     ↓ (manual transfer)
💰 Hot Wallet (operational) 
     ↓ (excess funds)
🔒 Safe Wallet (long-term storage)
```

**Operational Guidelines:**
- Keep hot wallet balance between 0.5-5 ETH for operations
- Transfer excess funds: Hot → Safe Wallet (not back to house)
- House wallet is for deposits only - never send operational funds there
- Monitor all three wallets via `/admin/wallet-status`


