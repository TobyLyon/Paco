# Fund Management - Three-Wallet Architecture

## 🔒 **Wallet Roles**

### **House Wallet** (Cold Storage)
- **Address**: `0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a`
- **Purpose**: Receives all user deposits
- **Security**: No private key on server (manual access only)
- **Monitoring**: Check balance via `/admin/wallet-status`

### **Hot Wallet** (Operational)
- **Address**: `0x02B4bFbA6D16308F5B40A5DF1f136C9472da52FF`
- **Purpose**: Automated payouts and withdrawals
- **Target Balance**: 0.5 - 5.0 ETH
- **Security**: Private key on server (operational necessity)

### **Safe Wallet** (Deep Cold Storage)
- **Address**: `0x7A4223A412e455821c4D9480A80fcC0624924c27`
- **Purpose**: Long-term storage of excess funds
- **Security**: Maximum security (multisig recommended)
- **Access**: Manual/emergency only

## 💰 **Fund Flow Operations**

### **Daily Operations**
1. **Deposits** → House Wallet (automatic)
2. **Payouts** ← Hot Wallet (automatic)
3. **Monitor** hot wallet balance

### **Weekly/Monthly Transfers**

#### **House → Hot Wallet** (when hot wallet < 0.5 ETH)
```bash
# Manual transfer to fund operations
# Recommended: 2-3 ETH per transfer
```

#### **Hot → Safe Wallet** (when hot wallet > 5.0 ETH)
```bash
# Transfer excess funds to deep storage
# Keep hot wallet at 2-3 ETH for operations
```

#### **House → Safe Wallet** (periodic security transfer)
```bash
# Large transfers of accumulated deposits
# Recommended: Monthly or when house > 10 ETH
```

## 📊 **Monitoring & Alerts**

### **Primary Endpoint**: `/admin/wallet-status`
```json
{
  "wallets": {
    "hot": { "balanceETH": "2.150000", "status": "OK" },
    "house": { "balanceETH": "8.750000", "status": "OK" },
    "safe": { "balanceETH": "45.230000", "status": "SECURE" }
  },
  "recommendations": ["✅ All wallet balances within recommended ranges"]
}
```

### **Alert Conditions**
- 🚨 **Hot wallet < 0.5 ETH**: Fund immediately
- 💰 **Hot wallet > 5.0 ETH**: Transfer excess to safe
- 🏦 **House wallet > 10.0 ETH**: Consider transfer to safe

## 🔐 **Security Guidelines**

### **Hot Wallet Security**
- Keep minimal operational balance (0.5-5 ETH)
- Monitor for unusual activity
- Rotate private keys periodically
- Use secure environment variables

### **Safe Wallet Security**
- Consider multisig wallet for maximum security
- Hardware wallet recommended
- Separate from operational infrastructure
- Document recovery procedures

### **Emergency Procedures**
1. **Hot wallet compromise**: Immediately transfer funds to safe wallet
2. **Excessive withdrawals**: Pause system, investigate
3. **Balance discrepancies**: Audit all transactions

## 📋 **Regular Tasks**

### **Daily**
- [ ] Check `/admin/wallet-status`
- [ ] Verify hot wallet balance > 0.5 ETH
- [ ] Monitor payout queue status

### **Weekly**
- [ ] Review wallet distribution percentages
- [ ] Transfer funds if needed (house → hot or hot → safe)
- [ ] Audit recent transactions

### **Monthly**
- [ ] Transfer large deposits to safe wallet
- [ ] Review security logs
- [ ] Update fund management procedures
- [ ] Test emergency procedures

## 🚨 **Emergency Contacts & Procedures**

### **Immediate Actions for Security Incidents**
1. Pause the game: `/admin/pause`
2. Check wallet status: `/admin/wallet-status`
3. Review recent transactions on Abstract Explorer
4. Contact team leads immediately

### **Fund Recovery**
- Document all private keys securely
- Maintain offline backups
- Test recovery procedures quarterly
