// frontend/app.js  — hardened buy/sell + burn UI helpers (ethers v6)
let provider, signer, userAddress;
const STATUS = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const datasetsDiv = document.getElementById("datasets");
const BACKEND_BASE = ""; // if served by backend or empty for same-origin

// ---------- CONFIG: set these for your network ----------
const ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // <-- set to a V2-style router or leave blank to fallback
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";    // <-- set correct WETH for Base Sepolia or your chain
// -------------------------------------------------------

const ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)"
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
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
    STATUS.innerText = "Wallet connected: " + userAddress;
    loadDatasets();
  } catch (err) {
    console.error("Connect error", err);
    STATUS.innerText = "Connect failed: " + (err.message || err);
  }
};

function shorten(addr) { return addr.slice(0,6) + "..." + addr.slice(-4); }

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
      left.innerHTML = `<strong>${meta.symbol}</strong><div class="small">${meta.cid}</div><div class="small">${tokenAddr}</div>`;
      const right = document.createElement("div");
      right.className = "col";
      right.style.textAlign = "right";

      const buyInput = document.createElement("input");
      buyInput.placeholder = "ETH to spend (e.g. 0.01)";
      buyInput.style.width = "140px";
      const buyBtn = document.createElement("button");
      buyBtn.innerText = "Buy (in-site)";
      buyBtn.onclick = () => buyToken(tokenAddr, buyInput.value);

      const sellInput = document.createElement("input");
      sellInput.placeholder = "Token amt (e.g. 1)";
      sellInput.style.width = "140px";
      const sellBtn = document.createElement("button");
      sellBtn.innerText = "Sell (in-site)";
      sellBtn.onclick = () => sellToken(tokenAddr, sellInput.value);

      const buyRedirect = document.createElement("button");
      buyRedirect.innerText = "Buy (Uniswap)";
      buyRedirect.onclick = () => window.open(`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddr}`, "_blank");
      const sellRedirect = document.createElement("button");
      sellRedirect.innerText = "Sell (Uniswap)";
      sellRedirect.onclick = () => window.open(`https://app.uniswap.org/#/swap?inputCurrency=${tokenAddr}&outputCurrency=ETH`, "_blank");

      const balanceEl = document.createElement("div");
      balanceEl.className = "small";
      balanceEl.innerText = "balance: —";

      const burnBtn = document.createElement("button");
      burnBtn.innerText = "Burn for Download";
      burnBtn.onclick = async () => {
        try {
          STATUS.innerText = "Sending burn transaction…";
          const tokenContract = new ethers.Contract(tokenAddr, ["function burnForAccess() external", "function redeem(uint256) external"], signer);
          let tx;
          try {
            tx = await tokenContract.burnForAccess();
          } catch (e) {
            const amt = prompt("burn amount (token units):", "1");
            if (!amt) return;
            tx = await tokenContract.redeem(ethers.parseUnits(amt, 18));
          }
          await tx.wait();
          STATUS.innerText = "Burned — waiting backend for access";
          for (let i=0;i<20;i++){
            await new Promise(r=>setTimeout(r,1000));
            try {
              const r = await fetch(`${BACKEND_BASE}/access/${userAddress}/${meta.symbol}`);
              if (r.status === 200) {
                const j = await r.json();
                if (j.download) {
                  window.open(j.download, "_blank");
                  STATUS.innerText = "Download opened";
                  break;
                }
              }
            } catch(e){}
          }
        } catch (err) {
          console.error(err);
          STATUS.innerText = "Burn failed: " + (err.message || err);
        } finally {
          readBalance(tokenAddr, balanceEl);
        }
      };

      right.appendChild(buyInput);
      right.appendChild(buyBtn);
      right.appendChild(document.createElement("br"));
      right.appendChild(sellInput);
      right.appendChild(sellBtn);
      right.appendChild(document.createElement("br"));
      right.appendChild(buyRedirect);
      right.appendChild(sellRedirect);
      right.appendChild(document.createElement("br"));
      right.appendChild(balanceEl);
      right.appendChild(document.createElement("br"));
      right.appendChild(burnBtn);

      box.appendChild(left);
      box.appendChild(right);
      datasetsDiv.appendChild(box);

      if (signer) readBalance(tokenAddr, balanceEl);
    }
  } catch (err) {
    datasetsDiv.innerHTML = "<div class='small'>Error loading datasets</div>";
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

function hasRouter() {
  return ROUTER_ADDRESS && ROUTER_ADDRESS !== "" && ROUTER_ADDRESS !== "<PUT_V2_ROUTER_ADDRESS_HERE>";
}

// ---------- improved buy (with checks + simulation) ----------
async function buyToken(tokenAddr, ethAmountStr) {
  if (!ethAmountStr || isNaN(Number(ethAmountStr))) return alert("Enter ETH amount to spend");
  if (!signer) return alert("Connect wallet first");

  const ethAmount = ethers.parseEther(String(ethAmountStr));
  if (!hasRouter()) {
    window.open(`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddr}`, "_blank");
    return;
  }

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    // 1) check router exists
    const code = await provider.getCode(ROUTER_ADDRESS);
    if (!code || code === "0x") {
      STATUS.innerText = "Router contract not found — opening Uniswap as fallback.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddr}`, "_blank");
      return;
    }

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
    const path = [WETH_ADDRESS, tokenAddr];

    // 2) estimate amountsOut
    let amountsOut;
    try {
      amountsOut = await router.getAmountsOut(ethAmount, path);
    } catch (e) {
      console.warn("getAmountsOut failed (router incompatible or no liquidity):", e?.message || e);
      STATUS.innerText = "No liquidity or incompatible router — redirecting to Uniswap.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddr}`, "_blank");
      return;
    }

    // amountsOut are BigInts
    const estimatedOut = amountsOut[1];
    const minOut = (estimatedOut * 90n) / 100n; // 10% slippage tolerance

    // 3) static simulate swap (callStatic) to surface revert reason early
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    try {
      await router.callStatic.swapExactETHForTokens(minOut, path, userAddress, deadline, { value: ethAmount });
    } catch (simErr) {
      console.error("Swap simulation failed:", simErr);
      STATUS.innerText = "Swap simulation failed — falling back to Uniswap.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddr}`, "_blank");
      return;
    }

    // 4) execute
    STATUS.innerText = "Confirm swap in wallet...";
    const tx = await router.swapExactETHForTokens(minOut, path, userAddress, deadline, { value: ethAmount });
    await tx.wait();
    STATUS.innerText = "Buy swap confirmed!";
    loadDatasets();
  } catch (err) {
    console.error("Buy error:", err);
    STATUS.innerText = "Buy failed: " + (err?.message || err);
  }
}

// ---------- improved sell (with checks + approve) ----------
async function sellToken(tokenAddr, tokenAmountStr) {
  if (!tokenAmountStr || isNaN(Number(tokenAmountStr))) return alert("Enter token amount to sell");
  if (!signer) return alert("Connect wallet first");

  const tokenAmount = ethers.parseUnits(String(tokenAmountStr), 18);
  if (!hasRouter()) {
    window.open(`https://app.uniswap.org/#/swap?inputCurrency=${tokenAddr}&outputCurrency=ETH`, "_blank");
    return;
  }

  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const code = await provider.getCode(ROUTER_ADDRESS);
    if (!code || code === "0x") {
      STATUS.innerText = "Router contract not found — opening Uniswap as fallback.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=${tokenAddr}&outputCurrency=ETH`, "_blank");
      return;
    }

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
    const path = [tokenAddr, WETH_ADDRESS];

    // approve if needed
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
    const allowance = await token.allowance(userAddress, ROUTER_ADDRESS);
    if (allowance < tokenAmount) {
      STATUS.innerText = "Approving token for swap...";
      const approveTx = await token.approve(ROUTER_ADDRESS, ethers.parseUnits("1000000000", 18));
      await approveTx.wait();
    }

    // estimate amountsOut
    let amountsOut;
    try {
      amountsOut = await router.getAmountsOut(tokenAmount, path);
    } catch (e) {
      console.warn("getAmountsOut failed (router incompatible or no liquidity):", e?.message || e);
      STATUS.innerText = "No liquidity or incompatible router — redirecting to Uniswap.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=${tokenAddr}&outputCurrency=ETH`, "_blank");
      return;
    }

    const estimatedOut = amountsOut[1];
    const minOut = (estimatedOut * 90n) / 100n; // 10% slippage

    // simulate
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    try {
      await router.callStatic.swapExactTokensForETH(tokenAmount, minOut, path, userAddress, deadline);
    } catch (simErr) {
      console.error("Sell simulation failed:", simErr);
      STATUS.innerText = "Sell simulation failed — falling back to Uniswap.";
      window.open(`https://app.uniswap.org/#/swap?inputCurrency=${tokenAddr}&outputCurrency=ETH`, "_blank");
      return;
    }

    STATUS.innerText = "Confirm sell in wallet...";
    const tx = await router.swapExactTokensForETH(tokenAmount, minOut, path, userAddress, deadline);
    await tx.wait();
    STATUS.innerText = "Sell swap confirmed!";
    loadDatasets();
  } catch (err) {
    console.error("Sell error:", err);
    STATUS.innerText = "Sell failed: " + (err?.message || err);
  }
}

// initial load
loadDatasets();
