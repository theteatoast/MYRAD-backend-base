# MYRAD DataCoin MVP

A blockchain-based platform for tokenizing datasets and monetizing data access. Users can create ERC20 tokens (DataCoins) that represent datasets, trade them on Uniswap, and burn tokens to gain IPFS download access to the underlying data.

---

## 📋 Project Overview

**MYRAD DataCoin** is a complete backend + frontend dApp that enables:

- **Dataset Tokenization**: Create ERC20 tokens that represent datasets stored on IPFS
- **Token Trading**: Buy/sell tokens on Uniswap V2 or via on-site swaps
- **Data Access Control**: Burn tokens to gain time-limited download access to IPFS data
- **Automated Listener**: Monitor blockchain events and grant access to users who burn tokens
- **Backend API**: Serve dataset metadata and access logs

---

## 🗂️ Directory Structure

```
myrad-complete-backend/
│
├── contracts/                    # Solidity smart contracts (Base Sepolia)
│   ├── DataCoin.sol             # ERC20 token contract for datasets
│   └── DataCoinFactory.sol      # Factory to create DataCoin tokens
│
├── backend/                      # Node.js backend services
│   ├── server.js                # Express API server
│   ├── listener.js              # Blockchain event listener (polls or WebSocket)
│   ├── config.js                # Configuration (RPC, PORT, secrets)
│   ├── utils.js                 # JWT signing & database helpers
│   ├── db.json                  # Access log database (auto-generated)
│   ├── datasets.json            # Registry of created tokens (auto-updated)
│   └── lastBlock.json           # Last processed block (for listener resumption)
│
├── frontend/                     # Web UI
│   ├── index.html               # Main page
│   ├── app.js                   # React-like vanilla JS frontend
│   └── style.css                # Styling
│
├── scripts/                      # Deployment & management scripts
│   ├── deployFactory.js         # Deploy DataCoinFactory contract
│   └── createDataCoin.js        # Create a DataCoin token with liquidity
│
├── artifacts/                    # Compiled Solidity ABIs & bytecode (auto-generated)
├── cache/                        # Hardhat cache (auto-generated)
│
├── hardhat.config.js            # Hardhat configuration (Base Sepolia)
├── package.json                 # Dependencies & scripts
└── README.md                     # This file
```

---

## 🔧 Smart Contracts

### DataCoin.sol

**Purpose**: ERC20 token contract that represents a monetized dataset.

**Key Features**:
- Extends OpenZeppelin's ERC20 and AccessControl
- `MINTER_ROLE`: Controls who can mint new tokens
- `datasetCid`: Stores IPFS CID of the dataset
- **Functions**:
  - `constructor()`: Initialize token with name, symbol, initial supply, and IPFS CID
  - `mint(address to, uint256 amount)`: Only MINTER_ROLE can mint
  - `burn(uint256 amount)`: User burns their tokens
  - `burnForAccess()`: User burns entire balance to gain data access

**Role Distribution**:
- Factory contract: DEFAULT_ADMIN_ROLE + MINTER_ROLE
- Creator: DEFAULT_ADMIN_ROLE + MINTER_ROLE (can mint more tokens later)

---

### DataCoinFactory.sol

**Purpose**: Factory contract to create new DataCoin tokens.

**Key Features**:
- Allows any user to call `createDataCoin()` to deploy a new token
- Emits `DataCoinCreated` event with token address and metadata CID
- Sets creator as admin and minter of their token

**Function**:
- `createDataCoin(name, symbol, totalSupply, unused, metadataCid)`: Creates and returns new DataCoin address

---

## 🖥️ Backend

### server.js

**Purpose**: Express API server that serves frontend and provides blockchain data endpoints.

**Port**: `4000` (or `process.env.PORT`)

**Endpoints**:
- `GET /` - Health check ("MYRAD Backend API running ✅")
- `GET /datasets` - Returns all registered tokens from `datasets.json`
  ```json
  {
    "0xtoken1": { "symbol": "DS1", "cid": "ipfs://bafkreif..." },
    "0xtoken2": { "symbol": "DS2", "cid": "ipfs://bafkrei..." }
  }
  ```
- `GET /access/:user/:symbol` - Returns latest access record for user + dataset
  ```json
  {
    "user": "0x342f...",
    "symbol": "DS1",
    "download": "https://gateway.lighthouse.storage/ipfs/...?token=jwt_token",
    "ts": 1697234567890
  }
  ```

**Features**:
- Serves static frontend files from `frontend/` directory
- Returns 404 if no access record exists (user hasn't burned tokens yet)

---

### listener.js

**Purpose**: Monitors blockchain events and grants data access when tokens are burned.

**How It Works**:

1. **Provider Selection**:
   - Uses WebSocket provider if RPC is `ws://` or `wss://`
   - Falls back to HTTP polling for regular RPC endpoints
   - Poll interval: 8 seconds

2. **Event Monitoring**:
   - Listens for `Transfer` events (detects burn by checking `to === ZeroAddress`)
   - Listens for `Redeemed` events (custom token redemption)

3. **Access Granting**:
   - When a burn is detected, calls `handleRedeemOrBurn()`
   - Signs a time-limited (30min) JWT token for IPFS gateway access
   - Saves access record to `db.json`
   - Returns Lighthouse gateway URL with JWT

4. **State Management**:
   - Saves last processed block to `lastBlock.json`
   - On restart, resumes from last block (avoids duplicates)
   - Periodically polls `datasets.json` to detect new tokens

5. **Error Handling**:
   - Graceful fallback for large getLogs queries
   - Skips parse errors for mismatched event signatures
   - Catches and logs handler errors without crashing

**Environment Variables**:
- `BASE_SEPOLIA_RPC_URL`: RPC endpoint (HTTP or WebSocket)
- `DOWNLOAD_SECRET`: Secret key for JWT signing

---

### config.js

**Purpose**: Centralized configuration management.

**Variables**:
- `RPC`: Blockchain RPC endpoint from `BASE_SEPOLIA_RPC_URL`
- `PORT`: Server port (default: 4000)
- `DOWNLOAD_SECRET`: Secret for signing download URLs (default: "secret")
- `DB_FILE`: Path to access database (`backend/db.json`)
- `DATASETS_FILE`: Path to token registry (`backend/datasets.json`)

---

### utils.js

**Purpose**: Utility functions for data access management.

**Functions**:

- `signDownloadUrl(cid, user)`: Creates a JWT-signed Lighthouse gateway URL
  - Creates JWT with `{cid, user, ts}`
  - Token expires in 30 minutes
  - Returns: `https://gateway.lighthouse.storage/ipfs/{cid}?token={jwt}`

- `saveAccess(entry)`: Appends access record to `db.json`
  - Entry structure:
    ```json
    {
      "user": "0x...",
      "symbol": "DS1",
      "token": "0x...",
      "amount": "1000000000000000000",
      "downloadUrl": "https://...",
      "ts": 1697234567890
    }
    ```

---

## 💻 Scripts

### deployFactory.js

**Purpose**: Deploy DataCoinFactory contract to Base Sepolia.

**Steps**:
1. Compiles and deploys `DataCoinFactory`
2. Waits for confirmation
3. Logs deployed address

**Usage**:
```bash
npm run deploy
```

**Output**:
```
Deploying from: 0x...
✅ DataCoinFactory deployed to: 0x...
```

---

### createDataCoin.js

**Purpose**: Create a new DataCoin token with initial allocations and liquidity.

**Steps**:
1. **Create Token**: Calls factory to deploy DataCoin
2. **Parse Event**: Extracts token address from `DataCoinCreated` event
3. **Mint Allocations**:
   - Creator: 80% of supply
   - Treasury (`MYRAD_TREASURY`): 15% of supply
   - Liquidity: 5% of supply
4. **Add Liquidity**: Pairs 5% of tokens with 0.002 ETH on Uniswap V2
5. **Update Backend**: Adds token to `datasets.json` for listener discovery

**Usage**:
```bash
node scripts/createDataCoin.js <FACTORY_ADDRESS> "<NAME>" "<SYMBOL>" <SUPPLY> "<IPFS_CID>"
```

**Example**:
```bash
node scripts/createDataCoin.js 0x1234... "Medical Data 1" "MDATA1" 1000000 "ipfs://bafkrei..."
```

**Environment Variables Required**:
- `BASE_SEPOLIA_RPC_URL`: RPC endpoint
- `PRIVATE_KEY`: Signer's private key
- `MYRAD_TREASURY`: Treasury wallet address

**Output**:
```
🚀 Creating token via factory...
📜 Tx confirmed: 0x...
✅ DataCoin deployed at: 0x...
✅ Minted allocations — Creator: 800000, Treasury: 150000
💧 Liquidity added successfully (0.002 ETH paired).
🗂 Updated backend/datasets.json
🎉 Done!
```

---

## 🎨 Frontend

### index.html

**Structure**:
- Container with title "MYRAD DataCoin MVP"
- Wallet connection area
- Datasets display section
- Status message area

**Libraries**:
- Ethers.js v6 (loaded from CDN before app.js)

---

### app.js

**Purpose**: Main frontend application (vanilla JavaScript).

**Key Components**:

1. **Wallet Connection**:
   - Connects to MetaMask via `window.ethereum`
   - Displays shortened user address
   - Sets global `signer`, `provider`, `userAddress`

2. **Dataset Loading**:
   - Fetches token metadata from `/datasets` endpoint
   - Renders each token with buy/sell options
   - Displays user balance via `balanceOf()` calls

3. **Token Trading** (two modes):
   - **On-site Swap**: Via Uniswap V2 Router
     - `buyToken()`: Swaps ETH → token
     - `sellToken()`: Swaps token → ETH
     - Simulates swap before executing to catch errors
     - Falls back to Uniswap.org if no liquidity
   - **Uniswap Redirect**: Direct links to Uniswap interface

4. **Burn for Download**:
   - `burnForAccess()`: Burns entire balance
   - Calls token's `burnForAccess()` or `redeem()` method
   - Polls `/access/:user/:symbol` endpoint every 1 second (20 tries)
   - Opens download link when access is granted

**Configuration** (must set for your network):
```javascript
const ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Uniswap V2 Router
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";    // WETH token
```

**Features**:
- Slippage tolerance: 10%
- Swap deadline: 10 minutes
- Graceful error handling with fallback to Uniswap
- Real-time balance updates

---

## 🚀 Getting Started

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables** (create `.env` file):
   ```env
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   PRIVATE_KEY=0x...
   MYRAD_TREASURY=0x...
   DOWNLOAD_SECRET=your-secret-key
   PORT=4000
   ```

3. **Deploy factory**:
   ```bash
   npm run deploy
   ```
   Note the deployed factory address.

### Creating a Dataset

1. **Prepare IPFS CID**:
   - Upload dataset to IPFS (use Lighthouse, Pinata, etc.)
   - Get the CID (e.g., `bafkrei...`)

2. **Create DataCoin**:
   ```bash
   node scripts/createDataCoin.js <FACTORY_ADDRESS> "Dataset Name" "SYMBOL" 1000000 "ipfs://bafkrei..."
   ```

3. **Start backend services**:
   ```bash
   npm run dev         # Start API server
   npm run listen      # Start listener in another terminal
   ```

4. **Access frontend**:
   - Open `http://localhost:4000` in browser
   - Connect MetaMask to Base Sepolia testnet
   - Buy tokens, burn for access, etc.

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User (MetaMask Wallet)                   │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─── [Connect Wallet] ──→ BrowserProvider
         │
         ├─── [Load Datasets] ──→ GET /datasets ──→ Returns token list
         │
         ├─── [Buy Token] ──→ Uniswap Router.swapExactETHForTokens()
         │                ──→ Blockchain: ETH → Token
         │
         ├─── [Burn Token] ──→ Token.burnForAccess()
         │                 ──→ Blockchain: Token burned
         │
         └─── [Get Download] ──→ Listener detects burn event
                             ──→ Signs JWT & saves to db.json
                             ──→ GET /access/:user/:symbol
                             ──→ Returns signed IPFS gateway URL

┌──────────────────────────────────────┐
│      Blockchain (Base Sepolia)       │
│ ┌──────────────────────────────────┐ │
│ │  DataCoin (ERC20 + AccessControl)│ │
│ └──────────────────────────────────┘ │
│              ▲
│              │ Events: Transfer, Redeemed
│              │
│ ┌──────────────────────────────────┐ │
│ │   DataCoinFactory                │ │
│ │   (creates new DataCoin tokens)  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
         │
         │ Listener (listener.js) polls or subscribes
         │
    ┌────▼─────────────────────────────┐
    │  Backend (server.js + listener.js)│
    │  ├─ db.json (access logs)         │
    │  ├─ datasets.json (token registry)│
    │  └─ lastBlock.json (sync state)   │
    └─────────────────────────────────────┘
         │
         ├─→ IPFS (Lighthouse Gateway)
         │   "ipfs://CID" files
         │
         └─→ API Endpoints
             /datasets, /access/:user/:symbol
```

---

## 📝 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_SEPOLIA_RPC_URL` | - | **Required**. RPC endpoint for Base Sepolia |
| `PRIVATE_KEY` | - | **Required**. Private key for deployments & token creation |
| `MYRAD_TREASURY` | - | **Required**. Treasury wallet address (receives 15% of new tokens) |
| `DOWNLOAD_SECRET` | "secret" | Secret for JWT signing (use strong value in production) |
| `PORT` | 4000 | Port for Express server |

---

## 🔌 Available NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start backend API server (port 4000) |
| `npm run deploy` | Deploy DataCoinFactory contract |
| `npm run create` | Create new DataCoin (use with arguments) |
| `npm run listen` | Start blockchain event listener |
| `npm run server` | Alias for `npm run dev` |

---

## 🛠️ Architecture Decisions

1. **Solidity Contracts (Base Sepolia)**:
   - ERC20 + AccessControl for flexible token management
   - Factory pattern for user-created tokens
   - No custom burn events; standard Transfer event to ZeroAddress

2. **Backend**:
   - Express for simplicity and lightweight API
   - File-based JSON storage (db.json, datasets.json) for prototyping
   - WebSocket + HTTP dual-mode listener for flexibility
   - JWT signing for time-limited access to IPFS data

3. **Frontend**:
   - Vanilla JS (no React/Vue) for minimal dependencies
   - Ethers.js v6 for blockchain interaction
   - Automatic Uniswap fallback if on-site swap fails

4. **Data Access**:
   - IPFS gateway with JWT authentication (Lighthouse)
   - 30-minute token expiry for security
   - Event-driven access granting (no polling from frontend)

---

## ⚠️ Security Notes

- **Private Key**: Never commit `.env` files. Use environment variables.
- **Download Secret**: Use a cryptographically strong secret (not "secret").
- **JWT Expiry**: Tokens expire in 30 minutes. Adjust as needed.
- **AccessControl**: Only minters can mint. Creators are minters of their own tokens.
- **Slippage**: Frontend uses 10% slippage tolerance. Adjust for volatile tokens.

---

## 🧪 Testing

### Deploy Factory
```bash
npm run deploy
```

### Create a Test Token
```bash
node scripts/createDataCoin.js 0x... "Test Data" "TEST" 1000000 "ipfs://bafkrei..."
```

### Start Services
```bash
npm run dev   # Terminal 1
npm run listen # Terminal 2 (separate terminal)
```

### Test Frontend
1. Open `http://localhost:4000` in browser
2. Connect MetaMask to Base Sepolia
3. Buy tokens via swap
4. Burn tokens
5. Check access log: `backend/db.json`

---

## 📚 References

- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **Hardhat**: https://hardhat.org/
- **Base Sepolia**: https://docs.base.org/
- **Uniswap V2**: https://docs.uniswap.org/contracts/v2/overview

---

## 📄 License

MIT

---

## 🤝 Contributing

For contributions, feature requests, or bug reports, open an issue or PR.

---

**Last Updated**: October 2024
**Version**: 2.0.0
