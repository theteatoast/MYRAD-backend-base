const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

// Initialize hardhat runtime (required for artifacts)
let hre;
try {
  hre = require("hardhat");
} catch (err) {
  console.error("Warning: Hardhat not initialized in this context");
}

const DATASETS_FILE = path.join(__dirname, "datasets.json");

/**
 * Create a DataCoin token with bonding curve using uploaded file CID
 * @param {string} cid - IPFS CID of uploaded file
 * @param {string} name - Dataset name
 * @param {string} symbol - Token symbol
 * @param {string} description - Dataset description
 * @returns {Promise<Object>} - Token and curve addresses
 */
async function createDatasetToken(cid, name, symbol, description) {
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL
    );
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const platformWallet = process.env.MYRAD_TREASURY || wallet.address;

    console.log(`\n🚀 Creating dataset token: ${name} (${symbol})`);
    console.log(`   Uploader: ${wallet.address}`);
    console.log(`   CID: ${cid}`);

    let nonce = await provider.getTransactionCount(wallet.address, "latest");

    // Load ABIs
    const factoryArtifact = await hre.artifacts.readArtifact("DataCoinFactory");
    const tokenArtifact = await hre.artifacts.readArtifact("DataCoin");
    const curveArtifact = await hre.artifacts.readArtifact("BondingCurve");

    // Get factory address from env
    const factoryAddr = process.env.FACTORY_ADDRESS;
    if (!factoryAddr) {
      throw new Error("FACTORY_ADDRESS not set in environment");
    }

    // Token parameters
    const TOTAL_SUPPLY = ethers.parseUnits("1000000", 18);
    const CREATOR_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const PLATFORM_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 90n) / 100n;
    const INITIAL_LIQUIDITY_ETH = ethers.parseEther("0.005");

    // Step 1: Create token via factory
    console.log(`\n💰 Step 1: Creating token...`);
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
      nonce: nonce++,
    });
    const receiptCreate = await txCreate.wait();
    console.log(`   ✅ Tx: ${receiptCreate.hash}`);

    // Parse DataCoinCreated event
    const iface = new ethers.Interface([
      "event DataCoinCreated(address indexed creator, address indexed dataCoinAddress, address indexed bondingCurveAddress, string symbol, string cid)",
    ]);

    let tokenAddr, curveAddr;
    for (const log of receiptCreate.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === "DataCoinCreated") {
          tokenAddr = parsed.args.dataCoinAddress;
          curveAddr = parsed.args.bondingCurveAddress;
          break;
        }
      } catch {}
    }

    if (!tokenAddr || !curveAddr) {
      throw new Error("Failed to parse DataCoinCreated event");
    }

    console.log(`   ✅ Token: ${tokenAddr}`);
    console.log(`   ✅ Curve: ${curveAddr}`);

    // Step 2: Distribute allocations via transfer (all tokens minted to creator in constructor)
    console.log(`\n💳 Step 2: Distributing token allocations...`);
    const token = new ethers.Contract(tokenAddr, tokenArtifact.abi, wallet);

    // Transfer platform allocation
    const txPlatformTransfer = await token.transfer(
      ethers.getAddress(platformWallet),
      PLATFORM_ALLOCATION,
      { nonce: nonce++ }
    );
    await txPlatformTransfer.wait();
    console.log(
      `   ✅ Platform: ${ethers.formatUnits(PLATFORM_ALLOCATION, 18)} tokens`
    );

    // Transfer curve allocation
    const txCurveTransfer = await token.transfer(
      curveAddr,
      LIQUIDITY_ALLOCATION,
      { nonce: nonce++ }
    );
    await txCurveTransfer.wait();
    console.log(
      `   ✅ Curve: ${ethers.formatUnits(LIQUIDITY_ALLOCATION, 18)} tokens`
    );

    // Creator keeps remaining allocation
    const creatorBalance = await token.balanceOf(wallet.address);
    console.log(
      `   ✅ Creator: ${ethers.formatUnits(creatorBalance, 18)} tokens`
    );

    // Step 3: Provide initial liquidity
    console.log(`\n💧 Step 3: Initializing bonding curve liquidity...`);
    const txLiquidity = await wallet.sendTransaction({
      to: curveAddr,
      value: INITIAL_LIQUIDITY_ETH,
      nonce: nonce++,
    });
    const receiptLiquidity = await txLiquidity.wait();
    if (!receiptLiquidity) {
      throw new Error("ETH transfer to curve failed - no receipt");
    }
    console.log(
      `   ✅ Sent ${ethers.formatEther(INITIAL_LIQUIDITY_ETH)} ETH to curve`
    );
    console.log(`   TX: ${receiptLiquidity.hash}`);

    // Verify curve state
    try {
      const curve = new ethers.Contract(curveAddr, curveArtifact.abi, provider);
      const ethBal = await curve.ethBalance();
      const tokenBal = await token.balanceOf(curveAddr);
      const price = await curve.getPrice();

      console.log(`\n📊 Bonding Curve State:`);
      console.log(`   ETH: ${ethers.formatEther(ethBal)} ETH`);
      console.log(`   Tokens: ${ethers.formatUnits(tokenBal, 18)}`);
      console.log(`   Price: ${ethers.formatUnits(price, 18)} ETH/token`);
    } catch (err) {
      console.warn(`   ⚠️  Could not verify curve state: ${err.message}`);
    }

    // Step 4: Update backend registry
    console.log(`\n📁 Step 4: Updating registry...`);
    const data = fs.existsSync(DATASETS_FILE)
      ? JSON.parse(fs.readFileSync(DATASETS_FILE))
      : {};

    data[tokenAddr.toLowerCase()] = {
      symbol: symbol,
      cid: cid,
      bonding_curve: curveAddr.toLowerCase(),
      creator: wallet.address.toLowerCase(),
      name: name,
      description: description,
      timestamp: Date.now(),
    };

    fs.writeFileSync(DATASETS_FILE, JSON.stringify(data, null, 2));
    console.log(`   ✅ Registered in datasets.json`);

    console.log(`\n✅ Dataset created successfully!`);
    console.log(`   Token: ${tokenAddr}`);
    console.log(`   Curve: ${curveAddr}`);
    console.log(
      `   Explorer: https://sepolia.basescan.org/address/${tokenAddr}`
    );

    return {
      tokenAddress: tokenAddr,
      curveAddress: curveAddr,
      symbol: symbol,
      name: name,
      cid: cid,
    };
  } catch (err) {
    console.error("❌ Creation failed:", err.message);
    throw err;
  }
}

module.exports = { createDatasetToken };
