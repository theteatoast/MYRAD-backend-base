let provider, signer, userAddress;
const STATUS = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const datasetsDiv = document.getElementById("datasets");
const BACKEND_BASE = "";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const BONDING_CURVE_ABI = [
  "function buy() external payable",
  "function sell(uint256 tokenAmount) external",
  "function getPrice() public view returns (uint256)",
  "function getBuyAmount(uint256 ethSpent) public view returns (uint256)",
  "function getSellAmount(uint256 tokenAmount) public view returns (uint256)",
  "function ethBalance() public view returns (uint256)",
  "function tokenSupply() public view returns (uint256)",
  "event Buy(address indexed buyer, uint256 ethSent, uint256 tokensReceived)",
  "event Sell(address indexed seller, uint256 tokensSold, uint256 ethReceived)"
];

connectBtn.onclick = async () => {
  try {
    if (!window.ethereum) return alert("Install MetaMask");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById("addr").innerText = shorten(userAddress);
    connectBtn.style.display = "none";
    STATUS.innerText = "✅ Wallet connected: " + userAddress;
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
      buyInput.placeholder = "ETH to spend (e.g. 0.001)";
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
        updatePrice(meta.bonding_curve, priceEl);
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

async function updatePrice(curveAddr, priceEl) {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    if (!curveAddr) {
      priceEl.innerText = "price: N/A";
      return;
    }

    const curve = new ethers.Contract(curveAddr, BONDING_CURVE_ABI, provider);
    const price = await curve.getPrice();
    priceEl.innerText = `price: ${ethers.formatUnits(price, 18)} ETH`;
  } catch (err) {
    priceEl.innerText = "price: error";
    console.error(err);
  }
}

async function buyToken(tokenAddr, ethAmountStr, meta) {
  if (!ethAmountStr || isNaN(Number(ethAmountStr))) {
    return alert("Enter ETH amount to spend");
  }
  if (!signer) return alert("Connect wallet first");
  if (!meta.bonding_curve) return alert("Bonding curve not found");

  const ethAmount = ethers.parseEther(String(ethAmountStr));

  try {
    STATUS.innerText = "📊 Calculating tokens...";

    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const curve = new ethers.Contract(meta.bonding_curve, BONDING_CURVE_ABI, signer);

    const tokensToReceive = await curve.getBuyAmount(ethAmount);
    if (tokensToReceive === 0n) {
      STATUS.innerText = "❌ Insufficient liquidity";
      return;
    }

    const displayTokens = ethers.formatUnits(tokensToReceive, 18);
    const confirmed = confirm(`Buy ~${displayTokens} tokens for ${ethAmountStr} ETH?\n\nConfirm?`);

    if (!confirmed) {
      STATUS.innerText = "Cancelled";
      return;
    }

    STATUS.innerText = "⏳ Confirm buy in wallet...";

    const tx = await curve.buy({ value: ethAmount });
    const receipt = await tx.wait();

    STATUS.innerText = `✅ Buy confirmed! Received ~${displayTokens} tokens`;

    setTimeout(() => {
      loadDatasets();
    }, 1000);
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
  if (!meta.bonding_curve) return alert("Bonding curve not found");

  const tokenAmount = ethers.parseUnits(String(tokenAmountStr), 18);

  try {
    STATUS.innerText = "📊 Calculating ETH...";

    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);

    const curve = new ethers.Contract(meta.bonding_curve, BONDING_CURVE_ABI, signer);
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);

    const ethToReceive = await curve.getSellAmount(tokenAmount);
    if (ethToReceive === 0n) {
      STATUS.innerText = "❌ Insufficient liquidity or invalid amount";
      return;
    }

    const displayEth = ethers.formatEther(ethToReceive);
    const confirmed = confirm(`Sell ${tokenAmountStr} tokens for ~${displayEth} ETH?\n\nConfirm?`);

    if (!confirmed) {
      STATUS.innerText = "Cancelled";
      return;
    }

    STATUS.innerText = "⏳ Checking approval...";

    const allowance = await token.allowance(userAddress, meta.bonding_curve);
    if (allowance < tokenAmount) {
      STATUS.innerText = "⏳ Approving tokens...";
      const approveTx = await token.approve(meta.bonding_curve, ethers.parseUnits("1000000000", 18));
      await approveTx.wait();
      STATUS.innerText = "✅ Approved, now selling...";
    }

    STATUS.innerText = "⏳ Confirm sell in wallet...";

    const tx = await curve.sell(tokenAmount);
    const receipt = await tx.wait();

    STATUS.innerText = `✅ Sell confirmed! Received ~${displayEth} ETH`;

    setTimeout(() => {
      loadDatasets();
    }, 1000);
  } catch (err) {
    console.error("Sell error:", err);
    STATUS.innerText = "❌ Sell failed: " + (err?.message || err);
  }
}

async function burnForAccess(tokenAddr, meta, balanceEl) {
  if (!signer) return alert("Connect wallet first");

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
