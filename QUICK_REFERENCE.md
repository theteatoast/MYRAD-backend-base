# 🚀 Quick Reference Card

Keep this handy while deploying and testing MYRAD DataCoin.

---

## Commands Cheat Sheet

```bash
# Setup
npm install                      # Install all dependencies
npm run deploy                   # Deploy factory contract
npm run create "Name" "SYMBOL"  # Create new dataset token
npm run dev                      # Start API server (Terminal 1)
npm run listen                   # Start event listener (Terminal 2)

# Testing
curl http://localhost:4000/                    # Health check
curl http://localhost:4000/datasets            # List all tokens
curl http://localhost:4000/price/0xADDRESS    # Get token price
```

---

## URLs Reference

| Purpose | URL |
|---------|-----|
| **Frontend** | http://localhost:4000 |
| **Testnet RPC** | https://sepolia.base.org |
| **Block Explorer** | https://sepolia.basescan.org/ |
| **Get Testnet ETH** | https://www.basefaucet.io/ |
| **IPFS Gateway** | https://gateway.lighthouse.storage/ |

---

## Environment Variables

```env
BASE_SEPOLIA_RPC_URL    Network RPC endpoint
PRIVATE_KEY             Your wallet's private key
MYRAD_TREASURY          Platform wallet address
DOWNLOAD_SECRET         JWT signing secret
PORT                    API server port (default: 4000)
FACTORY_ADDRESS         Deployed factory address
```

---

## Expected Outputs

### After `npm run deploy`
```
✅ DataCoinFactory deployed to: 0x1234567890abcdef...
📡 Network: Base Sepolia (chainId: 84532)
💾 Factory address saved to .env.local
```

### After `npm run create "Test" "TEST"`
```
✅ DataCoin deployed at: 0xdef456...
✅ BondingCurve deployed at: 0xghi789...
✅ Creator allocation: 50000.0 tokens
✅ Platform allocation: 50000.0 tokens
✅ Bonding curve allocation: 900000.0 tokens
✅ Sent 0.005 ETH to bonding curve
```

### After `npm run dev`
```
🚀 Backend API running on port 4000
📊 Open http://localhost:4000
```

### After `npm run listen`
```
Using JsonRpcProvider (HTTP) for RPC: https://sepolia.base.org
Starting polling from block: 12345678
Listener running (HTTP polling). Poll interval: 8000 ms
```

---

## Token Allocation Breakdown

When you create a dataset token:

| Recipient | Amount | Percentage |
|-----------|--------|-----------|
| Bonding Curve | 900,000 | 90% |
| Creator | 50,000 | 5% |
| Platform | 50,000 | 5% |
| **Total** | **1,000,000** | **100%** |

**Allocation Times**:
- Creator gets 50k tokens immediately
- Platform gets 50k tokens immediately  
- Curve gets 900k tokens + 0.005 ETH immediately

---

## Bonding Curve Math

### Price Formula
```
Price per token = Total ETH in Curve / Total Tokens in Curve
```

### Example: First Buy

**Initial State**:
- ETH in Curve: 0.005
- Tokens in Curve: 900,000
- Price: 0.005 / 900,000 = 0.0000055 ETH/token

**User buys 0.001 ETH**:
- New ETH: 0.006
- Approx tokens: ~181
- New Price: 0.006 / (900,000 + 181) ≈ 0.0000066 ETH/token
- **Price increased!** ↑

**User sells 100 tokens**:
- ETH received: ~0.00065
- New ETH: 0.00535
- New Price: 0.00535 / 899,900 ≈ 0.0000059 ETH/token
- **Price decreased!** ↓

---

## API Endpoints

### `/` - Health Check
```
GET http://localhost:4000/
Response: "🚀 MYRAD Backend API running ✅"
```

### `/datasets` - List All Tokens
```
GET http://localhost:4000/datasets
Response: {
  "0xtoken1": { "symbol": "TEST", "cid": "ipfs://bafkrei..." }
}
```

### `/price/:curveAddress` - Current Price
```
GET http://localhost:4000/price/0xGHI789...
Response: {
  "price": "0.0000055",
  "ethBalance": "0.005",
  "tokenSupply": "900000.0"
}
```

### `/quote/buy/:curveAddress/:ethAmount` - Buy Estimate
```
GET http://localhost:4000/quote/buy/0xGHI789.../0.001
Response: {
  "ethAmount": "0.001",
  "tokenAmount": "181.81818...",
  "tokenAmountRaw": "181818180000000000000"
}
```

### `/quote/sell/:curveAddress/:tokenAmount` - Sell Estimate
```
GET http://localhost:4000/quote/sell/0xGHI789.../1000
Response: {
  "tokenAmount": "1000",
  "ethAmount": "0.0055",
  "ethAmountRaw": "5500000000000000"
}
```

### `/access/:user/:symbol` - Download After Burn
```
GET http://localhost:4000/access/0x342F.../TEST
Response: {
  "user": "0x342f...",
  "symbol": "TEST",
  "download": "https://gateway.lighthouse.storage/ipfs/bafkrei...?token=jwt",
  "ts": 1697234567890
}
```

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| "Port 4000 in use" | `lsof -i :4000` then `kill -9 <PID>` |
| "Module not found" | `npm install` again |
| "MetaMask not working" | Add Base Sepolia to MetaMask manually |
| "No testnet ETH" | https://www.basefaucet.io/ |
| "Factory not deployed" | Run `npm run deploy` |
| "Listener not running" | Make sure Terminal 2 is running `npm run listen` |
| "API not responding" | Check Terminal 1 is running `npm run dev` |
| "Buy/Sell errors" | Check you're on Base Sepolia + have ETH |

---

## File Locations

| File | Purpose |
|------|---------|
| `.env` | Your credentials |
| `contracts/BondingCurve.sol` | AMM contract |
| `contracts/DataCoin.sol` | Token contract |
| `contracts/DataCoinFactory.sol` | Factory contract |
| `frontend/app.js` | UI logic |
| `backend/server.js` | API endpoints |
| `backend/listener.js` | Event monitor |
| `backend/datasets.json` | Token registry |
| `backend/db.json` | Access logs |

---

## Common Workflows

### Create 3 Datasets
```bash
npm run create "Medical Data" "MEDDATA"
npm run create "Climate Data" "CLIMATE"
npm run create "E-commerce Data" "ECOM"
```

### Monitor Event Listener
```bash
# Terminal 2, watch for "🔥 Granting access" messages
npm run listen
```

### Check Token on Basescan
```
https://sepolia.basescan.org/address/0xDEF456...
```

### Test API
```bash
curl http://localhost:4000/datasets
curl http://localhost:4000/price/0xGHI789...
curl http://localhost:4000/quote/buy/0xGHI789.../0.001
```

---

## Terminal Setup

You need **2 terminals**:

**Terminal 1** (API):
```bash
npm run dev
# Output: 🚀 Backend API running on port 4000
# Keep running while using the app
```

**Terminal 2** (Listener):
```bash
npm run listen
# Output: Listener running (HTTP polling)
# Keep running to detect burns
```

**Terminal 3** (if needed for more commands):
```bash
# Use for npm run create, etc.
# Commands run and complete
```

---

## Key Addresses to Save

After deployment:

| Item | Address | Where |
|------|---------|-------|
| Factory | `0x...` | From `npm run deploy` |
| Token 1 | `0x...` | From `npm run create` |
| Curve 1 | `0x...` | From `npm run create` |
| Your Account | `0x342F483f...` | In MetaMask |
| Platform | `0x342F483f...` | In .env |

---

## Success Checklist

After each command:

```
npm install
  □ No errors
  □ node_modules/ created

npm run deploy
  □ No errors
  □ Factory address in output

npm run create "Test" "TEST"
  □ No errors
  □ Token address in output
  □ Curve address in output

npm run dev (Terminal 1)
  □ Says "Backend API running on port 4000"
  □ Stays running

npm run listen (Terminal 2)
  □ Says "Listener running"
  □ Stays running

Browser: http://localhost:4000
  □ Page loads
  □ Dataset visible
  □ "Connect Wallet" button shows

Connect Wallet
  □ MetaMask appears
  □ Address shows
  □ "Wallet connected" message

Buy Tokens
  □ No errors
  □ MetaMask confirmation
  □ Transaction confirmed
  □ Balance increases
  □ Price increases

Sell Tokens
  □ No errors
  □ Approval (if needed)
  □ Transaction confirmed
  □ ETH received
  □ Token balance decreases

Burn for Download
  □ Transaction confirmed
  □ Listener shows "🔥 Granting access"
  □ Download link opens
  □ File accessible
```

---

## Performance Notes

| Operation | Time | Cost |
|-----------|------|------|
| Deploy Factory | 30s | ~0.01 ETH |
| Create Token | 30s | ~0.01 ETH |
| Buy Tokens | 15-30s | ~0.001 ETH |
| Sell Tokens | 15-30s | ~0.001 ETH |
| Burn Tokens | 15-30s | ~0.001 ETH |
| Get Price | <1s | $0 |
| List Datasets | <1s | $0 |

**Total Setup Cost**: ~0.05 ETH per dataset

---

## Pro Tips

1. **Save your factory address** - you'll need it for creating tokens
2. **Keep listener running** - without it, burns won't be detected
3. **Monitor gas prices** - limit orders are cheap, so batch them
4. **Test thoroughly** - try all features before alpha testing
5. **Check Basescan** - verify all transactions and addresses
6. **Watch listener logs** - they show what's happening behind the scenes
7. **Use testnet first** - never use mainnet credentials in testing

---

## Next Steps

1. ✅ Read this quick reference
2. → Follow FINAL_STEPS.md for detailed setup
3. → Create multiple datasets and test
4. → Invite alpha testers
5. → Collect feedback
6. → Add features
7. → Audit contracts
8. → Deploy to mainnet

---

**Good luck! You've got this! 🚀**
