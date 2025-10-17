# ⚡ MYRAD DataCoin - Quick Start (5 Minutes)

Follow these steps in order to get up and running.

## Step 1️⃣: Install Dependencies (1 min)

```bash
npm install
```

## Step 2️⃣: Deploy Factory Contract (2 min)

```bash
npm run deploy
```

✅ **Save the factory address from output**, you'll need it next.

Example output:
```
✅ DataCoinFactory deployed to: 0x1234567890abcdef...
```

## Step 3️⃣: Create First Dataset Token (1 min)

```bash
npm run create "Test Dataset" "TEST"
```

This creates:
- ✅ DataCoin token (90% in bonding curve)
- ✅ Bonding curve for trading
- ✅ 5% for creator, 5% for platform
- ✅ ~0.005 ETH ($5) initial liquidity

## Step 4️⃣: Start Backend (2 terminals)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run listen
```

## Step 5️⃣: Open in Browser

🌐 http://localhost:4000

You should see:
- ✅ "MYRAD DataCoin MVP"
- ✅ Your dataset listed
- ✅ Connect Wallet button

## Step 6️⃣: Test Trading

1. Click **"Connect Wallet"**
2. Make sure you're on **Base Sepolia** testnet
3. Click **"Buy"** and enter `0.001` ETH
4. Confirm in MetaMask
5. See your token balance increase!

## 🎉 Done!

You now have:
- ✅ Factory contract deployed
- ✅ First dataset token created
- ✅ Working bonding curve AMM
- ✅ Trading live on frontend
- ✅ Burn for download working

## 📚 Next Steps

- **Create more datasets**: `npm run create "Name" "SYMBOL"`
- **Check Basescan**: View your contracts and transactions
- **Read SETUP.md**: For detailed explanation of all features
- **Add file uploads**: Coming soon (currently hardcoded CID)

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| No testnet ETH | Get from https://www.basefaucet.io/ |
| "FACTORY_ADDRESS not set" | Save factory address to `.env` after deploy |
| Listener not working | Make sure `npm run listen` is running in Terminal 2 |
| Can't connect wallet | Add Base Sepolia network to MetaMask |
| Buttons not responding | Refresh page, check you're on Base Sepolia |

---

**That's it! You're now running MYRAD DataCoin with bonding curve trading.** 🚀
