require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const hre = require("hardhat");

// ------------------------------------------------------------
// 🔒 Disable ENS lookups globally (fixes ethers v6 ENS bug)
const { JsonRpcProvider } = require("ethers");
if (JsonRpcProvider.prototype.resolveName) {
  JsonRpcProvider.prototype.resolveName = async function (name) {
    if (ethers.isAddress(name)) return name; // return address directly
    throw new Error(`ENS resolution disabled: "${name}"`);
  };
}
// ------------------------------------------------------------

// -------- CONFIG ----------
const UNISWAP_V2_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_ABI = [
  "function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable returns (uint,uint,uint)"
];

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 5) {
    console.log(`Usage:
node scripts/createDataCoin.js <FACTORY_ADDRESS> "<NAME>" "<SYMBOL>" <TOTAL_SUPPLY> "<CID>"`);
    return;
  }

  const [factoryAddr, rawName, rawSymbol, totalRaw, rawCid] = argv;
  const name = String(rawName);
  const symbol = String(rawSymbol);
  const cid = String(rawCid);
  const totalSupply = ethers.parseUnits(totalRaw, 18);

  // ----- Provider & Wallet -----
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Track and increment nonce manually (safe mode)
  let nonce = await provider.getTransactionCount(wallet.address, "latest");
  console.log("ℹ️ Starting nonce:", nonce);

  // Load ABIs
  const factoryArtifact = await hre.artifacts.readArtifact("DataCoinFactory");
  const tokenArtifact = await hre.artifacts.readArtifact("DataCoin");

  // ===== 1️⃣ Create token through factory =====
  console.log(`\n🚀 Creating token via factory at ${factoryAddr}`);
  const ifaceFactory = new ethers.Interface(factoryArtifact.abi);
  const calldata = ifaceFactory.encodeFunctionData("createDataCoin", [
    name,
    symbol,
    totalSupply,
    0n,
    cid,
  ]);

  const txCreate = await wallet.sendTransaction({
    to: ethers.getAddress(factoryAddr),
    data: calldata,
    nonce: nonce++,
  });
  const receiptCreate = await txCreate.wait();
  console.log(`📜 Tx confirmed: ${receiptCreate.hash}`);

  // ===== Parse DataCoinCreated event =====
  const iface = new ethers.Interface([
    "event DataCoinCreated(address indexed creator,address indexed dataCoinAddress,string symbol,string cid)"
  ]);
  let tokenAddr;
  for (const log of receiptCreate.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === "DataCoinCreated") {
        tokenAddr = parsed.args.dataCoinAddress;
        break;
      }
    } catch {}
  }

  if (!tokenAddr) {
    console.error("⚠️ Could not find DataCoinCreated event. Check Basescan.");
    return;
  }
  console.log("✅ DataCoin deployed at:", tokenAddr);

  // ===== 2️⃣ Mint allocations =====
  const token = new ethers.Contract(tokenAddr, tokenArtifact.abi, wallet);
  const total = totalSupply;
  const creatorAlloc = (total * 80n) / 100n;
  const treasuryAlloc = (total * 15n) / 100n;
  const liqAlloc = total - creatorAlloc - treasuryAlloc;
  const treasury = process.env.MYRAD_TREASURY;

  await (await token.mint(wallet.address, creatorAlloc, { nonce: nonce++ })).wait();
  await (await token.mint(ethers.getAddress(treasury), treasuryAlloc, { nonce: nonce++ })).wait();

  console.log(
    `✅ Minted allocations — Creator: ${ethers.formatUnits(
      creatorAlloc
    )}, Treasury: ${ethers.formatUnits(treasuryAlloc)}`
  );

  // ===== 3️⃣ Add Liquidity (ETH + token) =====
  const router = new ethers.Contract(
    ethers.getAddress(UNISWAP_V2_ROUTER),
    UNISWAP_ABI,
    wallet
  );
  const tokenLiq = liqAlloc;
  const ethLiq = ethers.parseEther("0.002");
  await (
    await token.approve(ethers.getAddress(UNISWAP_V2_ROUTER), tokenLiq, { nonce: nonce++ })
  ).wait();

  const deadline = Math.floor(Date.now() / 1000) + 600;
  await (
    await router.addLiquidityETH(
      ethers.getAddress(tokenAddr),
      tokenLiq,
      (tokenLiq * 95n) / 100n,
      (ethLiq * 95n) / 100n,
      ethers.getAddress(wallet.address),
      deadline,
      { value: ethLiq, nonce: nonce++ }
    )
  ).wait();
  console.log("💧 Liquidity added successfully (0.002 ETH paired).");

  // ===== 4️⃣ Update backend/datasets.json =====
  const file = path.join(__dirname, "../backend/datasets.json");
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  data[tokenAddr.toLowerCase()] = { symbol, cid };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log("🗂 Updated backend/datasets.json\n");

  console.log("🎉 Done! Nonce sequence ended at:", nonce - 1);
}

main().catch(console.error);
