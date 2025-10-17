# 📤 Complete File Upload & DataCoin Creation Workflow

Your MYRAD DataCoin platform now has complete file upload functionality integrated with Lighthouse IPFS. Here's how it all works.

---

## 🎯 Complete User Journey (Updated)

### **1. Creator Visits Platform**
- Opens http://localhost:4000
- Clicks **"📤 Create Dataset"** button
- Redirected to upload page at `/upload.html`

### **2. Creator Uploads File**
- Selects or drags dataset file
- File uploaded to Lighthouse IPFS
- Receives IPFS CID (content hash)
- File now permanently stored on IPFS

### **3. Creator Provides Metadata**
- Enters dataset name (e.g., "Medical Records 2024")
- Enters token symbol (e.g., "MEDDATA")
- Optional: adds description
- Submits form

### **4. DataCoin Token Created**
- Backend deploys token smart contract
- Backend deploys bonding curve for trading
- Mints token allocations:
  - 90% → bonding curve (for public trading)
  - 5% → creator wallet
  - 5% → platform treasury
- Seeds $5 ETH to bonding curve
- Registers in dataset registry
- **Dataset now tradeable!**

### **5. Users Discover Dataset**
- Opens http://localhost:4000
- Sees new dataset with token symbol and price
- Real-time price from bonding curve

### **6. Users Buy Tokens**
- Enters ETH amount
- Clicks "Buy"
- Receives tokens from bonding curve
- Price increases (linear formula)
- Can check balance in real-time

### **7. Users Sell Tokens**
- Enters token amount
- Clicks "Sell"
- Approves token transfer
- Gets ETH back
- Price decreases

### **8. Users Burn for Download**
- Clicks "🔥 Burn for Download"
- Wallet confirms transaction
- Token balance burned (destroyed)
- Listener detects burn on blockchain
- Backend generates JWT-signed IPFS link
- **Download automatically opens**
- File accessible for 30 minutes

---

## 🔧 Technology Stack

### **Lighthouse IPFS Integration**
- **Purpose**: Decentralized file storage
- **API Key**: `169a714e.cd7a6e5bf6ea4a2db25905d89a333ada`
- **Max File Size**: 10 MB
- **Upload Flow**: Browser → Backend → Lighthouse IPFS
- **Result**: IPFS CID stored with token metadata

### **File Upload Process**
```
User selects file
    ↓
Browser sends to /upload endpoint (multipart/form-data)
    ↓
Server converts to base64
    ↓
uploadService.js sends to Lighthouse API
    ↓
Receives IPFS CID
    ↓
Returns CID to browser
    ↓
User submits form with CID
    ↓
Backend creates DataCoin with file CID
```

### **Token Creation Process**
```
Form submitted with (cid, name, symbol, description)
    ↓
/create-dataset endpoint receives request
    ↓
createDatasetAPI.js gets factory contract
    ↓
Deploys DataCoin token
    ↓
Deploys BondingCurve AMM
    ↓
Mints token allocations (90/5/5)
    ↓
Sends 0.005 ETH initial liquidity
    ↓
Registers in datasets.json
    ↓
Response with token + curve addresses
```

---

## 🚀 Step-by-Step Testing Guide

### **Prerequisites**
- ✅ Backend running (`npm run dev`)
- ✅ Listener running (`npm run listen`)
- ✅ MetaMask with Base Sepolia testnet ETH
- ✅ Factory address deployed (set in `.env` FACTORY_ADDRESS)

---

### **Test 1: Upload File**

**Step 1: Go to upload page**
```
http://localhost:4000/upload.html
```

**Step 2: Upload file**
- Click upload area or drag-drop file
- Select test file (max 10MB)
- Wait for upload to complete
- See "✅ Upload complete!" message
- See IPFS CID displayed

**Expected Result**:
```
✅ Upload complete!
IPFS CID: QmXxxx...
```

**Verify**:
- In browser console: Check for no errors
- In Terminal 1 logs: See `✅ File uploaded to IPFS: QmXxxx...`
- Lighthouse: File stored at `ipfs://QmXxxx...`

---

### **Test 2: Create DataCoin with Uploaded File**

**Step 1: Fill form**
```
Dataset Name: "My Medical Data"
Token Symbol: "MEDATA"
Description: "Anonymous medical records"
```

**Step 2: Submit form**
- Click "Create Dataset & Token"
- Wait for confirmation

**Expected Output** (in Terminal 1):
```
🚀 Creating dataset token: My Medical Data (MEDATA)
   Uploader: 0x...
   CID: QmXxxx...

💰 Step 1: Creating token...
   ✅ Tx: 0xabc123...
   ✅ Token: 0xdef456...
   ✅ Curve: 0xghi789...

💳 Step 2: Minting allocations...
   ✅ Creator: 50000.0 tokens
   ✅ Platform: 50000.0 tokens
   ✅ Curve: 900000.0 tokens

💧 Step 3: Initializing liquidity...
   ✅ Sent 0.005 ETH

📊 Bonding Curve State:
   ETH: 0.005 ETH
   Tokens: 900000.0
   Price: 0.0000055 ETH/token
```

**Frontend Result**:
```
✅ Dataset created successfully!
Token: 0xdef456...
```

Redirected to http://localhost:4000 after 2 seconds

---

### **Test 3: View New Dataset**

**Step 1: Refresh main page**
```
http://localhost:4000
```

**Expected UI**:
- New dataset appears in list
- Shows token symbol "MEDATA"
- Shows price "0.0000055 ETH"
- Shows buy/sell inputs
- Shows burn button

**Verify in datasets.json**:
```bash
cat backend/datasets.json
```

Should show:
```json
{
  "0xdef456...": {
    "symbol": "MEDATA",
    "cid": "ipfs://QmXxxx...",
    "bonding_curve": "0xghi789...",
    "creator": "0x342f...",
    "name": "My Medical Data",
    "description": "Anonymous medical records",
    "timestamp": 1697234567890
  }
}
```

---

### **Test 4: Buy Tokens**

**Step 1: Connect wallet**
- Click "Connect Wallet"
- Approve in MetaMask
- See address displayed

**Step 2: Buy tokens**
- Enter "0.001" in ETH field
- Click "Buy"
- Confirm in MetaMask

**Expected Result**:
```
⏳ Confirm buy in wallet...
✅ Buy confirmed! Received ~181 tokens
```

**Price should increase** from 0.0000055 to ~0.0000066

---

### **Test 5: Sell Tokens**

**Step 1: Sell tokens**
- Enter "100" in token amount field
- Click "Sell"
- Approve tokens (if needed)
- Confirm in MetaMask

**Expected Result**:
```
✅ Sell confirmed! Received ~0.0007 ETH
```

**Price should decrease** slightly

---

### **Test 6: Burn for Download (Most Important!)**

**Step 1: Buy tokens again**
- Buy 0.001 ETH worth
- Confirm in MetaMask

**Step 2: Burn tokens**
- Click "🔥 Burn for Download"
- Confirm in MetaMask
- Wait ~15 seconds

**Expected Result**:
```
🔥 Sending burn transaction...
✅ Burned! Waiting for backend access...
✅ Download opened!
```

A new browser tab should open with file download

**Verify in Terminal 2 (Listener)**:
```
🔥 Granting access: {
  "user": "0x342f...",
  "symbol": "MEDATA",
  "token": "0xdef456...",
  "amount": "1000000000000000000",
  "downloadUrl": "https://gateway.lighthouse.storage/ipfs/QmXxxx...",
  "ts": 1697234567890
}
```

---

### **Test 7: Test API Endpoints**

**Get all datasets**:
```bash
curl http://localhost:4000/datasets | jq
```

**Get dataset price**:
```bash
curl http://localhost:4000/price/0xghi789... | jq
```

**Get buy quote**:
```bash
curl http://localhost:4000/quote/buy/0xghi789.../0.001 | jq
```

**Get access link** (after burn):
```bash
curl http://localhost:4000/access/0x342f.../MEDATA | jq
```

---

## 📁 File Structure (Updated)

```
MYRAD/
├─ backend/
│  ├─ server.js                 (Updated: upload + create endpoints)
│  ├─ uploadService.js          (NEW: Lighthouse integration)
│  ├─ createDatasetAPI.js       (NEW: Token creation API)
│  ├─ listener.js               (Unchanged)
│  ├─ config.js                 (Unchanged)
│  ├─ utils.js                  (Unchanged)
│  └─ datasets.json             (Updated with file CID)
│
├─ frontend/
│  ├─ index.html                (Updated: added create button)
│  ├─ upload.html               (NEW: file upload UI)
│  ├─ app.js                    (Unchanged)
│  └─ style.css                 (Unchanged)
│
├─ contracts/
│  ├─ BondingCurve.sol          (Unchanged)
│  ├─ DataCoin.sol              (Unchanged)
│  └─ DataCoinFactory.sol       (Unchanged)
│
├─ scripts/
│  ├─ deployFactory.js          (Unchanged)
│  └─ createDataCoin.js         (Unchanged - still works with hardcoded CID)
│
├─ .env                         (Updated: added LIGHTHOUSE_API_KEY)
├─ package.json                 (Updated: added multer, axios, form-data)
└─ README.md                    (Updated)
```

---

## 🔑 Key Environment Variables

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=03031b4a3e28790d8c67fa17e199360b72bcdbc8b1861c19da505de1be2fd77c
MYRAD_TREASURY=0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
LIGHTHOUSE_API_KEY=169a714e.cd7a6e5bf6ea4a2db25905d89a333ada
DOWNLOAD_SECRET=myrad-secret-key-change-in-production
PORT=4000
FACTORY_ADDRESS=<from deployment>
```

---

## 🎯 What Works Now

✅ **File Upload**
- Upload to Lighthouse IPFS
- Get IPFS CID
- Max 10MB per file

✅ **Token Creation**
- Automatic DataCoin deployment
- Automatic bonding curve deployment
- Proper allocations (90/5/5)
- Initial liquidity seeding

✅ **Token Trading**
- Buy with bonding curve
- Sell with bonding curve
- Real-time pricing
- Balance tracking

✅ **Download Access**
- Burn tokens for access
- 30-min expiry JWT links
- Automatic IPFS download

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Upload failed: Network error" | Check internet, try smaller file |
| "Creation failed: Network error" | Ensure RPC endpoint responding |
| "No token/curve addresses in response" | Check Terminal 1 for contract errors |
| "Cannot connect to Lighthouse" | Verify LIGHTHOUSE_API_KEY in .env |
| "File not accessible after burn" | Wait 5-10 seconds, refresh browser |
| "Burn transaction failed" | Ensure you have enough tokens, proper network |

---

## 🔄 Complete Workflow Summary

```
Creator Visit
    ↓
    ├─ Click "📤 Create Dataset"
    ↓
File Upload
    ├─ Select file
    ���─ Upload to Lighthouse
    └─ Receive IPFS CID
    ↓
Token Creation
    ├─ Fill form (name, symbol, description)
    ├─ Submit
    ├─ Deploy token contract
    ├─ Deploy bonding curve
    ├─ Mint allocations
    ├─ Seed liquidity
    └─ Register in datasets.json
    ↓
Dataset Live
    ├─ Appears on homepage
    ├─ Shows real-time price
    └─ Ready for trading
    ↓
Users Discover
    ├─ See dataset with price
    ├─ Can buy tokens
    ├─ Can sell tokens
    └─ Can burn for download
    ↓
User Burns for Access
    ├─ Clicks burn button
    ├─ Confirms transaction
    ├─ Tokens destroyed
    ├─ Listener detects burn
    ├─ Backend grants access
    └─ Download opens
```

---

## ✅ Verification Checklist

After completing all tests:

- [ ] File uploaded to Lighthouse successfully
- [ ] IPFS CID received and displayed
- [ ] Token created with correct symbol
- [ ] Dataset appears on homepage
- [ ] Price displays correctly
- [ ] Can buy tokens
- [ ] Can sell tokens
- [ ] Burn transaction succeeds
- [ ] Listener detects burn in logs
- [ ] Download link opens automatically
- [ ] API endpoints return correct data

**All ✅?** You have a fully functional file upload + token creation platform! 🎉

---

## 📊 Success Metrics

Your platform is **production-ready** when:

1. ✅ File uploads work reliably (>90% success rate)
2. ✅ Token creation completes without errors
3. ✅ Trading works smoothly
4. ✅ Download access works end-to-end
5. ✅ Listener reliably detects burns
6. ✅ No errors in browser console
7. ✅ No errors in Terminal 1 or 2
8. ✅ Gas costs reasonable (<0.02 ETH per token)
9. ✅ All 6 API endpoints functional
10. ✅ Performance acceptable (<3 second responses)

---

## 🚀 Next Steps

### Immediate (Today)
- [ ] Test complete workflow multiple times
- [ ] Create 3-5 test datasets
- [ ] Verify all features working

### Short Term (This Week)
- [ ] Prepare alpha testing guide for real users
- [ ] Set up monitoring/alerting
- [ ] Test edge cases
- [ ] Optimize performance

### Medium Term (Next 2 Weeks)
- [ ] Add creator dashboard
- [ ] Add analytics
- [ ] Improve UI/UX
- [ ] Add more file types support

### Long Term (Next Month)
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Public launch
- [ ] Marketing

---

## 🎉 Congratulations!

Your MYRAD DataCoin platform now has:

✅ Complete file upload to IPFS
✅ Automatic token creation
✅ Bonding curve trading
✅ Token burning for data access
✅ Real-time pricing
✅ Download access management
✅ Event monitoring
✅ Comprehensive API

**You're ready for alpha testing!** 🚀
