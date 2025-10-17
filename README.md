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
│ └─────────────────────��────────────┘ │
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

---

## 🐛 Troubleshooting

### "Router contract not found" Error
**Cause**: `ROUTER_ADDRESS` is invalid or not deployed on the network.

**Solution**:
1. Check `ROUTER_ADDRESS` in `frontend/app.js` is correct for your chain
2. Verify the address on block explorer (e.g., Basescan)
3. Use Uniswap redirect as fallback (automatically done if router not found)

---

### "No liquidity or incompatible router" Error
**Cause**: Token has no liquidity pool or router doesn't support the pair.

**Solution**:
1. Ensure `createDataCoin.js` successfully added liquidity
2. Check Uniswap on Basescan for the pool: `WETH ↔ TokenAddress`
3. Manually add liquidity via Uniswap if needed
4. Use Uniswap interface directly as fallback

---

### "Burn failed" or "Redeemed event not detected"
**Cause**:
- Listener not running
- Event not indexed correctly
- `datasets.json` not updated with new token

**Solution**:
1. Ensure `npm run listen` is running in another terminal
2. Check `backend/datasets.json` contains the new token address
3. Check listener logs for errors
4. Verify token address matches `DataCoinCreated` event

---

### "Access not granted after burn"
**Cause**:
- Listener hasn't processed the burn event yet
- Network latency or RPC timeout

**Solution**:
1. Wait a few seconds and try again
2. Check listener logs: `backend/listener.js` should log `"🔥 Granting access: "`
3. Check `backend/db.json` for the access record
4. Ensure `BASE_SEPOLIA_RPC_URL` is a valid, responding endpoint

---

### "Invalid nonce" Error
**Cause**: Multiple concurrent transactions from same wallet without waiting.

**Solution**:
1. Wait for transaction confirmation before sending next one
2. Check wallet nonce on Basescan
3. Use manual nonce management if needed (see `createDataCoin.js` for example)

---

### "ENS resolution failed" Error
**Cause**: Ethers v6 attempting to resolve ENS names on networks without support.

**Solution**:
- Already fixed in `createDataCoin.js` by disabling ENS resolution
- No action needed

---

## 📡 API Reference

### GET /datasets

Fetch all registered DataCoin tokens.

**Request**:
```bash
curl http://localhost:4000/datasets
```

**Response** (200 OK):
```json
{
  "0xdcbfa10e65e0a2a4e91990e8702f60789bb9df0a": {
    "symbol": "DS1",
    "cid": "ipfs://bafkreifpymts2rinunnptk6pejo3znkuag7yevcty2qmuhuu7jmglmyo34"
  },
  "0x1234567890abcdef1234567890abcdef12345678": {
    "symbol": "MDATA",
    "cid": "ipfs://bafkreitest123"
  }
}
```

**Response** (200 OK, no datasets):
```json
{}
```

---

### GET /access/:user/:symbol

Fetch the latest access record for a user and dataset.

**Request**:
```bash
curl http://localhost:4000/access/0x342Fcc7A64A9dB5b12Ae69Caf8aA05c9/DS1
```

**Response** (200 OK):
```json
{
  "user": "0x342fcc7a64a9db5b12ae69caf8aa05c9",
  "symbol": "DS1",
  "download": "https://gateway.lighthouse.storage/ipfs/bafkreif...?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ts": 1697234567890
}
```

**Response** (404 Not Found):
```json
{
  "error": "not found"
}
```

**Response** (404 No database):
```json
{
  "error": "no redemptions"
}
```

---

### GET /

Health check endpoint.

**Request**:
```bash
curl http://localhost:4000/
```

**Response** (200 OK):
```
MYRAD Backend API running ✅
```

---

## 🔗 Smart Contract Interaction Guide

### Create a DataCoin Token (via Factory)

**Contract**: DataCoinFactory at `0x...`

**Function**: `createDataCoin(name, symbol, totalSupply, unused, metadataCid)`

**Parameters**:
- `name` (string): Full name (e.g., "Medical Dataset 1")
- `symbol` (string): Short ticker (e.g., "MDATA")
- `totalSupply` (uint256): Total supply in wei (e.g., `ethers.parseUnits("1000000", 18)`)
- `unused` (uint256): Legacy parameter, pass `0`
- `metadataCid` (string): IPFS CID (e.g., "bafkrei...")

**Example (Ethers.js)**:
```javascript
const factory = new ethers.Contract(
  "0x...",
  ["function createDataCoin(string,string,uint256,uint256,string) returns (address)"],
  signer
);

const tx = await factory.createDataCoin(
  "Medical Data",
  "MDATA",
  ethers.parseUnits("1000000", 18),
  0,
  "ipfs://bafkrei..."
);

const receipt = await tx.wait();
console.log("Token created at:", receipt.events[0].args.dataCoinAddress);
```

---

### Mint Tokens

**Contract**: DataCoin at `0x...`

**Function**: `mint(address to, uint256 amount)` (only MINTER_ROLE)

**Example**:
```javascript
const token = new ethers.Contract(
  "0x...",
  ["function mint(address, uint256)"],
  signer
);

const tx = await token.mint(
  "0x1234...",
  ethers.parseUnits("1000", 18)
);
await tx.wait();
```

---

### Burn Tokens

**Contract**: DataCoin at `0x...`

**Function 1**: `burn(uint256 amount)` - Burn specific amount

```javascript
const tx = await token.burn(ethers.parseUnits("100", 18));
await tx.wait();
```

**Function 2**: `burnForAccess()` - Burn entire balance (grants download access)

```javascript
const tx = await token.burnForAccess();
await tx.wait();
```

---

### Check Balance

**Contract**: DataCoin at `0x...`

**Function**: `balanceOf(address)` (ERC20 standard)

**Example**:
```javascript
const balance = await token.balanceOf("0x1234...");
console.log("Balance:", ethers.formatUnits(balance, 18));
```

---

### Check Token Metadata

**Contract**: DataCoin at `0x...`

**Properties**:
```javascript
const name = await token.name();
const symbol = await token.symbol();
const totalSupply = await token.totalSupply();
const cid = await token.datasetCid();

console.log(`${name} (${symbol})`);
console.log(`Total supply: ${ethers.formatUnits(totalSupply, 18)}`);
console.log(`Dataset: ipfs://${cid}`);
```

---

## 🌐 Network Configuration

### Base Sepolia Testnet

**Chain ID**: 84532

**RPC Endpoints** (pick one):
- Official: `https://sepolia.base.org`
- Alchemy: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- Infura: `https://base-sepolia.infura.io/v3/YOUR_PROJECT_ID`

**Faucet**: https://www.basefaucet.io/ (get testnet ETH)

**Block Explorer**: https://sepolia.basescan.org/

**Current Setup**:
- Contract network: Base Sepolia
- Config file: `hardhat.config.js`
- RPC URL env var: `BASE_SEPOLIA_RPC_URL`

---

## 📊 File Database Schemas

### backend/datasets.json

Registry of all created DataCoin tokens. Updated when new tokens are created.

**Schema**:
```json
{
  "0xtoken_address_lowercase": {
    "symbol": "SYMBOL",
    "cid": "ipfs://CID_STRING"
  }
}
```

**Example**:
```json
{
  "0xdcbfa10e65e0a2a4e91990e8702f60789bb9df0a": {
    "symbol": "DS1",
    "cid": "ipfs://bafkreifpymts2rinunnptk6pejo3znkuag7yevcty2qmuhuu7jmglmyo34"
  },
  "0x9876543210fedcba9876543210fedcba98765432": {
    "symbol": "MEDICAL",
    "cid": "ipfs://bafkreitest"
  }
}
```

---

### backend/db.json

Access log database. Appended to when users burn tokens.

**Entry Schema**:
```json
{
  "user": "0x342fcc7a64a9db5b12ae69caf8aa05c9",
  "symbol": "DS1",
  "token": "0xdcbfa10e65e0a2a4e91990e8702f60789bb9df0a",
  "amount": "1000000000000000000",
  "downloadUrl": "https://gateway.lighthouse.storage/ipfs/bafkreif...?token=eyJhbGciOiJIUzI1NiJ9...",
  "ts": 1697234567890
}
```

**Full Example**:
```json
[
  {
    "user": "0x342fcc7a64a9db5b12ae69caf8aa05c9",
    "symbol": "DS1",
    "token": "0xdcbfa10e65e0a2a4e91990e8702f60789bb9df0a",
    "amount": "1000000000000000000",
    "downloadUrl": "https://gateway.lighthouse.storage/ipfs/bafkrei...?token=...",
    "ts": 1697234567890
  },
  {
    "user": "0x111111111111111111111111111111111111111",
    "symbol": "MEDICAL",
    "token": "0x9876543210fedcba9876543210fedcba98765432",
    "amount": "500000000000000000",
    "downloadUrl": "https://gateway.lighthouse.storage/ipfs/bafkrei...?token=...",
    "ts": 1697234567900
  }
]
```

---

### backend/lastBlock.json

Listener state file. Tracks the last processed block to avoid reprocessing events.

**Schema**:
```json
{
  "lastBlock": 12345678
}
```

**Auto-created**: Yes (listener.js creates on first run)
**Auto-updated**: Yes (every poll/block)
**Manual reset**: Delete file to restart from an earlier block

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Set all required environment variables (`BASE_SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `MYRAD_TREASURY`, `DOWNLOAD_SECRET`)
- [ ] Have testnet ETH in wallet for gas
- [ ] Test all scripts locally
- [ ] Update `ROUTER_ADDRESS` and `WETH_ADDRESS` in `frontend/app.js`
- [ ] Prepare dataset IPFS CID

### Deployment Steps

1. **Deploy Factory**:
   ```bash
   npm run deploy
   ```
   - Note the factory address

2. **Create First Token**:
   ```bash
   node scripts/createDataCoin.js <FACTORY_ADDRESS> "Dataset Name" "SYMBOL" 1000000 "ipfs://CID"
   ```
   - Verify token address on Basescan
   - Check liquidity pool created

3. **Start Backend Services**:
   ```bash
   npm run dev   # Terminal 1
   npm run listen # Terminal 2
   ```
   - Verify server running on port 4000
   - Verify listener subscribed to events

4. **Test Frontend**:
   - Open http://localhost:4000
   - Connect wallet
   - Verify datasets load
   - Test buy/sell/burn flows

5. **Monitor**:
   - Watch listener logs for burn events
   - Check `backend/db.json` for access records
   - Monitor API endpoints

---

## 📈 Performance & Scalability

### Current Limitations

1. **File-based Storage**: `db.json` and `datasets.json` are single JSON files
   - Suitable for MVP/testing
   - Recommend database migration for production

2. **Listener Polling**: 8-second interval for HTTP RPC
   - Fast enough for most use cases
   - Lower latency with WebSocket RPC

3. **Frontend Balance Queries**: Real-time balance check per token
   - O(n) calls to blockchain
   - Consider batch reading with multicall for many tokens

### Production Recommendations

1. **Database**: Migrate from JSON to MongoDB, PostgreSQL, or similar
2. **RPC**: Use WebSocket for real-time events (lower latency)
3. **Caching**: Add Redis or similar for metadata/balance caching
4. **Frontend**: Implement pagination for large token lists
5. **Listener**: Deploy redundant listeners for high availability
6. **API**: Add rate limiting and authentication

---

## 🔐 Security Checklist

### Smart Contracts

- [x] Uses OpenZeppelin audited contracts (ERC20, AccessControl)
- [x] Role-based access control for minting
- [x] No obvious vulnerabilities (single-purpose contracts)
- [ ] Recommend: Formal audit before mainnet deployment

### Backend

- [x] Input validation on API endpoints
- [x] File-based access control (no direct DB exposure)
- [x] JWT signing for download URLs
- [ ] Recommend: Add API authentication (API keys, OAuth)
- [ ] Recommend: Add rate limiting
- [ ] Recommend: Rotate `DOWNLOAD_SECRET` regularly

### Frontend

- [x] No hardcoded secrets
- [x] Uses MetaMask (user controls keys)
- [x] Transaction simulation before execution
- [ ] Recommend: Content Security Policy headers
- [ ] Recommend: HTTPS enforcement

### Private Keys & Secrets

- ❌ **DO NOT** commit `.env` file to git
- ❌ **DO NOT** log private keys or secrets
- ✅ **DO** use strong, random `DOWNLOAD_SECRET`
- ✅ **DO** rotate secrets regularly
- ✅ **DO** use environment variables for all secrets

---

## 🧑‍💻 Developer Notes

### Adding a New Endpoint

1. Add route in `backend/server.js`:
   ```javascript
   app.get("/new-endpoint", (req, res) => {
     res.json({ message: "Hello" });
   });
   ```

2. Restart server: `npm run dev`

3. Test: `curl http://localhost:4000/new-endpoint`

---

### Adding a New Smart Contract Event

1. Add event ABI to listener:
   ```javascript
   const ABI = [
     "event MyEvent(address indexed user, uint256 amount)"
   ];
   ```

2. Add event handler:
   ```javascript
   contract.on("MyEvent", (user, amount, event) => {
     console.log("Event triggered:", user, amount);
     // Handle event
   });
   ```

3. Restart listener

---

### Debugging Tips

**Listener Not Detecting Events**:
```bash
# Check listener logs
# Ensure datasets.json contains the token address
cat backend/datasets.json

# Check if token emitted event
# View transaction on Basescan
```

**API Not Responding**:
```bash
# Check if server is running
curl http://localhost:4000/

# Check logs for errors
# Verify PORT in config.js
```

**Frontend Not Connecting to Wallet**:
```javascript
// Check browser console for errors
// Verify MetaMask is installed
// Verify Base Sepolia is added to MetaMask
console.log(window.ethereum); // Should exist
```

---

## 📚 Additional Resources

### Documentation
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/
- **Ethers.js**: https://docs.ethers.org/v6/
- **Hardhat**: https://hardhat.org/docs
- **Base**: https://docs.base.org/
- **Uniswap V2**: https://docs.uniswap.org/contracts/v2/overview

### Tools
- **Basescan Explorer**: https://sepolia.basescan.org/
- **Uniswap Interface**: https://app.uniswap.org/
- **MetaMask**: https://metamask.io/
- **IPFS/Lighthouse**: https://www.lighthouse.storage/

### Examples
- **Ethers.js Examples**: https://docs.ethers.org/v6/getting-started/
- **OpenZeppelin Contracts**: https://github.com/OpenZeppelin/openzeppelin-contracts/

---

## 🤔 FAQ

### Q: How do I add a new dataset?
**A**:
1. Upload data to IPFS (Lighthouse, Pinata, etc.)
2. Get the CID
3. Run: `node scripts/createDataCoin.js <FACTORY> "Name" "SYMBOL" 1000000 "ipfs://CID"`
4. Token is created with initial liquidity on Uniswap

---

### Q: Can users create tokens themselves?
**A**:
Yes! Anyone can call the factory's `createDataCoin()` function. Currently done via script, but can be exposed in UI.

---

### Q: What happens if listener crashes?
**A**:
It saves the last processed block in `lastBlock.json`. On restart, it resumes from that block (no missed events).

---

### Q: How long is download access valid?
**A**:
30 minutes (JWT token expiry). Users can burn again for a new access window.

---

### Q: Can I use mainnet instead of testnet?
**A**:
Yes, but requires:
1. Updating `hardhat.config.js` network configuration
2. Deploying new factory contract on mainnet
3. Using real ETH (not testnet)
4. Strong security review before mainnet

---

### Q: How do I migrate from JSON storage to a database?
**A**:
1. Create database schema matching JSON structure
2. Update `backend/utils.js` functions (`saveAccess`) to write to DB
3. Update `backend/server.js` endpoints to read from DB
4. Test thoroughly before deploying

---

## 📞 Support

For issues or questions:
1. Check this README and troubleshooting section
2. Review blockchain explorer (Basescan) for transaction details
3. Check listener logs for event processing issues
4. Open an issue in the repository

---

**Last Updated**: October 2024
**Version**: 2.0.0
