# 🚀 MYRAD DataCoin Setup Guide

Complete step-by-step guide to deploy and run the MYRAD DataCoin platform with bonding curve AMM.

## ⚡ Prerequisites

- **Node.js**: v16+ (with npm or yarn)
- **MetaMask**: Browser extension installed
- **Base Sepolia ETH**: Some testnet ETH for gas fees (~0.1 ETH should be enough)
- **.env file**: With required API keys and wallet credentials

## 🔑 Step 1: Setup Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your details:
   ```env
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   PRIVATE_KEY=03031b4a3e28790d8c67fa17e199360b72bcdbc8b1861c19da505de1be2fd77c
   MYRAD_TREASURY=0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
   DOWNLOAD_SECRET=your-secret-key-here
   PORT=4000
   ```

### Get Base Sepolia Testnet ETH

If you don't have testnet ETH:
1. Go to https://www.basefaucet.io/
2. Connect your wallet
3. Request testnet ETH

## 📦 Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Hardhat (for smart contract compilation)
- Ethers.js (for blockchain interaction)
- OpenZeppelin Contracts (for secure token implementation)
- Express (for backend API)

## 🔗 Step 3: Deploy Factory Contract

The factory contract creates new DataCoin tokens with bonding curves.

```bash
npm run deploy
```

**Output:**
```
Deployer: 0x...
Platform Treasury: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9

🚀 Deploying DataCoinFactory...
✅ DataCoinFactory deployed to: 0x1234567890abcdef...
📡 Network: Base Sepolia (chainId: 84532)
🔗 Explorer: https://sepolia.basescan.org/address/0x1234567890abcdef...

💾 Factory address saved to .env.local

📋 Next steps:
   1. Set FACTORY_ADDRESS in your .env: 0x1234567890abcdef...
   2. Create a token: npm run create "Dataset Name" "SYMBOL"
   3. Start backend: npm run dev
   4. Start listener: npm run listen
   5. Open http://localhost:4000
```

**Save the factory address**, you'll need it for the next step.

## 📝 Step 4: Create First Dataset Token

After factory deployment, create a DataCoin token for a dataset:

```bash
npm run create "Medical Records Dataset" "MEDDATA"
```

**Parameters:**
- `NAME`: Name of the dataset (required)
- `SYMBOL`: Token ticker/symbol (required)
- All other parameters are default:
  - Total Supply: 1,000,000 tokens
  - Creator gets: 50,000 tokens (5%)
  - Platform gets: 50,000 tokens (5%)
  - Bonding curve gets: 900,000 tokens (90%)
  - Initial liquidity: ~0.005 ETH (~$5)
  - IPFS CID: hardcoded (will add upload later)

**Example output:**
```
🔧 Configuration:
   Deployer: 0xYourAddress...
   Platform: 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
   Token: Medical Records Dataset (MEDDATA)
   CID: bafkreifpymts2rinunnptk6pejo3znkuag7yevcty2qmuhuu7jmglmyo34
   Initial Liquidity: 0.005 ETH

🚀 Step 1: Creating token via factory
   ✅ Tx confirmed: 0xabc123...
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

📁 Step 4: Updating backend datasets
   ✅ Updated backend/datasets.json

🎉 Success! Token created and ready to trade
   Token: 0xDEF456...
   Bonding Curve: 0xGHI789...
   Network: Base Sepolia
   Explorer: https://sepolia.basescan.org/address/0xDEF456...

   Start trading now on http://localhost:4000
```

**Verify on Basescan:**
- Token contract: https://sepolia.basescan.org/address/0xDEF456...
- Bonding curve: https://sepolia.basescan.org/address/0xGHI789...

## 🖥️ Step 5: Start Backend Services

Open **two separate terminal windows**.

### Terminal 1: Start API Server

```bash
npm run dev
```

Expected output:
```
🚀 Backend API running on port 4000
📊 Open http://localhost:4000
```

### Terminal 2: Start Event Listener

In a new terminal:
```bash
npm run listen
```

Expected output:
```
Using JsonRpcProvider (HTTP) for RPC: https://sepolia.base.org
Starting polling from block: 12345678
Listener running (HTTP polling). Poll interval: 8000 ms
```

## 🌐 Step 6: Access the Frontend

1. Open your browser
2. Go to: **http://localhost:4000**
3. You should see:
   - "MYRAD DataCoin MVP" title
   - "Connect Wallet" button
   - Your created dataset(s) listed

## 💰 Step 7: Test Token Trading

### Connect Wallet

1. Click **"Connect Wallet"** button
2. MetaMask should popup
3. Make sure you're on **Base Sepolia** testnet
4. Click "Connect"
5. Your address should appear (e.g., "0x342F...")

### Buy Tokens

1. Enter ETH amount (e.g., `0.001` ETH)
2. Click **"Buy"** button
3. Confirm in MetaMask
4. Wait for transaction confirmation
5. Your balance should increase

**Bonding Curve Mechanics:**
- Early buyers get better prices (exponential curve)
- Price increases as more people buy
- This creates natural incentive for early adopters

### Sell Tokens

1. Enter token amount (e.g., `100` tokens)
2. Click **"Sell"** button
3. Approve tokens if first time
4. Confirm in MetaMask
5. Receive ETH back (slightly less due to curve)

### Burn for Download Access

1. Click **"🔥 Burn for Download"** button
2. This burns all your tokens
3. Listener detects the burn event
4. Backend generates signed IPFS download link
5. Link opens automatically

## 📊 Understanding the Economics

### Token Allocation (per dataset)

When a new dataset token is created:

| Allocation | Amount | Purpose |
|-----------|--------|---------|
| **Bonding Curve** | 90% | Trading liquidity, users can buy/sell |
| **Creator** | 5% | Rewards dataset creator |
| **Platform** | 5% | MYRAD treasury (at 0x342F...) |

### Bonding Curve Pricing

The bonding curve uses a linear formula:

```
Price = ETH_Balance / Token_Supply
```

**Example:**
- Initial: 0.005 ETH, 900,000 tokens
- Price: 0.005 / 900,000 = 0.0000055 ETH per token (~$0.000018)
- When $5 more bought: Price rises to match new ratio
- When users sell: Price decreases

This creates a **Pump.fun-like dynamic** where:
- Early buyers pay low prices
- Price increases with each buy
- Late sellers get lower prices
- Incentivizes early participation

## 🔐 Access Control via Token Burning

Users gain dataset access by burning tokens:

1. User buys tokens on bonding curve
2. User burns tokens to gain access
3. **Critical**: User can't dump after downloading (tokens are burned)
4. Backend generates 30-minute download link
5. User downloads data from Lighthouse IPFS gateway

This prevents:
- Free riding (must own tokens to access)
- Dumping after access (tokens are burned)
- Creating sustainable monetization for datasets

## 🛠️ Troubleshooting

### "FACTORY_ADDRESS not set in .env"

After deploying the factory:
1. Get the factory address from deployment output
2. Add to `.env`: `FACTORY_ADDRESS=0x...`
3. Try creating token again

### "Transaction failed: insufficient gas"

1. You need more Base Sepolia testnet ETH
2. Get ETH from faucet: https://www.basefaucet.io/
3. Try again with more ETH

### "Listener not detecting burn"

1. Make sure listener is running: `npm run listen`
2. Check that `backend/datasets.json` contains your token
3. Check listener logs for errors
4. Wait a few blocks for event to be confirmed

### "Can't connect to MetaMask"

1. Install MetaMask browser extension
2. Add Base Sepolia network:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency: ETH
3. Switch to Base Sepolia testnet
4. Try connecting again

### "Buy/Sell buttons not working"

1. Make sure wallet is connected (address showing)
2. Make sure you're on Base Sepolia testnet
3. Make sure you have testnet ETH
4. Check browser console for errors
5. Refresh page and try again

## 📚 API Endpoints

The backend provides useful API endpoints:

### GET /datasets
Returns all created token datasets.

```bash
curl http://localhost:4000/datasets
```

Response:
```json
{
  "0xdcbfa10e65e0a2a4e91990e8702f60789bb9df0a": {
    "symbol": "DS1",
    "cid": "ipfs://bafkreif...",
    "bonding_curve": "0x...",
    "creator": "0x...",
    "timestamp": 1697234567890
  }
}
```

### GET /price/:curveAddress
Get current bonding curve price.

```bash
curl http://localhost:4000/price/0xGHI789...
```

Response:
```json
{
  "price": "0.0000055",
  "ethBalance": "0.005",
  "tokenSupply": "900000.0"
}
```

### GET /quote/buy/:curveAddress/:ethAmount
Estimate tokens received from buying ETH worth.

```bash
curl http://localhost:4000/quote/buy/0xGHI789.../0.001
```

### GET /quote/sell/:curveAddress/:tokenAmount
Estimate ETH received from selling tokens.

```bash
curl http://localhost:4000/quote/sell/0xGHI789.../1000
```

### GET /access/:user/:symbol
Get download link after burning tokens.

```bash
curl http://localhost:4000/access/0x342F.../DS1
```

## 🔗 Smart Contracts Deployed

After setup, you have:

1. **DataCoinFactory** (0x...)
   - Deploys new DataCoin tokens
   - Deploys bonding curve for each token

2. **DataCoin** (one per dataset)
   - ERC20 token representing the dataset
   - Burn mechanism for access control

3. **BondingCurve** (one per dataset)
   - Handles token trading (buy/sell)
   - Manages ETH liquidity
   - Pricing algorithm

## 📈 Creating Multiple Datasets

After your first dataset works, create more:

```bash
npm run create "Healthcare Genomics" "GENOME"
npm run create "Climate Data 2024" "CLIMATE"
npm run create "E-commerce Patterns" "SHOP"
```

Each creates:
- New token contract
- New bonding curve
- Automatic price discovery
- Independent liquidity

## 🚀 Next Steps (Future)

### Phase 2 (Coming Soon)

- [ ] **File Upload**: Replace hardcoded CID with actual file uploads
- [ ] **UI Improvements**: Dataset metadata, descriptions, previews
- [ ] **Analytics Dashboard**: Track token performance, trading volume
- [ ] **Creator Dashboard**: Manage datasets, withdraw earnings
- [ ] **Advanced Trading**: Limit orders, charts, history

### Phase 3 (Roadmap)

- [ ] **Mainnet Deployment**: Move to Base mainnet
- [ ] **Cross-chain**: Support other blockchains
- [ ] **DAO Governance**: Community-driven dataset curation
- [ ] **Marketplace**: Browse and discover datasets

## 💬 Support & Questions

For issues:
1. Check troubleshooting section above
2. Review Basescan for transaction details
3. Check listener logs for event processing issues
4. Open an issue in the repository

## 📖 Additional Resources

- **Hardhat Docs**: https://hardhat.org/
- **Ethers.js**: https://docs.ethers.org/
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/
- **Base Network**: https://docs.base.org/
- **Basescan Explorer**: https://sepolia.basescan.org/

---

**🎉 You're all set! Start building with MYRAD DataCoin.**
