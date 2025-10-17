const STATUS = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const datasetsDiv = document.getElementById("datasets");
const BACKEND_BASE = "";

// USDC on Base Sepolia (6 decimals)
const BASE_SEPOLIA_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function burn(uint256 amount) external",
  "function burnForAccess() external"
];

const MARKETPLACE_ABI = [
  "function buy(address token, uint256 usdcIn, uint256 minTokensOut) external",
  "function sell(address token, uint256 tokenIn, uint256 minUsdcOut) external",
  "function getPriceUSDCperToken(address token) external view returns (uint256)",
  "function getReserves(address token) external view returns (uint256 rToken, uint256 rUSDC)",
  "function poolExists(address token) external view returns (bool)",
  "event Bought(address indexed token, address indexed buyer, uint256 usdcIn, uint256 fee, uint256 tokensOut)",
  "event Sold(address indexed token, address indexed seller, uint256 tokensIn, uint256 usdcOut)"
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

let provider, signer, userAddress;

connectBtn.onclick = async () => {
  try {
    if (!window.ethereum) return alert("Install MetaMask");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    // Force switch to Base Sepolia testnet (chainId: 84532)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }] // 84532 in hex
      });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        alert("Please add Base Sepolia testnet to MetaMask and switch to it");
        return;
      }
      if (switchErr.code !== 4001) {
        console.error("Network switch error:", switchErr);
      }
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      STATUS.innerText = "❌ Wrong network! Please switch to Base Sepolia testnet (chainId: 84532)";
      return;
    }

    document.getElementById("addr").innerText = shorten(userAddress);
    connectBtn.style.display = "none";
    STATUS.innerText = "✅ Wallet connected: " + userAddress + " (Base Sepolia testnet)";
    loadDatasets();
  } catch (err) {
    console.error("Connect error", err);
    STATUS.innerText = "❌ Connect failed: " + (err.message || err);
  }
};

function shorten(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

async function loadDatasets() {
  datasetsDiv.innerHTML = "Loading datasets…";
  try {
    const resp = await fetch(BACKEND_BASE + "/datasets");
    const data = await resp.json();
    const entries = Object.entries(data);

    if (entries.length === 0) {
      datasetsDiv.innerHTML = "<div class='small'>No datasets created yet.</div>";
      return;
    }

    datasetsDiv.innerHTML = "";

    for (const [tokenAddr, meta] of entries) {
      const box = document.createElement("div");
      box.className = "token";

      const left = document.createElement("div");
      left.className = "col";
      left.innerHTML = `<strong>${meta.symbol}</strong><div class="small">ipfs://${meta.cid}</div><div class="small">${tokenAddr}</div>`;

      const right = document.createElement("div");
      right.className = "col";
      right.style.textAlign = "right";

      const priceEl = document.createElement("div");
      priceEl.className = "small";
      priceEl.style.marginBottom = "8px";
      priceEl.innerText = "price: loading...";

      const buyInput = document.createElement("input");
      buyInput.placeholder = "USDC to spend (e.g. 0.1)";
      buyInput.style.width = "140px";
      const buyBtn = document.createElement("button");
      buyBtn.innerText = "Buy";
      buyBtn.onclick = () => buyToken(tokenAddr, buyInput.value, meta);

      const sellInput = document.createElement("input");
      sellInput.placeholder = "Token amt (e.g. 100)";
      sellInput.style.width = "140px";
      const sellBtn = document.createElement("button");
      sellBtn.innerText = "Sell";
      sellBtn.onclick = () => sellToken(tokenAddr, sellInput.value, meta);

      const balanceEl = document.createElement("div");
      balanceEl.className = "small";
      balanceEl.innerText = "balance: —";

      const burnBtn = document.createElement("button");
      burnBtn.innerText = "🔥 Burn for Download";
      burnBtn.style.marginTop = "8px";
      burnBtn.style.backgroundColor = "#ff6b6b";
      burnBtn.onclick = () => burnForAccess(tokenAddr, meta, balanceEl);

      right.appendChild(priceEl);
      right.appendChild(buyInput);
      right.appendChild(buyBtn);
      right.appendChild(document.createElement("br"));
      right.appendChild(sellInput);
      right.appendChild(sellBtn);
      right.appendChild(document.createElement("br"));
      right.appendChild(balanceEl);
      right.appendChild(document.createElement("br"));
      right.appendChild(burnBtn);

      box.appendChild(left);
      box.appendChild(right);
      datasetsDiv.appendChild(box);

      if (signer) {
        readBalance(tokenAddr, balanceEl);
        updatePrice(meta.marketplace_address || meta.bonding_curve, tokenAddr, priceEl);
      }
    }
  } catch (err) {
    datasetsDiv.innerHTML = "<div class='small'>❌ Error loading datasets</div>";
    console.error(err);
  }
}

async function readBalance(tokenAddr, balanceEl) {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
    const bal = await token.balanceOf(userAddress);
    balanceEl.innerText = "balance: " + ethers.formatUnits(bal, 18);
  } catch (err) {
    balanceEl.innerText = "balance: n/a";
  }
}

async function updatePrice(marketplaceAddr, tokenAddr, priceEl) {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    if (!marketplaceAddr) {
      priceEl.innerText = "price: N/A";
      return;
    }

    const code = await provider.getCode(marketplaceAddr);
    if (code === "0x") {
      console.warn(`No contract at marketplace address: ${marketplaceAddr}`);
      priceEl.innerText = "price: N/A (contract not found)";
      return;
    }

    const marketplace = new ethers.Contract(marketplaceAddr, MARKETPLACE_ABI, provider);
    
    // Check if pool exists
    const exists = await marketplace.poolExists(tokenAddr);
    if (!exists) {
      priceEl.innerText = "price: pool not initialized";
      return;
    }

    const price = await marketplace.getPriceUSDCperToken(tokenAddr);
    priceEl.innerText = `price: ${ethers.formatUnits(price, 18)} USDC`;
  } catch (err) {
    priceEl.innerText = "price: error";
    console.error("Price update error:", err.message);
  }
}

async function buyToken(tokenAddr, usdcAmountStr, meta) {
  if (!usdcAmountStr || isNaN(Number(usdcAmountStr))) {
    return alert("Enter USDC amount to spend");
  }
  if (!signer) return alert("Connect wallet first");
  if (!meta.marketplace_address) return alert("Marketplace address not found");

  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      STATUS.innerText = "❌ Wrong network! Must be on Base Sepolia testnet (84532)";
      return;
    }
  } catch (err) {
    STATUS.innerText = "❌ Network error: " + err.message;
    return;
  }

  const usdcAmount = ethers.parseUnits(String(usdcAmountStr), 6); // USDC has 6 decimals

  try {
    STATUS.innerText = "📊 Calculating tokens...";

    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const code = await provider.getCode(meta.marketplace_address);
    if (code === "0x") {
      STATUS.innerText = "❌ Error: Marketplace contract not found at address";
      console.error(`No contract at: ${meta.marketplace_address}`);
      return;
    }

    const marketplace = new ethers.Contract(meta.marketplace_address, MARKETPLACE_ABI, signer);
    const usdc = new ethers.Contract(BASE_SEPOLIA_USDC, USDC_ABI, signer);

    try {
      // Check allowance and approve if needed
      const allowance = await usdc.allowance(userAddress, meta.marketplace_address);
      if (allowance < usdcAmount) {
        STATUS.innerText = "⏳ Approving USDC...";
        const approveTx = await usdc.approve(meta.marketplace_address, ethers.parseUnits("1000", 6));
        await approveTx.wait();
        STATUS.innerText = "✅ Approved, calculating tokens...";
      }

      // For now, skip getting exact amount and just use minTokensOut = 0
      // In production, you'd calculate this via the formula
      STATUS.innerText = "⏳ Confirm buy in wallet...";

      const tx = await marketplace.buy(tokenAddr, usdcAmount, 0n);
      const receipt = await tx.wait();

      STATUS.innerText = `✅ Buy confirmed!`;

      setTimeout(() => {
        loadDatasets();
      }, 1000);
    } catch (callErr) {
      console.error("Contract call error:", callErr.message);
      STATUS.innerText = "❌ Contract error: " + callErr.message;
    }
  } catch (err) {
    console.error("Buy error:", err);
    STATUS.innerText = "❌ Buy failed: " + (err?.message || err);
  }
}

async function sellToken(tokenAddr, tokenAmountStr, meta) {
  if (!tokenAmountStr || isNaN(Number(tokenAmountStr))) {
    return alert("Enter token amount to sell");
  }
  if (!signer) return alert("Connect wallet first");
  if (!meta.marketplace_address) return alert("Marketplace address not found");

  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      STATUS.innerText = "❌ Wrong network! Must be on Base Sepolia testnet (84532)";
      return;
    }
  } catch (err) {
    STATUS.innerText = "❌ Network error: " + err.message;
    return;
  }

  const tokenAmount = ethers.parseUnits(String(tokenAmountStr), 18);

  try {
    STATUS.innerText = "📊 Calculating USDC...";

    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const code = await provider.getCode(meta.marketplace_address);
    if (code === "0x") {
      STATUS.innerText = "❌ Error: Marketplace contract not found at address";
      console.error(`No contract at: ${meta.marketplace_address}`);
      return;
    }

    const marketplace = new ethers.Contract(meta.marketplace_address, MARKETPLACE_ABI, signer);
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);

    try {
      STATUS.innerText = "⏳ Checking approval...";

      const allowance = await token.allowance(userAddress, meta.marketplace_address);
      if (allowance < tokenAmount) {
        STATUS.innerText = "⏳ Approving tokens...";
        const approveTx = await token.approve(meta.marketplace_address, ethers.parseUnits("1000000000", 18));
        await approveTx.wait();
        STATUS.innerText = "✅ Approved, now selling...";
      }

      STATUS.innerText = "⏳ Confirm sell in wallet...";

      const tx = await marketplace.sell(tokenAddr, tokenAmount, 0n);
      const receipt = await tx.wait();

      STATUS.innerText = `✅ Sell confirmed!`;

      setTimeout(() => {
        loadDatasets();
      }, 1000);
    } catch (callErr) {
      console.error("Contract call error:", callErr.message);
      STATUS.innerText = "❌ Contract error: " + callErr.message;
    }
  } catch (err) {
    console.error("Sell error:", err);
    STATUS.innerText = "❌ Sell failed: " + (err?.message || err);
  }
}

async function burnForAccess(tokenAddr, meta, balanceEl) {
  if (!signer) return alert("Connect wallet first");

  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      STATUS.innerText = "❌ Wrong network! Must be on Base Sepolia testnet (84532)";
      return;
    }
  } catch (err) {
    STATUS.innerText = "❌ Network error: " + err.message;
    return;
  }

  try {
    STATUS.innerText = "🔥 Sending burn transaction...";

    const token = new ethers.Contract(
      tokenAddr,
      ["function burnForAccess() external", "function burn(uint256) external"],
      signer
    );

    let tx;
    try {
      tx = await token.burnForAccess();
    } catch (e) {
      const amt = prompt("Enter tokens to burn (or cancel):");
      if (!amt) {
        STATUS.innerText = "Cancelled";
        return;
      }
      tx = await token.burn(ethers.parseUnits(amt, 18));
    }

    await tx.wait();
    STATUS.innerText = "✅ Burned! Waiting for backend access...";

    let accessGranted = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const r = await fetch(`${BACKEND_BASE}/access/${userAddress}/${meta.symbol}`);
        if (r.status === 200) {
          const j = await r.json();
          if (j.download) {
            window.open(j.download, "_blank");
            STATUS.innerText = "✅ Download opened!";
            accessGranted = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!accessGranted) {
      STATUS.innerText = "⚠️ Burn confirmed but download not ready. Try again in a moment.";
    }

    readBalance(tokenAddr, balanceEl);
  } catch (err) {
    console.error(err);
    STATUS.innerText = "❌ Burn failed: " + (err?.message || err);
  }
}

loadDatasets();
