const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

let hre;
try {
  hre = require("hardhat");
} catch (err) {
  console.error("Warning: Hardhat not initialized in this context");
}

const DATASETS_FILE = path.join(__dirname, "datasets.json");

/**
 * Create a DataCoin token and initialize USDC pool in marketplace
 */
async function createDatasetToken(cid, name, symbol, description) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const platformWallet = process.env.MYRAD_TREASURY || wallet.address;
    const marketplaceAddr = process.env.MARKETPLACE_ADDRESS;

    if (!marketplaceAddr || marketplaceAddr === "0x0000000000000000000000000000000000000000") {
      throw new Error("MARKETPLACE_ADDRESS not configured");
    }

    console.log(`\n🚀 Creating dataset: ${name} (${symbol})`);
    console.log(`   CID: ${cid}`);

    const nonce = await provider.getTransactionCount(wallet.address, "latest");

    // Load ABIs
    const tokenArtifact = await hre.artifacts.readArtifact("DataCoin");
    const factoryArtifact = await hre.artifacts.readArtifact("DataCoinFactory");
    const marketplaceArtifact = await hre.artifacts.readArtifact("DataTokenMarketplace");

    const factoryAddr = process.env.FACTORY_ADDRESS;
    if (!factoryAddr) {
      throw new Error("FACTORY_ADDRESS not set");
    }

    // Token allocation (90/5/5)
    const TOTAL_SUPPLY = ethers.parseUnits("1000000", 18);
    const CREATOR_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const PLATFORM_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 90n) / 100n;
    const INITIAL_USDC = ethers.parseUnits("1", 6);

    let txCount = nonce;

    // Step 1: Create token
    console.log(`💰 Creating token...`);
    const ifaceFactory = new ethers.Interface(factoryArtifact.abi);
    const calldata = ifaceFactory.encodeFunctionData("createDataCoin", [
      name,
      symbol,
      TOTAL_SUPPLY,
      0n,
      cid,
    ]);

    const txCreate = await wallet.sendTransaction({
      to: ethers.getAddress(factoryAddr),
      data: calldata,
      nonce: txCount++,
    });
    const receiptCreate = await txCreate.wait();
    
    const iface = new ethers.Interface([
      "event DataCoinCreated(address indexed creator, address indexed dataCoinAddress, address indexed bondingCurveAddress, string symbol, string cid)",
    ]);

    let tokenAddr;
    for (const log of receiptCreate.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "DataCoinCreated") {
          tokenAddr = parsed.args.dataCoinAddress;
          break;
        }
      } catch {}
    }

    if (!tokenAddr) {
      throw new Error("Failed to get token address");
    }

    console.log(`   ✅ Token: ${tokenAddr}`);

    // Step 2: Distribute tokens (fast transfers)
    console.log(`💳 Distributing allocations...`);
    const token = new ethers.Contract(tokenAddr, tokenArtifact.abi, wallet);

    // Transfer platform
    await (await token.transfer(ethers.getAddress(platformWallet), PLATFORM_ALLOCATION, { nonce: txCount++ })).wait();
    console.log(`   ✅ Platform: ${ethers.formatUnits(PLATFORM_ALLOCATION, 18)}`);

    // Transfer marketplace (where liquidity goes)
    await (await token.transfer(ethers.getAddress(marketplaceAddr), LIQUIDITY_ALLOCATION, { nonce: txCount++ })).wait();
    console.log(`   ✅ Liquidity pool: ${ethers.formatUnits(LIQUIDITY_ALLOCATION, 18)}`);

    // Step 3: Initialize pool with USDC
    console.log(`💧 Initializing USDC pool...`);

    const usdc = new ethers.Contract(
      process.env.BASE_SEPOLIA_USDC,
      ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
      wallet
    );

    const marketplace = new ethers.Contract(marketplaceAddr, marketplaceArtifact.abi, wallet);

    // Check balance
    const usdcBalance = await usdc.balanceOf(wallet.address);
    if (usdcBalance < INITIAL_USDC) {
      throw new Error(`Insufficient USDC: need ${ethers.formatUnits(INITIAL_USDC, 6)}, have ${ethers.formatUnits(usdcBalance, 6)}`);
    }

    // Approve and initialize in sequence
    await (await usdc.approve(marketplaceAddr, INITIAL_USDC, { nonce: txCount++ })).wait();
    await (await marketplace.initPool(tokenAddr, wallet.address, LIQUIDITY_ALLOCATION, INITIAL_USDC, { nonce: txCount++ })).wait();
    console.log(`   ✅ Pool initialized with 1 USDC`);

    // Register
    console.log(`📝 Registering...`);
    const data = fs.existsSync(DATASETS_FILE) ? JSON.parse(fs.readFileSync(DATASETS_FILE)) : {};
    data[tokenAddr.toLowerCase()] = {
      symbol,
      cid,
      token_address: tokenAddr.toLowerCase(),
      marketplace_address: marketplaceAddr.toLowerCase(),
      creator: wallet.address.toLowerCase(),
      name,
      description,
      timestamp: Date.now(),
    };
    fs.writeFileSync(DATASETS_FILE, JSON.stringify(data, null, 2));

    console.log(`✅ COMPLETE - Token ready for trading!\n`);
    return { tokenAddress: tokenAddr, marketplaceAddress: marketplaceAddr, symbol, name, cid };
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    throw err;
  }
}

module.exports = { createDatasetToken };
