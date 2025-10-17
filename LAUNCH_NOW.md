# 🚀 LAUNCH NOW - Exact Steps

**You're literally 10 minutes away from running your platform.**

Copy-paste these commands exactly. Don't overthink it.

---

## 🎯 Right Now (5 minutes)

### Step 1: Install
```bash
npm install
```
Wait for it to finish. You'll see:
```
added 200+ packages
```

### Step 2: Deploy
```bash
npm run deploy
```

Watch for output like:
```
✅ DataCoinFactory deployed to: 0x1234567890abcdef...
💾 Factory address saved to .env.local
```

✅ **Save the factory address** (you'll see it above)

### Step 3: Create Token
```bash
npm run create "Test Dataset" "TEST"
```

Watch for:
```
✅ DataCoin deployed at: 0xdef456...
✅ BondingCurve deployed at: 0xghi789...
✅ Sent 0.005 ETH to bonding curve
```

---

## 📱 Right After (2 minutes)

### Terminal 1 - Start API
```bash
npm run dev
```

You should see:
```
🚀 Backend API running on port 4000
📊 Open http://localhost:4000
```

**Keep this terminal running** ← Important!

### Terminal 2 - Start Listener
Open a **NEW terminal window** and run:
```bash
npm run listen
```

You should see:
```
Listener running (HTTP polling). Poll interval: 8000 ms
```

**Keep this terminal running too** ← Important!

---

## 🌐 Right After That (30 seconds)

Open your browser:
```
http://localhost:4000
```

You should see:
- ✅ "MYRAD DataCoin MVP"
- ✅ "Connect Wallet" button
- ✅ Your "TEST" dataset listed
- ✅ Price displayed

---

## 🔌 Next (1 minute)

1. Click **"Connect Wallet"**
2. MetaMask pops up
3. Make sure it says **"Base Sepolia"** (not Ethereum mainnet!)
4. Click **"Connect"**
5. Your address appears (e.g., "0x342F...")

---

## 💰 Almost There (2 minutes)

### If you have no testnet ETH:

Go to: https://www.basefaucet.io/
1. Connect your wallet
2. Request ETH
3. Wait ~1 minute
4. Refresh browser

### Once you have ETH:

1. Enter **0.001** in "ETH to spend" field
2. Click **"Buy"** button
3. Confirm in MetaMask
4. Wait ~20 seconds
5. Done! You now have tokens!

---

## 🎉 You're Done!

You now have:
- ✅ Factory contract deployed
- ✅ Token created with bonding curve
- ✅ API server running
- ✅ Event listener running  
- ✅ Frontend working
- ✅ Tokens in your wallet
- ✅ Everything ready for testing

---

## 🧪 Quick Test

Try these (in order):

### 1. Buy More Tokens
- Enter 0.001 ETH
- Click Buy
- Confirm
- ✅ Balance increases, price increases

### 2. Sell Tokens
- Enter 100 tokens
- Click Sell
- Approve (if asked)
- Confirm
- ✅ Get ETH, balance decreases

### 3. Burn for Download
- Click "🔥 Burn for Download"
- Confirm
- Wait for download
- ✅ Download link opens!

---

## 📊 Check It Worked

In Terminal 2 (listener), you should see:
```
🔥 Granting access: {
  "user": "0x...",
  "symbol": "TEST",
  ...
}
```

This means it's working! ✅

---

## 🎓 Next (After Testing)

Read in this order:
1. **QUICK_REFERENCE.md** - Keep this open while working
2. **IMPLEMENTATION_SUMMARY.md** - Understand how it works
3. **FINAL_STEPS.md** - More detailed guide if needed

---

## 🚨 If Something Goes Wrong

| Error | Fix |
|-------|-----|
| "npm install fails" | Try `npm cache clean --force` then retry |
| "Port 4000 in use" | Kill other process: `lsof -i :4000` → `kill -9 <PID>` |
| "MetaMask not found" | Install from: https://metamask.io/ |
| "Wrong network" | Switch to Base Sepolia in MetaMask |
| "No testnet ETH" | Get from: https://www.basefaucet.io/ |
| "Buy fails" | Refresh page, make sure you're on Sepolia |
| "Listener not working" | Make sure Terminal 2 is running |
| "API not responding" | Make sure Terminal 1 is running |

---

## ✅ Success Checklist

- ✅ npm install succeeded
- ✅ npm run deploy succeeded
- ✅ npm run create succeeded
- ✅ Terminal 1 shows "Backend API running"
- ✅ Terminal 2 shows "Listener running"
- ✅ Browser shows UI
- ✅ Wallet connected
- ✅ Can buy tokens
- ✅ Can sell tokens
- ✅ Can burn for download
- ✅ Listener detects burns

**All 11 ✅? You're golden!**

---

## 🎯 That's It!

You're literally done. Your platform is running.

**Next steps:**
1. Test more
2. Create more datasets: `npm run create "Name" "Symbol"`
3. Invite others to test
4. Collect feedback
5. Add features

---

**Go deploy! You've got this! 🚀**
