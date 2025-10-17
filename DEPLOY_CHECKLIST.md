# ✅ MYRAD DataCoin - Deployment Checklist

Complete this checklist to successfully deploy and test your platform.

## Pre-Deployment Checklist

- [ ] Base Sepolia testnet ETH in wallet (~0.1 ETH)
- [ ] MetaMask installed and configured for Base Sepolia
- [ ] `.env` file with credentials
- [ ] Dependencies installed with `npm install`
- [ ] Hardhat properly configured in `hardhat.config.js`

## Step 1: Deploy Factory Contract

```bash
npm run deploy
```

**Expected Output:**
```
Deployer: 0x...
Platform Treasury: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
🚀 Deploying DataCoinFactory...
✅ DataCoinFactory deployed to: 0x1234567890abcdef...
```

**Checklist:**
- [ ] No errors in deployment
- [ ] Factory address in output
- [ ] `.env.local` file created
- [ ] Address starts with `0x`
- [ ] Basescan shows contract code at address

## Step 2: Save Factory Address

1. Copy the factory address from deployment output
2. Add to `.env`:
   ```
   FACTORY_ADDRESS=0x1234567890abcdef...
   ```

**Checklist:**
- [ ] `FACTORY_ADDRESS` added to `.env`
- [ ] Correct format (0x followed by 40 hex chars)
- [ ] No extra spaces or quotes

## Step 3: Create First Dataset Token

```bash
npm run create "Medical Records Dataset" "MEDDATA"
```

**Expected Output:**
```
🔧 Configuration:
   Deployer: 0x...
   Platform: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
   Token: Medical Records Dataset (MEDDATA)
   
✅ DataCoin deployed at: 0xDEF456...
✅ BondingCurve deployed at: 0xGHI789...

💰 Step 2: Minting token allocations
   ✅ Creator allocation: 50000.0 tokens
   ✅ Platform allocation: 50000.0 tokens
   ✅ Bonding curve allocation: 900000.0 tokens

💧 Step 3: Initializing bonding curve with ETH liquidity
   ✅ Sent 0.005 ETH to bonding curve

📊 Bonding Curve State:
   ETH Balance: 0.005 ETH
   Token Supply: 900000.0 tokens
   Price per token: 0.0000055 ETH
```

**Checklist:**
- [ ] No errors during creation
- [ ] Token and bonding curve addresses in output
- [ ] Creator allocation: 50000 tokens
- [ ] Platform allocation: 50000 tokens
- [ ] Curve allocation: 900000 tokens
- [ ] ETH Balance: 0.005 ETH
- [ ] Price calculated correctly
- [ ] `backend/datasets.json` updated

## Step 4: Verify Contracts on Basescan

For each contract address from Step 3:

1. Go to https://sepolia.basescan.org/
2. Paste token address in search
3. Verify you see:
   - Token symbol (e.g., "MEDDATA")
   - Holders list
   - Transfer history
   - Token tracker

**Checklist:**
- [ ] Token contract visible on Basescan
- [ ] Correct symbol and name
- [ ] Bonding curve shows as holder with 900k tokens
- [ ] Creator shows as holder with 50k tokens
- [ ] Platform shows as holder with 50k tokens

## Step 5: Start Backend Services

**Terminal 1 - API Server:**
```bash
npm run dev
```

Expected: 
```
🚀 Backend API running on port 4000
📊 Open http://localhost:4000
```

**Checklist:**
- [ ] No errors in startup
- [ ] Port 4000 listening
- [ ] "Backend API running" message

**Terminal 2 - Event Listener:**
```bash
npm run listen
```

Expected:
```
Using JsonRpcProvider (HTTP) for RPC: https://sepolia.base.org
Starting polling from block: 12345678
Listener running (HTTP polling). Poll interval: 8000 ms
```

**Checklist:**
- [ ] No errors in startup
- [ ] Polling interval set correctly
- [ ] "Listener running" message
- [ ] Both services running simultaneously

## Step 6: Test Frontend

1. Open http://localhost:4000 in browser
2. You should see:
   - "MYRAD DataCoin MVP" title
   - "Connect Wallet" button
   - Your dataset listed (with MEDDATA symbol)

**Checklist:**
- [ ] Page loads without errors
- [ ] All UI elements visible
- [ ] Dataset shows correct symbol
- [ ] Price displays (e.g., "price: 0.0000055 ETH")

## Step 7: Connect Wallet

1. Click "Connect Wallet" button
2. MetaMask should popup
3. Verify you're on "Base Sepolia" network
4. Click "Connect"
5. Address should appear (e.g., "0x342F...")

**Checklist:**
- [ ] MetaMask popup appears
- [ ] Correct network selected
- [ ] Address displays after connection
- [ ] "Wallet connected" message shown
- [ ] "Connect Wallet" button hidden

## Step 8: Test Token Purchase

1. Ensure you have testnet ETH (if not, get from faucet)
2. Enter `0.001` in "ETH to spend" input
3. Click "Buy" button
4. Confirm transaction in MetaMask
5. Wait for confirmation

**Expected:**
```
⏳ Confirm buy in wallet...
✅ Buy confirmed! Received ~X tokens
```

**Checklist:**
- [ ] No errors in buy process
- [ ] MetaMask confirmation requested
- [ ] Transaction confirmed on blockchain
- [ ] Balance increased
- [ ] Price in UI updated

## Step 9: Test Token Sale

1. Ensure you have tokens from Step 8
2. Enter `100` in "Token amt" input
3. Click "Sell" button
4. Approve if prompted
5. Confirm transaction in MetaMask
6. Wait for confirmation

**Expected:**
```
⏳ Approving token for swap...
✅ Approved, now selling...
✅ Sell confirmed! Received ~X ETH
```

**Checklist:**
- [ ] Approval transaction (if needed)
- [ ] Sell confirmation requested
- [ ] Transaction confirmed
- [ ] ETH balance increased in wallet
- [ ] Token balance decreased
- [ ] Price updated higher (since less tokens sold)

## Step 10: Test Burn for Download

1. Buy some more tokens (0.001 ETH)
2. Click "🔥 Burn for Download" button
3. Wait for blockchain confirmation
4. Listen should detect the burn

**Expected:**
```
🔥 Sending burn transaction...
✅ Burned! Waiting for backend access...
✅ Download opened!
```

**Expected in Listener logs:**
```
🔥 Granting access: {
  "user": "0x...",
  "symbol": "MEDDATA",
  "downloadUrl": "https://gateway.lighthouse.storage/ipfs/...",
  "ts": ...
}
```

**Checklist:**
- [ ] Burn transaction confirmed
- [ ] Listener detects burn in logs
- [ ] IPFS download link generated
- [ ] Download opens in new tab
- [ ] File accessible from IPFS

## Post-Deployment Verification

### API Endpoints

Test these endpoints in browser:

```
GET /datasets
http://localhost:4000/datasets

GET /price
http://localhost:4000/price/0xGHI789...

GET /quote/buy
http://localhost:4000/quote/buy/0xGHI789.../0.001

GET /quote/sell
http://localhost:4000/quote/sell/0xGHI789.../1000

GET /access
http://localhost:4000/access/0x342F.../MEDDATA
```

**Checklist:**
- [ ] All endpoints respond without errors
- [ ] Data format is correct JSON
- [ ] Price quotes are reasonable
- [ ] Access endpoint returns download link after burn

### Data Files

Check these files were created/updated:

**`backend/datasets.json`**
```json
{
  "0xtoken1": {
    "symbol": "MEDDATA",
    "cid": "bafkreif...",
    "bonding_curve": "0xcurve1",
    "creator": "0xcreator1",
    "timestamp": 1697234567890
  }
}
```

**`backend/db.json`**
Should contain access entries after burns.

**`backend/lastBlock.json`**
Should contain latest processed block number.

**Checklist:**
- [ ] `datasets.json` contains your token
- [ ] `db.json` has access logs after burns
- [ ] `lastBlock.json` updates after listener runs

## Troubleshooting During Deployment

| Issue | Solution |
|-------|----------|
| "FACTORY_ADDRESS not set" | Deploy factory first, add address to `.env` |
| "Connection refused" | Verify RPC URL is correct and accessible |
| "Insufficient gas" | Get more testnet ETH from faucet |
| "Token not in datasets.json" | Token creation failed, check logs |
| "Listener not working" | Make sure both server AND listener running |
| "Can't connect wallet" | Add Base Sepolia to MetaMask |
| "Buy/Sell buttons unresponsive" | Check you're on correct network and have ETH |

## Success Criteria

You know deployment is successful when:

✅ Factory deployed to Base Sepolia
✅ Token created with bonding curve
✅ Frontend displays dataset
✅ Wallet connects properly
✅ Can buy tokens (price increases)
✅ Can sell tokens (price decreases)
✅ Can burn tokens for download
✅ Download link works
✅ All API endpoints functional
✅ Data files created properly

## Next Steps After Deployment

1. **Create more datasets**: `npm run create "Name" "SYMBOL"`
2. **Monitor on Basescan**: Track transactions and balances
3. **Test thoroughly**: Try edge cases, stress test
4. **Add features**:
   - File upload (replace hardcoded CID)
   - Creator dashboard
   - Analytics/charts
5. **Prepare for mainnet**: When ready to go live

## Important Notes

⚠️ **Security**
- These are testnet credentials for testing only
- Never use private key on mainnet in plain text
- Change `DOWNLOAD_SECRET` before production

⚠️ **Gas Costs**
- Each contract deploy: ~0.01-0.02 ETH
- Each token creation: ~0.01-0.02 ETH
- Each transaction: ~0.001-0.005 ETH

⚠️ **Rate Limits**
- Basescan API: 5 requests/second
- RPC node: Check provider limits
- Frontend polling: 1 second between updates

---

**🎉 Complete this checklist to verify your MYRAD DataCoin deployment!**
