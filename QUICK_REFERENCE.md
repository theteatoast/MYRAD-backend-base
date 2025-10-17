# 🚀 MYRAD DataCoin - Quick Reference Guide

## System Status: ✅ FULLY OPERATIONAL

### Running Services
- API Server: http://localhost:4000 ✅
- Event Listener: Running in background ✅
- Smart Contracts: Deployed on Base Sepolia ✅

---

## 📍 Key Addresses

```
Factory:      0x2Ad81eeA7D01997588bAEd83E341D1324e85930A
Marketplace:  0x2eE75fC5D460b2Aa5eF676e1EEeb63CB0c6Df27f
USDC:         0x036cbd53842c5426634e7929541ec2318f3dcf7e
Your Wallet:  0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
```

---

## 🧪 5-Minute Test Workflow

### 1️⃣ Open & Connect
```
1. Open http://localhost:4000
2. Click "Connect Wallet"
3. Approve MetaMask (must be Base Sepolia)
4. Should show: "✅ Wallet connected"
```

### 2️⃣ Create Token
```
1. Click "Upload Dataset"
2. Upload any file
3. Fill form:
   Name: MyData
   Symbol: DATA (uppercase, 1-10 chars)
   Description: Test data
4. Click "Create Token"
5. Wait 1-2 minutes (check backend logs)
6. Token appears in list with price
```

### 3️⃣ Buy Tokens
```
1. Enter 0.1 USDC
2. Click "Buy"
3. Approve USDC in MetaMask
4. Confirm buy
5. Check message: "Buy confirmed!"
6. Balance should increase
```

### 4️⃣ Sell Tokens
```
1. Enter 100 tokens
2. Click "Sell"
3. Approve tokens in MetaMask
4. Confirm sell
5. Check message: "Sell confirmed!"
6. USDC balance increases
```

### 5️⃣ Burn for Download
```
1. Click "🔥 Burn for Download"
2. Enter amount in popup
3. Approve burn in MetaMask
4. Wait 5 seconds
5. Download link appears
6. Click to download file
```

---

## 💰 Typical Numbers

### Token Creation (90/5/5 split)
```
Input: 1 USDC + 900,000 tokens
Output:
  - Marketplace pool: 900,000 tokens
  - Your wallet: 0 tokens (went to pool)
  - Creator cut: 50,000 tokens
  - Treasury cut: 50,000 tokens
Price: 0.0000011 USDC/token
```

### Buying 0.1 USDC
```
Input: 0.1 USDC
Fee: 0.005 USDC (5%)
To pool: 0.095 USDC
Output: ~8,600 tokens
New price: slightly higher
```

### Selling 100 Tokens
```
Input: 100 tokens
No fees
Output: ~0.00011 USDC
New price: slightly lower
```

---

## 🔧 Debugging Commands

### Check Datasets
```bash
curl http://localhost:4000/datasets
```

### Check if Token Exists
```bash
curl http://localhost:4000/datasets
# Look for your token address
```

### Check Download Access
```bash
curl http://localhost:4000/access/0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9/DATA
# Should return download URL after burn
```

### Check Burn Records
```bash
cat backend/db.json
# Should have entry after burn
```

### Check Listener Logs
```bash
# In dev server output, look for:
# "🔥 Poll-detected burn:"
# "🔥 Granting access:"
```

---

## 📋 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "price: error" | Token pool not initialized - check creation logs |
| "pool not initialized" | User didn't have enough USDC - need 1+ USDC |
| "Buy fails: slippage" | Set minTokensOut to 0 in contract call |
| "Download not ready" | Wait 10+ seconds (listener polls every 8 sec) |
| "Wrong network" | Switch MetaMask to Base Sepolia (84532) |
| "No USDC balance" | Get faucet USDC from Base Sepolia |

---

## 📊 API Endpoints

### Get All Tokens
```
GET /datasets
Response: { token_addr: {symbol, cid, marketplace_address, ...}, ... }
```

### Get Token Price
```
GET /price/:marketplace/:token
Response: { price, tokenReserve, usdcReserve }
```

### Get Buy Quote
```
GET /quote/buy/:marketplace/:token/:usdcAmount
Response: { usdcAmount, tokenAmount, tokenAmountRaw }
```

### Get Sell Quote
```
GET /quote/sell/:marketplace/:token/:tokenAmount
Response: { tokenAmount, usdcAmount, usdcAmountRaw }
```

### Get Download Access
```
GET /access/:userAddress/:symbol
Response: { user, symbol, download, ts }
```

### Upload File
```
POST /upload (multipart form data)
Response: { success, cid, filename, ipfsUrl, gatewayUrl }
```

### Create Dataset
```
POST /create-dataset
Body: { cid, name, symbol, description }
Response: { success, tokenAddress, marketplaceAddress, symbol, name, cid }
```

---

## 🔄 Transaction Flow

```
User Action          → Smart Contract → Blockchain Event → Listener → DB Update → API Response
────────────────────   ───────────────   ──────────────   ────────   ──────────   ────────────
Upload file          → IPFS upload     → CID returned    -          -            JSON response
Create token         → Factory         → DataCoinCreated → Registry  -            Token address
Initialize pool      → Marketplace     → PoolCreated     → -         -            Success
Buy tokens           → Marketplace     → Bought          → -         -            Tokens sent
Sell tokens          → Marketplace     → Sold            → -         -            USDC sent
Burn for download    → Token           → Transfer(0x0)   → Listener  db.json      Download URL
```

---

## 🎯 Success Criteria

✅ All working when:
- Price shows actual USDC value
- Buy/Sell complete without errors
- Burn grants download within 10 seconds
- Backend logs show event detection
- db.json grows after burns

❌ Issues when:
- Price shows "error" or "pool not initialized"
- Buy/Sell fails with contract error
- Burn works but download never appears
- Backend logs don't show event detection
- db.json stays empty after burn

---

## 🚀 Production Checklist

Before deployment:
- [ ] Test token creation 3+ times
- [ ] Test buy/sell with different amounts
- [ ] Test burn → download flow
- [ ] Verify prices are reasonable
- [ ] Check all fees are collected
- [ ] Monitor backend logs for 24 hours
- [ ] Test on fresh browser (no cache)
- [ ] Have 10+ USDC available
- [ ] Document any issues found

---

## 🔗 Useful Links

- **Marketplace Contract**: https://sepolia.basescan.org/address/0x2eE75fC5D460b2Aa5eF676e1EEeb63CB0c6Df27f
- **USDC Token**: https://sepolia.basescan.org/token/0x036cbd53842c5426634e7929541ec2318f3dcf7e
- **Base Sepolia Faucet**: https://www.superbridge.app/base-sepolia
- **MYRAD Backend**: http://localhost:4000

---

## 📞 Getting Help

### Check System Health
```bash
curl http://localhost:4000/health
```

### Check Listener
```bash
# Look for "Listener running" in dev server logs
```

### Test Token Creation
1. Upload file
2. Check backend logs for "✅ Pool initialized"
3. Verify price appears in UI

### Debug Burn
1. Check backend logs for "🔥 Poll-detected burn:"
2. Check db.json file
3. Test /access endpoint directly

---

## 🎓 Key Concepts

### Constant Product Formula
```
k = tokenReserve × usdcReserve
This k stays constant across trades.
When you add USDC, tokens decrease to maintain k.
```

### 5% Fee on Buy
```
5% of USDC input goes to fees
80% of fees → creator
20% of fees → platform
Only on BUY, not on SELL
```

### Burn to Download
```
Token.burn() → Transfer(user, 0x0, amount)
Listener catches this event
Signs JWT token with download URL
User can download IPFS file
```

---

## 🎉 Ready to Go!

Your MYRAD DataCoin USDC Marketplace is fully deployed and operational.

**Start here**: Open http://localhost:4000 and test! 🚀

For detailed info, see:
- IMPLEMENTATION_COMPLETE_USDC.md (Full system overview)
- DEPLOYMENT_USDC_MARKETPLACE.md (Deployment guide)
