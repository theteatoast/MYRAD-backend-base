# Complete Testing Guide - Buy, Sell, & Burn Functionality

## ✅ System Status: READY FOR TESTING

All critical bugs have been fixed and the platform is ready for comprehensive testing of the three core features.

---

## 🧪 TEST 1: Buy Tokens

### Prerequisites
- ✅ Wallet connected to Base Sepolia testnet
- ✅ MetaMask installed with test ETH
- ✅ A dataset token available (TEST token at `0xA78B71E4F785538D92f8975EE75039583FB1c31c`)

### Test Steps
1. Open http://localhost:4000 in your browser
2. Click "Connect Wallet" and approve the connection
3. Find the TEST dataset token
4. Enter an amount in "ETH to spend (e.g. 0.001)" field
5. Click "Buy" button
6. Confirm the transaction in MetaMask
7. Wait for confirmation

### Expected Results
| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Valid buy | Shows tokens to receive, confirms tx, updates balance | ✅ Ready |
| Zero ETH | Alert shows "Enter ETH amount to spend" | ✅ Ready |
| Invalid amount | Alert shows error message | ✅ Ready |
| Contract error | Shows "❌ Contract error:" with details | ✅ Ready |
| No wallet | Alert shows "Connect wallet first" | ✅ Ready |

### What was fixed
- **Division by zero in `getBuyAmount()`**: When price is 0 (initial state), contract now handles gracefully
- **Price update**: Now displays correctly with proper error handling
- **Frontend validation**: Contract existence verified before calling

---

## 🧪 TEST 2: Sell Tokens

### Prerequisites
- ✅ User has bought some tokens (from Test 1)
- ✅ Wallet connected
- ✅ Token balance > 0

### Test Steps
1. On http://localhost:4000, scroll to the dataset
2. Enter amount in "Token amt (e.g. 100)" field
3. Click "Sell" button
4. Review the ETH you'll receive
5. Confirm in MetaMask (may ask for token approval first)
6. Wait for confirmation

### Expected Results
| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Valid sell | Calculates ETH, requests approval if needed, confirms tx | ✅ Ready |
| Zero tokens | Alert shows "Enter token amount to sell" | ✅ Ready |
| Insufficient balance | Shows error in MetaMask | ✅ Ready |
| Need approval | Auto-requests token approval, then proceeds | ✅ Ready |
| Contract error | Shows detailed error message | ✅ Ready |

### What was fixed
- **Division by zero in `getSellAmount()`**: Added check for tokenSupply == 0
- **Approval handling**: Frontend checks allowance and requests approval if needed
- **Error messages**: Comprehensive error handling for all edge cases

---

## 🔥 TEST 3: Burn for Download

### Prerequisites
- ✅ User has tokens (from Test 1)
- ✅ Wallet connected
- ✅ Listener service running (`npm run listen` in another terminal)

### Test Steps
1. On http://localhost:4000, find the dataset
2. Click "🔥 Burn for Download" button
3. Confirm the burn action in MetaMask
4. Wait for backend to detect the burn and grant access
5. Download should open in a new tab

### Expected Results
| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Valid burn | Burns all tokens, waits for backend, opens download | ✅ Ready |
| No wallet | Alert shows "Connect wallet first" | ✅ Ready |
| Burn detected | Backend listener detects Transfer to 0x0 | ✅ Ready |
| Access granted | Signed download URL provided with 30min expiry | ✅ Ready |
| Timeout | Shows "⚠️ Burn confirmed but download not ready" | ✅ Ready |

### What was fixed
- **No changes to burn logic** - it was already working
- **Listener setup**: Polls for Transfer events (burn) and grants access via signed URLs
- **JWT token**: 30-minute expiry on download links for security

---

## 🚀 COMPLETE WORKFLOW TEST

### Full User Journey
1. **Upload**: Go to `/upload.html`
   - Select a file (CSV, PDF, JSON, ZIP up to 10MB)
   - Enter dataset name, symbol, description
   - File uploads to Lighthouse IPFS
   - Token created on blockchain with BondingCurve
   - Registered in datasets.json

2. **Trade**: Go to `/` (main page)
   - Connect wallet
   - See all available datasets
   - Buy tokens with ETH
   - Sell tokens back
   - Check balance updates

3. **Burn & Access**: Continue on main page
   - Burn tokens to get download access
   - Listener detects burn
   - Backend signs download URL
   - File downloads from Lighthouse

---

## 📊 BONDING CURVE MECHANICS

### Initial State
- Token Supply: 900,000 tokens
- ETH Liquidity: 0.005 ETH
- Initial Price: ~0.0000000055 ETH per token (rounds to 0)
- Creator Allocation: 50,000 tokens (5%)
- Platform Allocation: 50,000 tokens (5%)

### Price Formula
```
price = (ethBalance * 1e18) / tokenSupply
```

### Buy Formula
When price = 0 (initial):
```
tokensToReceive = ethSpent * 1e18
```

When price > 0:
```
newPrice = ((ethBalance + ethSpent) * 1e18) / (tokenSupply + ethSpent / currentPrice)
avgPrice = (currentPrice + newPrice) / 2
tokensToAdd = ethSpent / avgPrice
```

### Sell Formula
```
newSupply = tokenSupply - tokenAmount
newEthBalance = (newSupply > 0) ? (newSupply * ethBalance) / tokenSupply : 0
ethToReturn = ethBalance - newEthBalance
```

---

## 🔍 DEBUGGING TIPS

### If buy fails with BAD_DATA error
- ✅ This should be fixed now with the division by zero check
- Check that bonding curve contract is deployed correctly
- Verify token supply and ETH balance are set correctly

### If price shows "error"
- Check console for error messages
- Verify contract address in datasets.json is correct
- Ensure contract exists at that address on Base Sepolia

### If sell fails
- Check token allowance with MetaMask
- Verify you have tokens to sell
- Check gas prices and wallet balance

### If burn/download fails
1. Ensure listener is running: `npm run listen`
2. Check listener logs for Transfer events
3. Verify db.json is being created with burn records
4. Check `/access/:user/:symbol` endpoint returns download URL

---

## 📋 CHECKLIST FOR COMPLETION

- [x] BondingCurve.sol compiled without errors
- [x] New test token created with fixed contract
- [x] Price endpoint working (`/price/:curveAddress`)
- [x] Buy quote endpoint working (`/quote/buy/:curveAddress/:ethAmount`)
- [x] Sell quote endpoint working (`/quote/sell/:curveAddress/:tokenAmount`)
- [x] Frontend error handling implemented
- [x] Buy function has contract validation
- [x] Sell function has approval handling
- [x] Burn function has listener integration
- [x] Upload page fully functional
- [x] Dataset creation endpoint working
- [x] Listener service setup

---

## 🚀 NEXT STEPS

1. **Local Testing**
   - Run: `npm run dev` (backend + frontend)
   - Run: `npm run listen` (listener in another terminal)
   - Visit: http://localhost:4000

2. **Upload Test Dataset**
   - Click "📤 Create Dataset"
   - Upload a file
   - Create token

3. **Trade Test**
   - Connect wallet
   - Buy some tokens
   - Sell some tokens
   - Burn to download

4. **Monitor Logs**
   - Backend logs show price updates
   - Listener logs show burn detection
   - Frontend status shows operation results

---

## ✅ FINAL STATUS

**All three core features are now fully functional and ready for testing:**

1. **Buy Tokens** ✅
   - Fixed division by zero in getBuyAmount()
   - Proper error handling
   - Real-time price display

2. **Sell Tokens** ✅
   - Fixed division by zero in getSellAmount()
   - Token approval handling
   - Proper error messages

3. **Burn for Download** ✅
   - Listener detects burn events
   - Signed download URLs generated
   - 30-minute token expiry

**Platform is production-ready for testing!**
