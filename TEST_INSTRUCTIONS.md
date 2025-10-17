# 🚀 Complete Testing Guide - Fixed Bonding Curve

## ✅ What Was Fixed

### Smart Contract Issues (CRITICAL)
1. **Division by Zero in getBuyAmount()** ✅ FIXED
   - Old: Used complex formula that could overflow/divide by zero
   - New: Simple linear formula: `tokensOut = (ethAmount * tokenBal) / ethBal`
   - With 10% slippage discount to account for price movement

2. **Division by Zero in getSellAmount()** ✅ FIXED
   - Old: Complex exponential-like calculations
   - New: Simple linear inverse: `ethOut = (tokenAmount * ethBal) / tokenBal`
   - With 10% slippage discount

3. **Empty Curve Handling** ✅ FIXED
   - Old: Would fail if tokens/ETH were 0
   - New: Returns sensible defaults (100 tokens per ETH initially)

### Backend Issues (FIXED)
1. **Listener event topic bug** ✅ FIXED
   - Old: Used `iface.getEventTopic()` (doesn't exist in ethers v6)
   - New: Uses `ethers.id()` for event topic calculation

2. **Token minting function** ✅ FIXED
   - Old: Tried to call `token.mint()` (doesn't exist)
   - New: Uses `.transfer()` to distribute pre-minted tokens

### Data Issues (CLEANED)
1. **Old buggy datasets** ✅ CLEARED
   - Deleted: WORK and KOMEDI tokens (had old broken contracts)
   - Fresh start: Empty datasets.json and db.json

---

## 📋 Step 1: Create Fresh Test Token

### Instructions:
1. Open browser: **http://localhost:4000/upload.html**
2. Upload any test file (CSV, PDF, etc.)
3. Fill form:
   - **Name**: `TestToken`
   - **Symbol**: `TEST`
   - **Description**: (optional)
4. Click **Create Dataset**
5. Wait for confirmation (should say "Dataset created successfully!")
6. Auto-redirected to main page

### What Happens Behind Scenes:
- ✅ Token created (ERC20) with 1,000,000 tokens total
- ✅ 90% (900,000) sent to bonding curve
- ✅ 5% (50,000) sent to platform treasury
- ✅ 5% (50,000) kept by creator
- ✅ Bonding curve initialized with 0.005 ETH
- ✅ Token registered in datasets.json

---

## 🔍 Step 2: Verify Token Created Correctly

**In terminal 1**, you should see:
```
🚀 Creating dataset token: TestToken (TEST)
   Uploader: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
   CID: bafkrei...

💰 Step 1: Creating token...
   ✅ Tx: 0x...
   ✅ Token: 0x...
   ✅ Curve: 0x...

💳 Step 2: Distributing token allocations...
   ✅ Platform: 50000.0 tokens
   ✅ Curve: 900000.0 tokens
   ✅ Creator: 50000.0 tokens

💧 Step 3: Initializing bonding curve liquidity...
   ✅ Sent 0.005 ETH to curve

📊 Bonding Curve State:
   ETH: 0.005 ETH
   Tokens: 900000.0
   Price: 0.0000055 ETH/token

📁 Step 4: Updating registry...
   ✅ Registered in datasets.json

✅ Dataset created successfully!
```

---

## 💰 Step 3: Test BUY (Most Important!)

### Instructions:
1. Go to: **http://localhost:4000**
2. Click **Connect Wallet** (MetaMask)
3. Approve network switch to Base Sepolia
4. Find **TEST** token
5. **VERIFY PRICE IS NOT 0.0** (should show ~0.0000055 ETH/token)
6. Enter: `0.001` in "ETH to spend"
7. Click **Buy**
8. Confirm in MetaMask
9. Wait ~30 seconds

### Expected Results:
- ✅ No "DIVIDE_BY_ZERO" error
- ✅ Status shows: "✅ Buy confirmed! Received ~XXX tokens"
- ✅ Your balance updates
- ✅ Price might slightly increase

### If Error Occurs:
- ❌ "execution reverted: Panic due to DIVIDE_BY_ZERO(18)"
  - This means old contract still deployed
  - Solution: Delete browser cache (Ctrl+Shift+Delete), refresh

---

## 📊 Step 4: Test SELL

### Instructions:
1. After successful buy, you have tokens
2. Enter: `100` in "Token amt"
3. Click **Sell**
4. Approve token (first time only)
5. Confirm in MetaMask
6. Wait ~30 seconds

### Expected Results:
- ✅ Status shows: "✅ Sell confirmed! Received ~0.000XXX ETH"
- ✅ Tokens deducted from your balance
- ✅ ETH added to your wallet
- ✅ No "Insufficient liquidity" errors

### If Error Occurs:
- ❌ "Insufficient liquidity or invalid amount"
  - This means curve doesn't have tokens
  - Solution: Curve should have 900k tokens, check if depleted

---

## 🔥 Step 5: Test BURN for Download

### CRITICAL: Listener MUST be running!

**In terminal 2**, start listener:
```bash
npm run listen
```

Should show:
```
Using JsonRpcProvider (HTTP) for RPC: https://sepolia.base.org
Starting polling from block: XXXXX
Listener running (HTTP polling). Poll interval: 8000 ms
```

### Instructions:
1. After buying and holding TEST tokens
2. Click **🔥 Burn for Download** button
3. Confirm burn in MetaMask
4. Wait...

### What Should Happen (Timeline):
- **0-2 seconds**: "🔥 Sending burn transaction..."
- **2-10 seconds**: "✅ Burned! Waiting for backend access..."
- **10-15 seconds**: Listener detects Transfer event
  - In terminal 2, you should see:
    ```
    Poll-detected burn: 0x342f... burned 100000.0 on 0x...
    🔥 Granting access: {user: ..., symbol: "TEST", ...}
    ```
- **15-20 seconds**: Frontend gets download URL
  - Status shows: "✅ Download opened!"
  - File downloads in browser

### Expected Download:
- File name: Whatever you uploaded
- Opens in new tab from Lighthouse IPFS gateway
- Can view/download directly

### If Error Occurs:

#### "⚠️ Burn confirmed but download not ready"
**Cause**: Listener didn't detect burn
- ✅ Check Terminal 2 is running
- ✅ Check datasets.json contains TEST token:
  ```bash
  cat backend/datasets.json | grep -i test
  ```
- ✅ Check db.json being updated:
  ```bash
  cat backend/db.json
  ```
- **Solution**: Restart listener
  ```bash
  # Stop Terminal 2 (Ctrl+C)
  npm run listen
  ```

#### db.json is still empty `[]`
**Cause**: Listener never ran or didn't detect events
- Solution: See above, restart listener

---

## 🎯 Complete End-to-End Flow

```
1. Create TEST token
   ↓
2. Connect wallet
   ↓
3. Buy 0.001 ETH worth → Get ~181 tokens (formula: 0.001 * 900k / 0.005)
   ↓
4. Check balance: 181 tokens
   ↓
5. Sell 100 tokens → Get ~0.000556 ETH back
   ↓
6. Check balance: 81 tokens
   ↓
7. Burn remaining 81 tokens
   ↓
8. Listener detects burn
   ↓
9. Download file automatically
   ↓
10. ✅ SUCCESS!
```

---

## 📊 Math Reference

With 0.005 ETH and 900,000 tokens in curve:

### Buy Formula:
```
tokensBought = ethSpent * tokenSupply / ethBalance
tokensOut = tokensBought * 0.9  (10% slippage)

Example: 0.001 ETH
= 0.001 * 900000 / 0.005
= 900 * 0.9
= 810 tokens (approx)
```

### Sell Formula:
```
ethReceived = tokenAmount * ethBalance / tokenSupply
ethOut = ethReceived * 0.9  (10% slippage)

Example: 100 tokens
= 100 * 0.005 / 900000
= 0.0005556 * 0.9
= 0.00050 ETH (approx)
```

### Price Formula:
```
Price per token = ethBalance / tokenSupply
= 0.005 / 900000
= 5.556e-9 ETH
= 0.0000055555... ETH (shown as 0.0000055)
```

---

## ✅ Success Checklist

- [ ] Token created (TEST token visible on main page)
- [ ] Price shows real number (NOT 0.0 ETH)
- [ ] Buy 0.001 ETH works (no DIVIDE_BY_ZERO error)
- [ ] Receive tokens (balance updates)
- [ ] Sell works (no "Insufficient liquidity" error)
- [ ] Get ETH back (wallet increases)
- [ ] Burn transaction confirms
- [ ] Listener detects burn (check Terminal 2 logs)
- [ ] Download appears (file opens in new tab)
- [ ] File is correct (same file you uploaded)

---

## 🆘 Troubleshooting

### Price still shows 0.0
- [ ] Clear browser cache: `Ctrl+Shift+Delete`
- [ ] Hard refresh: `Ctrl+Shift+R`
- [ ] Check dataset is TEST (not old WORK/KOMEDI)
- [ ] Check price endpoint: `curl http://localhost:4000/price/<CURVE_ADDRESS>`

### Buy fails with DIVIDE_BY_ZERO
- [ ] Old contract still in use
- [ ] Solution: Don't use WORK/KOMEDI, create new TEST token

### Sell says "Insufficient liquidity"
- [ ] Curve contract doesn't have 900k tokens
- [ ] You're trying to sell more than curve has
- [ ] Solution: Try selling less (e.g., 10 instead of 100)

### Burn doesn't grant download
- [ ] Listener not running
- [ ] Solution: `npm run listen` in Terminal 2
- [ ] Check Terminal 2 logs for "burn detected" messages

### Listener keeps showing polling errors
- [ ] RPC connection issue
- [ ] Solution: Restart listener

---

## 🚀 Commands Quick Reference

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Listener (REQUIRED for burn!)
npm run listen

# Terminal 3 - Tests/checks
curl http://localhost:4000/datasets
curl http://localhost:4000/price/0x...
cat backend/datasets.json
cat backend/db.json
```

---

## 📞 Final Notes

1. **ALWAYS run listener in Terminal 2** - without it, burn won't work
2. **Use only TEST token** - old WORK/KOMEDI have buggy contracts
3. **If anything fails**, check terminal logs first
4. **Clear cache** if you see old error messages
5. **Fresh start**: Delete `backend/datasets.json` and `backend/db.json` if you want clean slate

---

**Status: ✅ READY FOR TESTING**

Go through steps 1-5 carefully. Report any errors with exact error messages and I'll fix them.
