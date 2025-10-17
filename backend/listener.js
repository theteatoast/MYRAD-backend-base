// backend/listener.js
// Robust listener: uses WebSocketProvider when RPC is ws(s)://, otherwise falls back to polling getLogs.
// Saves last processed block to backend/lastBlock.json to avoid duplicates across restarts.

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { RPC, DATASETS_FILE } = require("./config");
const { signDownloadUrl, saveAccess } = require("./utils");

const POLL_INTERVAL = 8000; // 8s polling when using HTTP
const LAST_BLOCK_FILE = path.join(__dirname, "lastBlock.json");

function loadDatasets() {
  if (!fs.existsSync(DATASETS_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATASETS_FILE));
}

function saveLastBlock(n) {
  try { fs.writeFileSync(LAST_BLOCK_FILE, JSON.stringify({ lastBlock: Number(n) }, null, 2)); } catch {}
}
function loadLastBlock() {
  try {
    if (!fs.existsSync(LAST_BLOCK_FILE)) return null;
    const j = JSON.parse(fs.readFileSync(LAST_BLOCK_FILE));
    return j.lastBlock || null;
  } catch { return null; }
}

async function handleRedeemOrBurn(tokenAddr, userAddress, amount, symbol) {
  const datasets = loadDatasets();
  const meta = datasets[tokenAddr.toLowerCase()];
  if (!meta) {
    console.log("Unknown token (not in datasets.json):", tokenAddr);
    return;
  }
  const cid = (meta.cid || "").replace("ipfs://", "");
  const url = signDownloadUrl(cid, userAddress);
  const entry = {
    user: userAddress.toLowerCase(),
    symbol: meta.symbol,
    token: tokenAddr.toLowerCase(),
    amount: amount ? amount.toString() : "0",
    downloadUrl: url,
    ts: Date.now()
  };
  console.log("🔥 Granting access:", entry);
  saveAccess(entry);
}

// ---- decide provider: WebSocket if RPC starts with ws, otherwise JsonRpc (HTTP) ----
let provider;
if (RPC.startsWith("ws://") || RPC.startsWith("wss://")) {
  console.log("Using WebSocketProvider for RPC:", RPC);
  provider = new ethers.WebSocketProvider(RPC);
} else {
  console.log("Using JsonRpcProvider (HTTP) for RPC:", RPC);
  provider = new ethers.JsonRpcProvider(RPC);
}

// Minimal ABIs
const ERC20_ABI = [
  "event Transfer(address indexed from,address indexed to,uint256 value)"
];
const REDEEMED_ABI = [
  "event Redeemed(address indexed user,uint256 amount,string indexed ticker)"
];

// If WebSocket provider: subscribe per-contract (best)
if (provider instanceof ethers.WebSocketProvider) {
  (async () => {
    const datasets = loadDatasets();
    for (const [tokenAddr, meta] of Object.entries(datasets)) {
      const addr = tokenAddr.toLowerCase();
      const contract = new ethers.Contract(addr, ERC20_ABI.concat(REDEEMED_ABI), provider);
      console.log("👀 Subscribing via WS to:", addr, meta.symbol);

      contract.on("Transfer", (from, to, value, event) => {
        try {
          // Convert to lowercase for comparison since ethers returns checksummed addresses
          const toAddr = typeof to === 'string' ? to.toLowerCase() : ethers.getAddress(to).toLowerCase();
          if (toAddr === ethers.ZeroAddress.toLowerCase()) {
            console.log(`🔥 Transfer burn detected (WS): ${from} burned ${ethers.formatUnits(value, 18)} ${meta.symbol}`);
            handleRedeemOrBurn(addr, from, value, meta.symbol);
          }
        } catch (err) {
          console.error("Transfer handler error:", err);
        }
      });

      contract.on("Redeemed", (user, amount, ticker, event) => {
        try {
          console.log(`Redeemed event (WS): ${user} ${amount.toString()} ${ticker}`);
          handleRedeemOrBurn(addr, user, amount, ticker);
        } catch (err) {
          console.error("Redeemed handler error:", err);
        }
      });
    }

    // also poll datasets.json to pick up new tokens (so we can subscribe to new ones)
    setInterval(async () => {
      try {
        const ds = loadDatasets();
        for (const [tokenAddr, meta] of Object.entries(ds)) {
          const addr = tokenAddr.toLowerCase();
          // if not already subscribed, create contract.on handlers
          // easiest: simply create a new contract and handlers (ethers deduplicates events per listener function)
          if (!global.__ws_subscribed) global.__ws_subscribed = new Set();
          if (global.__ws_subscribed.has(addr)) continue;
          const contract = new ethers.Contract(addr, ERC20_ABI.concat(REDEEMED_ABI), provider);
          console.log("👀 WS subscribing new token:", addr, meta.symbol);
          contract.on("Transfer", (from, to, value, event) => {
            try {
              const toAddr = typeof to === 'string' ? to.toLowerCase() : ethers.getAddress(to).toLowerCase();
              if (toAddr === ethers.ZeroAddress.toLowerCase()) {
                console.log(`🔥 Transfer burn detected (WS new token): ${from} burned ${ethers.formatUnits(value, 18)}`);
                handleRedeemOrBurn(addr, from, value, meta.symbol);
              }
            } catch (e) { console.error(e); }
          });
          contract.on("Redeemed", (user, amount, ticker, event) => {
            try { handleRedeemOrBurn(addr, user, amount, ticker); } catch (e) { console.error(e); }
          });
          global.__ws_subscribed.add(addr);
        }
      } catch (e) { console.error("WS repeat subscribe error:", e); }
    }, 20000);

    console.log("Listener running (WS subscriptions active).");
  })().catch(console.error);

} else {
  // JsonRpcProvider: implement polling using eth_getLogs to avoid eth_newFilter/eth_getFilterChanges issues.
  (async () => {
    let lastBlock = loadLastBlock();
    if (!lastBlock) {
      // pick a safe starting block a bit before latest to avoid missing logs
      const latest = await provider.getBlockNumber();
      lastBlock = Math.max(0, latest - 6);
      saveLastBlock(lastBlock);
    }
    console.log("Starting polling from block:", lastBlock);

    async function pollOnce() {
      try {
        const datasets = loadDatasets();
        const tokenAddrs = Object.keys(datasets);
        if (tokenAddrs.length === 0) {
          // still update lastBlock to keep moving
          const latest = await provider.getBlockNumber();
          lastBlock = Math.max(lastBlock, latest);
          saveLastBlock(lastBlock);
          return;
        }

        const latest = await provider.getBlockNumber();
        if (latest <= lastBlock) return; // nothing new

        // for each token, query logs from lastBlock+1 .. latest
        const from = lastBlock + 1;
        const to = latest;
        // topics for Transfer and Redeemed (using ethers.js v6 method)
        const iface = new ethers.Interface(ERC20_ABI.concat(REDEEMED_ABI));
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        const redeemedTopic = ethers.id("Redeemed(address,uint256,string)");

        for (const addr of tokenAddrs) {
          const token = addr.toLowerCase();
          // build filter: address + topics (either Transfer or Redeemed)
          const filter = {
            address: token,
            fromBlock: from,
            toBlock: to,
            topics: [ [transferTopic, redeemedTopic] ] // either Transfer OR Redeemed
          };

          let logs = [];
          try {
            logs = await provider.getLogs(filter);
          } catch (err) {
            // provider may reject large range queries; fall back to smaller window
            console.warn("getLogs error, falling back to per-block:", err.message ? err.message : err);
            for (let b = from; b <= to; b++) {
              try {
                const small = await provider.getLogs({ address: token, fromBlock: b, toBlock: b, topics: [ [transferTopic, redeemedTopic] ] });
                if (small && small.length) logs.push(...small);
              } catch (e) {
                // ignore single-block failures
              }
            }
          }

          if (logs.length === 0) continue;

          // parse logs
          for (const log of logs) {
            try {
              const parsed = iface.parseLog(log);
              if (!parsed) continue;
              if (parsed.name === "Transfer") {
                const from = parsed.args.from;
                const to = parsed.args.to;
                const value = parsed.args.value;
                const toAddr = typeof to === 'string' ? to.toLowerCase() : ethers.getAddress(to).toLowerCase();
                if (toAddr === ethers.ZeroAddress.toLowerCase()) {
                  console.log(`🔥 Poll-detected burn: ${from} burned ${ethers.formatUnits(value, 18)} on ${token}`);
                  handleRedeemOrBurn(token, from, value, datasets[token].symbol);
                }
              } else if (parsed.name === "Redeemed") {
                const user = parsed.args.user;
                const amt = parsed.args.amount;
                const ticker = parsed.args.ticker;
                console.log(`Poll-detected Redeemed: ${user} ${amt.toString()} ${ticker}`);
                handleRedeemOrBurn(token, user, amt, ticker);
              }
            } catch (err) {
              // parseLog throws when topics don't match signature; ignore
            }
          }
        } // end tokens loop

        lastBlock = to;
        saveLastBlock(lastBlock);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }

    // initial immediate poll
    await pollOnce();
    // then periodic
    setInterval(pollOnce, POLL_INTERVAL);
    console.log("Listener running (HTTP polling). Poll interval:", POLL_INTERVAL, "ms");
  })().catch(console.error);
}
