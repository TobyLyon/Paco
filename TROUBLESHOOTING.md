# 🔧 **TROUBLESHOOTING GUIDE**

## 🎮 **PACO JUMP GAME**

### **Game Won't Start**
- **Check**: Twitter authentication required for leaderboards
- **Fix**: Connect Twitter or play anonymous mode
- **Mobile**: Tap left/right sides of screen (not buttons)

### **Scores Not Saving**  
- **Check**: Supabase connection in browser console
- **Fix**: Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in environment
- **Database**: Check `game_scores` table exists

### **Mobile Controls Issues**
- **Problem**: Touch controls not responsive
- **Fix**: Use full-screen mode on mobile
- **Alternative**: Use landscape orientation

## 🎰 **PACOROCKO CRASH CASINO**

### **WebSocket Connection Failed**
```bash
# Error: "Failed to connect to game server"
# Check browser console for:
❌ Connection refused to paco-x57j.onrender.com
```
**Fix**: 
1. Verify Render backend is running: https://paco-x57j.onrender.com/health
2. Check WebSocket URL in `crash-casino/frontend/js/crash-client.js`

### **Wallet Connection Issues**
```bash
# Error: "Wallet connection failed"
```
**Fix**:
1. **MetaMask**: Add Abstract L2 network manually
2. **WalletConnect**: Verify `WALLETCONNECT_PROJECT_ID` is set
3. **Browser**: Disable ad blockers temporarily

### **Betting Transactions Fail**
```bash
# Error: "Transaction failed" or "Insufficient funds"
```
**Fix**:
1. **Check ETH balance** on Abstract L2 (not Ethereum mainnet)
2. **Verify network**: Should show "Abstract" in wallet
3. **Gas fees**: Ensure enough ETH for transaction + gas
4. **House wallet**: Check backend logs for wallet integration errors

### **Chat Not Working**
```bash
# Error: "Chat unavailable"
```
**Fix**: 
1. **Database**: Check `chat_messages` table exists in Supabase
2. **Authentication**: Must be connected with wallet
3. **Backend**: Verify WebSocket server includes chat handlers

## 🐦 **TWITTER AUTHENTICATION**

### **OAuth Redirect Loop**
```bash
# Error: Keeps redirecting to Twitter
```
**Fix**:
1. **Redirect URI**: Must exactly match Twitter app settings
2. **HTTPS required**: Localhost won't work in production
3. **Client Secret**: Verify in environment variables

### **"Invalid Client" Error**
```bash
# Error: "Invalid client_id or client_secret"
```
**Fix**:
1. **Check environment variables** in deployment platform
2. **Twitter app**: Verify Client ID and Secret in developer console
3. **Encoding**: Ensure no extra spaces or line breaks

## 🗄️ **DATABASE ISSUES**

### **Supabase Connection Failed**
```bash
# Error: "Could not connect to database"
```
**Fix**:
1. **URL format**: Must include https:// prefix
2. **Anon key**: Check it's the anon key, not service role key (for frontend)
3. **Service role key**: Required for backend operations only

### **Row Level Security Errors**
```bash
# Error: "Permission denied for table"
```
**Fix**:
1. **Run RLS policies**: From `crash-casino-database-schema-abstract.sql`
2. **Authentication**: Some tables require user authentication
3. **Test**: Try operations with authenticated user

### **Duplicate Score Entries**
```bash
# Error: Multiple entries for same user/day
```
**Fix**: Database constraint should prevent this automatically
```sql
-- Run this to check constraints:
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'game_scores';
```

## 🌐 **DEPLOYMENT ISSUES**

### **Render Backend Won't Start**
```bash
# Error: "Application failed to start"
```
**Check Render Logs**:
1. **Node version**: Ensure compatible with package.json
2. **Dependencies**: Check npm install succeeded  
3. **Environment variables**: Verify all required vars are set
4. **Start command**: Should be `node server.js`

### **Vercel Frontend 404s**
```bash
# Error: "Page not found"
```
**Fix**:
1. **Build**: Check if build succeeded in Vercel dashboard
2. **File paths**: Ensure case-sensitive paths are correct
3. **Static files**: Check files are in correct directories

### **CORS Errors**
```bash
# Error: "Blocked by CORS policy"
```
**Fix**:
1. **Backend**: Set `CORS_ORIGIN=https://pacothechicken.xyz` in Render
2. **Protocol**: Ensure frontend uses https:// to connect to backend
3. **Headers**: Check WebSocket connection includes proper origin

## 🔍 **DEBUGGING COMMANDS**

### **Browser Console**
```javascript
// Check Supabase connection
console.log('Supabase:', window.supabase ? 'Available' : 'Missing');

// Check WebSocket connection  
console.log('Socket status:', crashGameClient?.socket?.connected);

// Check wallet connection
console.log('Wallet:', window.ethereum ? 'Available' : 'Missing');
```

### **Backend Health Checks**
```bash
# Test backend
curl https://paco-x57j.onrender.com/health

# Test WebSocket (requires wscat)
wscat -c wss://paco-x57j.onrender.com/crash-ws
```

### **Database Queries**
```sql
-- Check recent scores
SELECT * FROM game_scores ORDER BY created_at DESC LIMIT 10;

-- Check crash casino bets
SELECT * FROM crash_bets WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check chat messages
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 5;
```

## 🚨 **EMERGENCY FIXES**

### **Complete Casino Reset**
```sql
-- Clear all crash casino data (DESTRUCTIVE)
DELETE FROM crash_bets;
DELETE FROM crash_rounds;
-- Restart Render backend after this
```

### **Leaderboard Reset**
```sql
-- Reset jump game leaderboard (DESTRUCTIVE)  
DELETE FROM game_scores;
-- Leaderboard will rebuild automatically
```

### **Force Environment Refresh**
1. **Render**: Settings → Environment → Add dummy var → Remove it
2. **Vercel**: Settings → Environment Variables → Redeploy
3. **Browser**: Hard refresh (Ctrl+F5) to clear cache

---

**📞 Need help? Check browser console first, then backend logs!**
