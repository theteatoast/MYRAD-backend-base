# ✅ Final Test Checklist - MYRAD DataCoin MVP

## 🎯 Objective
Verify that all three critical fixes are working correctly:
1. ✅ **DIVIDE_BY_ZERO error is fixed** (Buy operation)
2. ✅ **Price displays correctly** (Shows actual ETH value, not 0.0)
3. ✅ **Burn-to-download flow works** (Listener detects burn, grants access)

---

## 🚀 Quick Start (5 minutes)

### Phase 1: Setup (1 minute)
- [ ] Connected to Base Sepolia testnet in MetaMask
- [ ] Have some test ETH in wallet (~0.05 ETH minimum)
- [ ] Open app at http://localhost:4000

### Phase 2: Create Dataset (2 minutes)
- [ ] Click "Upload Dataset" or "Create" button
- [ ] Upload any file (CSV, PDF, TXT, etc.)
- [ ] Fill form:
  - Name: `TestData` or similar
  - Symbol: `TEST` (uppercase)
  - Description: `Test dataset`
- [ ] Click "Create Token"
- [ ] Wait for confirmation (30-60 seconds)

**Expected**: 
- ✅ No errors during creation
- ✅ "Dataset created successfully" message

### Phase 3: Verify Token (1 minute)
- [ ] Look at new token in the list
- [ ] Check **Price** field shows a number (NOT 0.0 ETH)
- [ ] Your balance shows actual tokens

**Expected**:
- ✅ Price shows something like "0.0000000000000055 ETH"
- ✅ Your balance shows tokens (e.g., "balance: 50000")

### Phase 4: Test Buy (1 minute)
- [ ] Enter ETH amount (e.g., 0.001)
- [ ] Click "Buy"
- [ ] Confirm in MetaMask

**Expected**:
- ✅ "Buy confirmed! Received ~X tokens" message
- ✅ NO "DIVIDE_BY_ZERO" error
- ✅ Balance increases

### Phase 5: Test Burn (1 minute)
- [ ] Click "🔥 Burn for Download" button
- [ ] Click in the prompt popup to confirm amount
- [ ] Confirm in MetaMask

**Expected**:
- ✅ "Burned! Waiting for backend access..." message
- ✅ After 2-3 seconds: "✅ Download opened!" OR download starts
- ✅ NO "download not ready" after waiting

---

## 🔍 Detailed Verification Steps

### Test 1: DIVIDE_BY_ZERO Fix
```
TEST: Buy button should NOT show Panic error
RESULT: ✅ or ❌
```

**Steps**:
1. Create dataset (if not done)
2. Enter 0.001 ETH
3. Click "Buy"
4. Should see success, not "Panic due to DIVIDE_BY_ZERO(18)"

**If Failed**:
- Check contracts compiled: `npx hardhat compile`
- Check artifacts updated
- Clear cache, restart

---

### Test 2: Price Display
```
TEST: Price should show non-zero value for new tokens
RESULT: ✅ or ❌
```

**Expected Values**:
- With 0.005 ETH and 900,000 tokens in curve
- Price ≈ 0.000000000000005555 ETH per token
- Should NOT be "0.0 ETH"

**If Shows 0.0 ETH**:
- Curve has no ETH → ETH transfer failed
- Check backend logs for ETH transfer errors
- Re-create token with monitoring

---

### Test 3: Burn-to-Download Flow
```
TEST: Burn should grant download access
RESULT: ✅ or ❌
```

**Flow**:
1. Burn some tokens
2. Wait 2-3 seconds
3. Should get download URL

**Debug Steps if Failed**:
1. Check backend logs for: `🔥 Poll-detected burn:` or `🔥 Transfer burn detected`
2. Check if burn event was emitted in explorer
3. Check `backend/db.json` - should have an entry after burn
4. Check if `/access/{user}/{symbol}` endpoint returns download URL

**Example curl to test endpoint**:
```bash
curl http://localhost:4000/access/0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9/TEST
```

---

## 📋 Backend Verification

### Check Services Running
```bash
# Backend status
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":...}

# Check datasets
curl http://localhost:4000/datasets
# Expected: {} (empty) or {token_address: {...}}
```

### Check Listener
The listener should be running in background (started by `npm run dev`).

Look for logs like:
```
Starting polling from block: 123456
🔥 Poll-detected burn: 0x... burned 1000 on 0xTOKEN
🔥 Granting access: { user: 0x..., symbol: TEST, ... }
```

### Check Files
```bash
# Datasets registry
cat backend/datasets.json
# Should show created tokens

# Burn records
cat backend/db.json
# Should show burn entries after you burn tokens
```

---

## ⚠️ Common Issues & Solutions

### Issue: Price still shows 0.0 ETH
**Symptoms**: Token created but price is 0.0 ETH

**Causes**:
1. ETH transfer failed during creation
2. Contract constructor failed
3. Curve contract has wrong code

**Solutions**:
```bash
# Recompile
npx hardhat compile

# Check curve has ETH in explorer
# https://sepolia.basescan.org/address/CURVE_ADDRESS

# Re-create token (might need more gas)
# Delete old dataset from datasets.json
```

---

### Issue: Buy shows DIVIDE_BY_ZERO error
**Symptoms**: "Panic due to DIVIDE_BY_ZERO(18)" when clicking Buy

**Causes**:
1. Old contract code still deployed
2. Artifacts not updated
3. Curve initialization failed

**Solutions**:
```bash
# Verify compilation
npx hardhat compile

# Check artifacts timestamp
ls -l artifacts/contracts/BondingCurve.sol/BondingCurve.json

# If stale, clear and recompile
rm -rf artifacts/
npx hardhat compile

# Restart dev server
# (Dev server will auto-restart on file changes)
```

---

### Issue: Burn confirmed but download never ready
**Symptoms**: "⚠️ Burn confirmed but download not ready"

**Causes**:
1. Listener not detecting burn event
2. Address mismatch in listener
3. db.json not being updated

**Debug**:
```bash
# Check backend logs for burn detection
# Look for: 🔥 Poll-detected burn: 

# Check if burn was recorded
cat backend/db.json
# Should have an entry like:
# {"user": "0x...", "symbol": "TEST", "downloadUrl": "...", "ts": ...}

# Test endpoint directly
curl http://localhost:4000/access/YOUR_ADDRESS/TEST
# Should return {"download": "https://...", ...}
```

**Fix**:
1. Restart listener/backend: `npm run dev`
2. Check RPC is responding: `curl https://sepolia.base.org`
3. Check burn event in explorer
4. Wait 5+ seconds for polling to catch up (HTTP polling is 8s intervals)

---

### Issue: Frontend button click does nothing
**Symptoms**: Click Buy/Sell/Burn, nothing happens

**Causes**:
1. MetaMask not connected
2. Wrong network selected
3. Frontend error

**Solutions**:
1. Click "Connect Wallet" first
2. Verify MetaMask shows Base Sepolia (84532)
3. Check browser console for errors (F12)

---

## 🎯 Success Criteria

### All Tests Pass When:
- [ ] ✅ Buy works without DIVIDE_BY_ZERO error
- [ ] ✅ Price shows non-zero ETH value for new tokens
- [ ] ✅ Buy transaction confirms and gives tokens
- [ ] ✅ Sell transaction confirms and returns ETH
- [ ] ✅ Burn transaction confirms
- [ ] ✅ Download link appears within 5 seconds of burn
- [ ] ✅ Can click download and access file

### What Each Test Proves:
| Test | Proves |
|------|--------|
| Price non-zero | ETH reached curve during init ✅ |
| Buy success | `getBuyAmount()` works correctly ✅ |
| Sell success | Curve has both ETH and tokens ✅ |
| Burn → Download | Listener detects event ✅ |
| Download works | Backend endpoint returns URL ✅ |

---

## 📝 Testing Report Template

Use this to document your testing:

```
# Test Report - [DATE]

## Environment
- Network: Base Sepolia (84532)
- Wallet: [YOUR_ADDRESS]
- Backend: Running on http://localhost:4000

## Token Created
- Name: [NAME]
- Symbol: [SYMBOL]
- Contract: [TOKEN_ADDRESS]
- Curve: [CURVE_ADDRESS]

## Test Results

### Test 1: Buy
- Input: 0.001 ETH
- Expected: ~1.8 tokens (formula: 0.001 * 900000 / 0.005 * 0.9)
- Actual: [YOUR_RESULT]
- Status: ✅ / ❌

### Test 2: Sell
- Input: 100 tokens
- Expected: ~0.00055 ETH (formula: 100 * 0.005 / 900000 * 0.9)
- Actual: [YOUR_RESULT]
- Status: ✅ / ❌

### Test 3: Burn
- Input: All remaining balance
- Expected: Download link within 5 seconds
- Actual: [YOUR_RESULT]
- Status: ✅ / ❌

## Issues Encountered
- [List any issues]

## Conclusion
All tests: ✅ PASSED / ⚠️ PARTIAL / ❌ FAILED
```

---

## 🎓 Understanding the Math

### Buy Calculation
```
Input: 0.001 ETH to spend
Curve State: 0.005 ETH, 900,000 tokens

Tokens received = (ethAmount × tokenBalance) / ethBalance
                = (0.001 × 900,000) / 0.005
                = 900 / 0.005
                = 180,000 tokens

With 10% slippage: 180,000 × 0.9 = 162,000 tokens
```

### Sell Calculation
```
Input: 100 tokens to sell
Curve State: 0.005 ETH, 900,000 tokens

ETH received = (tokenAmount × ethBalance) / tokenBalance
             = (100 × 0.005) / 900,000
             = 0.5 / 900,000
             = 0.00000055 ETH

With 10% slippage: 0.00000055 × 0.9 = 0.000000495 ETH
```

---

## ✅ Final Checklist

Before submitting results:
- [ ] All three critical fixes verified working
- [ ] Created at least one new dataset
- [ ] Tested Buy, Sell, and Burn operations
- [ ] No DIVIDE_BY_ZERO errors
- [ ] Price displays correctly
- [ ] Burn grants download access
- [ ] All logs show expected messages
- [ ] db.json updated after burn

---

## 🚀 You're Done!
If all tests pass, the fixes are complete and working! 🎉

Submit your test results showing:
1. Token creation successful
2. Price non-zero
3. Buy/Sell working
4. Burn → Download working
