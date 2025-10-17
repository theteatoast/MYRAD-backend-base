# 🚀 Deployment Guide: MYRAD DataCoin with USDC Marketplace

## Architecture Overview

Your MYRAD DataCoin system now uses:
- **DataTokenMarketplace.sol**: Constant product AMM for USDC ↔ DataToken trading
- **DataCoin.sol**: ERC20 tokens with burn functionality
- **Base Sepolia testnet**: Public test network with USDC support
- **USDC (6 decimals)**: Stable asset for liquidity

## Step-by-Step Deployment

### Step 1: Verify Environment Setup ✅

```bash
# Check that .env has:
FACTORY_ADDRESS=0x2Ad81eeA7D01997588bAEd83E341D1324e85930A
BASE_SEPOLIA_USDC=0x036CbD53842c5426634E7929541eC2318f3dCF7e
MARKETPLACE_ADDRESS=0x0000000000000000000000000000000000000000 (will update)
```

### Step 2: Deploy DataTokenMarketplace Contract

```bash
# Compile
npx hardhat compile

# Deploy marketplace
npx hardhat run scripts/deployMarketplace.js --network baseSepolia
```

**Output example**:
```
🚀 Deploying DataTokenMarketplace...
   Deployer: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
   USDC: 0x036CbD53842c5426634E7929541eC2318f3dCF7e
   Treasury: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9

✅ Marketplace deployed!
   Address: 0x... (COPY THIS)
   Explorer: https://sepolia.basescan.org/address/0x...

📝 Update .env with:
   MARKETPLACE_ADDRESS=0x...
```

### Step 3: Update .env with Marketplace Address

```bash
# Edit .env and set:
MARKETPLACE_ADDRESS=<address from step 2>
```

### Step 4: Get USDC Tokens (Testnet)

You need USDC on Base Sepolia to initialize pools. You have 20 USDC already.

**To get more USDC**:
1. Use a faucet: https://www.superbridge.app/base-sepolia
2. Bridge USDC from another testnet
3. Use existing balance (you have 20)

**Check balance**:
```bash
# View on explorer
https://sepolia.basescan.org/token/0x036CbD53842c5426634E7929541eC2318f3dCF7e?a=YOUR_ADDRESS
```

### Step 5: Start the Platform

```bash
# Kill old process if running
npm run dev

# Should see:
# 🚀 Starting MYRAD DataCoin Platform...
# 📡 Starting API Server...
# 👀 Starting Event Listener...
# ✅ Platform startup initiated
```

---

## Testing the Complete Workflow

### Test 1: Create a Dataset with USDC Pool

**Expected**:
- Token created
- Pool initialized with 1 USDC + 900,000 tokens
- Price displayed

**Steps**:
1. Open http://localhost:4000
2. Connect MetaMask wallet (Base Sepolia)
3. Click "Upload Dataset"
4. Select a file, fill form, create
5. Wait 1-2 minutes

**Check**:
- Dataset appears in list
- Price shows something like "0.0000000011 USDC"
- Not "price: error" or "pool not initialized"

### Test 2: Buy Tokens with USDC

**Expected**:
- User spends 0.1 USDC
- Receives tokens (about 90,000 tokens)
- No contract errors

**Steps**:
1. Enter 0.1 USDC
2. Click "Buy"
3. Approve USDC in MetaMask
4. Confirm buy

**Check**:
- "Buy confirmed!" message
- Balance increases
- No "error" messages

### Test 3: Sell Tokens for USDC

**Expected**:
- User sells 100 tokens
- Receives USDC back (about 0.00000011 USDC)

**Steps**:
1. Enter 100 tokens
2. Click "Sell"
3. Approve tokens
4. Confirm sell

**Check**:
- "Sell confirmed!" message
- USDC balance increases

### Test 4: Burn for Download

**Expected**:
- User burns remaining tokens
- Gets download link within 5 seconds

**Steps**:
1. Click "🔥 Burn for Download"
2. Confirm amount in popup
3. Confirm burn in MetaMask
4. Wait 5 seconds

**Check**:
- "Burned! Waiting for backend access..." appears
- After 5 seconds: download link appears
- Listener logs show: `🔥 Poll-detected burn:`
- db.json has entry

---

## Architecture Details

### Token Creation Flow (90/5/5 Split)

```
User uploads file
  ↓
File stored on IPFS (Lighthouse)
  ↓
DataCoin token created via factory
  ↓
Token allocation:
  - 90% (900,000) → Marketplace liquidity pool
  - 5% (50,000) → Creator wallet
  - 5% (50,000) → Platform treasury
  ↓
Pool initialized:
  - 900,000 tokens + 1 USDC → constant product AMM
  ↓
Price: 1 USDC / 900,000 tokens ≈ 0.0000011 USDC/token
```

### Buy/Sell Formula (Constant Product)

```
Invariant: k = rToken × rUSDC (constant)

For buying:
  USDC in (with 5% fee deducted)
  New rUSDC = rUSDC + usdcToPool
  New rToken = k / rUSDC
  Tokens out = rToken - newRToken

For selling:
  Tokens in
  New rToken = rToken + tokensIn
  New rUSDC = k / newRToken
  USDC out = rUSDC - newRUSDC
```

### Burn & Download Flow

```
User burns tokens
  ↓
Token contract emits Transfer(user, 0x0, amount)
  ↓
Listener detects burn (polls every 8 seconds)
  ↓
Listener signs JWT download URL
  ↓
Listener saves to db.json
  ↓
Frontend polls /access endpoint
  ↓
Backend returns download URL
  ↓
Frontend opens download link
```

---

## Important Addresses

```
Base Sepolia USDC:        0x036CbD53842c5426634E7929541eC2318f3dCF7e
DataCoinFactory:          0x2Ad81eeA7D01997588bAEd83E341D1324e85930A
DataTokenMarketplace:     (deploy step 2)
Creator/Treasury wallet:  0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
```

---

## File Structure

```
contracts/
  ├── DataCoin.sol                  (ERC20 token with burn)
  ├── DataCoinFactory.sol           (Creates tokens)
  └── DataTokenMarketplace.sol      (NEW: USDC AMM)

backend/
  ├── server.js                     (API endpoints)
  ├── createDatasetAPI.js           (Token creation)
  ├── listener.js                   (Event detection)
  ├── start-all.js                  (Master startup)
  ├── datasets.json                 (Token registry)
  ├── db.json                       (Burn/access records)
  └── config.js

frontend/
  ├── app.js                        (USDC trading UI)
  ├── index.html
  ├── upload.html
  └── style.css

scripts/
  ├── deployFactory.js              (Factory deployment)
  └── deployMarketplace.js          (Marketplace deployment)
```

---

## Troubleshooting

### Error: "MARKETPLACE_ADDRESS not configured"
- Run marketplace deployment (step 2)
- Update .env with returned address
- Restart server

### Error: "Insufficient USDC"
- Check balance: https://sepolia.basescan.org/token/0x036CbD53842c5426634E7929541eC2318f3dCF7e
- Get more USDC from faucet
- Need at least 1 USDC per token creation

### Error: "pool not initialized"
- Token created but pool init failed
- Check if user had enough USDC
- Check backend logs for errors

### Burn shows "download not ready"
- Listener might not have detected burn yet
- Wait 10+ seconds (polling every 8 seconds)
- Check backend logs: `🔥 Poll-detected burn:`
- Check db.json for entry

### Frontend shows "contract not found"
- Check marketplace address in datasets.json
- Verify on explorer: https://sepolia.basescan.org/address/{ADDRESS}

---

## Success Indicators

✅ All working when:
- Price shows real USDC value (not error)
- Buy succeeds with USDC deduction
- Sell succeeds with USDC received
- Burn → download within 10 seconds
- No contract panics or reverts

---

## Key Differences from ETH Version

| Feature | ETH (Old) | USDC (New) |
|---------|-----------|-----------|
| Liquidity | 0.005 ETH | 1 USDC |
| Buy input | ETH amount | USDC amount |
| Price display | ETH/token | USDC/token |
| Liquidit formula | Linear | Constant product |
| Fee | None | 5% on buy |
| Fee split | N/A | 80% creator, 20% treasury |

---

## Production Checklist

Before going live:
- [ ] Test all 4 operations (create, buy, sell, burn)
- [ ] Verify prices are reasonable
- [ ] Check download links work
- [ ] Monitor backend logs for errors
- [ ] Have sufficient USDC for operations
- [ ] Update MARKETPLACE_ADDRESS in all configs
- [ ] Test on fresh browser (no cache issues)
- [ ] Verify event listener is catching burns

---

## Next Steps

1. **Deploy marketplace** (if not done): Follow step 2 above
2. **Start platform**: `npm run dev`
3. **Test workflow**: Follow "Testing the Complete Workflow" above
4. **Monitor logs**: Watch backend output for issues
5. **Iterate**: Fix any issues and re-test

---

You're ready to launch! 🚀
