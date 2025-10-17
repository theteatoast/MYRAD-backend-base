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
 * @param {string} cid - IPFS CID of uploaded file
 * @param {string} name - Dataset name
 * @param {string} symbol - Token symbol
 * @param {string} description - Dataset description
 * @returns {Promise<Object>} - Token, marketplace, and pool info
 */
async function createDatasetToken(cid, name, symbol, description) {
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL
    );
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const platformWallet = process.env.MYRAD_TREASURY || wallet.address;
    const marketplaceAddr = process.env.MARKETPLACE_ADDRESS;

    if (!marketplaceAddr || marketplaceAddr === "0x0000000000000000000000000000000000000000") {
      throw new Error("MARKETPLACE_ADDRESS not configured - deploy marketplace first");
    }

    console.log(`\n🚀 Creating dataset token: ${name} (${symbol})`);
    console.log(`   Uploader: ${wallet.address}`);
    console.log(`   CID: ${cid}`);

    let nonce = await provider.getTransactionCount(wallet.address, "latest");

    // Load ABIs
    const tokenArtifact = await hre.artifacts.readArtifact("DataCoin");
    const factoryArtifact = await hre.artifacts.readArtifact("DataCoinFactory");
    const marketplaceArtifact = await hre.artifacts.readArtifact("DataTokenMarketplace");
    const usdcArtifact = {
      abi: [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
      ]
    };

    const factoryAddr = process.env.FACTORY_ADDRESS;
    if (!factoryAddr) {
      throw new Error("FACTORY_ADDRESS not set in environment");
    }

    // Token parameters (90/5/5 split)
    const TOTAL_SUPPLY = ethers.parseUnits("1000000", 18);
    const CREATOR_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const PLATFORM_ALLOCATION = (TOTAL_SUPPLY * 5n) / 100n;
    const LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 90n) / 100n;

    // USDC parameters (6 decimals)
    const INITIAL_USDC_LIQUIDITY = ethers.parseUnits("1", 6); // 1 USDC for liquidity

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
      throw new Error("Failed to parse DataCoinCreated event");
    }

    console.log(`   ✅ Token: ${tokenAddr}`);

    // Step 2: Distribute allocations via transfer (all tokens minted to creator in constructor)
    console.log(`\n💳 Step 2: Distributing token allocations...`);
    const token = new ethers.Contract(tokenAddr, tokenArtifact.abi, wallet);

    // Add delay to prevent RPC throttling
    await new Promise(r => setTimeout(r, 3000));

    // Transfer platform allocation
    const txPlatformTransfer = await token.transfer(
      ethers.getAddress(platformWallet),
      PLATFORM_ALLOCATION,
      { nonce: nonce++, gasLimit: 100000 }
    );
    await txPlatformTransfer.wait();
    console.log(
      `   ✅ Platform: ${ethers.formatUnits(PLATFORM_ALLOCATION, 18)} tokens`
    );

    // Add delay between transfers
    await new Promise(r => setTimeout(r, 3000));

    // Transfer marketplace allocation
    const txMarketplaceTransfer = await token.transfer(
      ethers.getAddress(marketplaceAddr),
      LIQUIDITY_ALLOCATION,
      { nonce: nonce++, gasLimit: 100000 }
    );
    await txMarketplaceTransfer.wait();
    console.log(
      `   ✅ Marketplace pool: ${ethers.formatUnits(LIQUIDITY_ALLOCATION, 18)} tokens`
    );

    // Creator keeps remaining allocation
    const creatorBalance = await token.balanceOf(wallet.address);
    console.log(
      `   ✅ Creator: ${ethers.formatUnits(creatorBalance, 18)} tokens`
    );

    // Add delay before next step
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Initialize pool in marketplace with USDC
    console.log(`\n💧 Step 3: Initializing USDC liquidity pool...`);

    const usdc = new ethers.Contract(
      process.env.BASE_SEPOLIA_USDC,
      usdcArtifact.abi,
      wallet
    );

    const marketplace = new ethers.Contract(
      marketplaceAddr,
      marketplaceArtifact.abi,
      wallet
    );

    // Check if pool already exists to prevent duplicate initialization
    try {
      const poolExists = await marketplace.poolExists(tokenAddr);
      if (poolExists) {
        console.log(`   ⚠️  Pool already exists for this token, skipping initialization`);
        return {
          tokenAddress: tokenAddr,
          marketplaceAddress: marketplaceAddr,
          symbol: symbol,
          name: name,
          cid: cid,
        };
      }
    } catch (err) {
      console.log(`   ℹ️  Could not check pool existence, proceeding...`);
    }

    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`   USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    if (usdcBalance < INITIAL_USDC_LIQUIDITY) {
      throw new Error(
        `❌ INSUFFICIENT USDC\n   Need: ${ethers.formatUnits(INITIAL_USDC_LIQUIDITY, 6)} USDC\n   Have: ${ethers.formatUnits(usdcBalance, 6)} USDC\n   Get more USDC from: https://www.superbridge.app/base-sepolia`
      );
    }

    // Approve token spending by marketplace (with longer wait)
    console.log(`   ⏳ Approving tokens...`);
    const approveTx1 = await token.approve(
      marketplaceAddr,
      LIQUIDITY_ALLOCATION,
      { nonce: nonce++ }
    );
    await approveTx1.wait();
    console.log(`   ✅ Tokens approved`);

    // Wait a bit before next transaction to avoid RPC throttling
    await new Promise(r => setTimeout(r, 2000));

    // Approve USDC spending by marketplace
    console.log(`   ⏳ Approving USDC...`);
    const approveTx2 = await usdc.approve(
      marketplaceAddr,
      INITIAL_USDC_LIQUIDITY,
      { nonce: nonce++ }
    );
    await approveTx2.wait();
    console.log(`   ✅ USDC approved`);

    // Wait a bit before pool initialization
    await new Promise(r => setTimeout(r, 2000));

    // Initialize pool
    console.log(`   ⏳ Initializing pool...`);
    const txPool = await marketplace.initPool(
      tokenAddr,
      wallet.address,
      LIQUIDITY_ALLOCATION,
      INITIAL_USDC_LIQUIDITY,
      { nonce: nonce++ }
    );
    const receiptPool = await txPool.wait();
    if (!receiptPool) {
      throw new Error("Pool initialization failed");
    }
    console.log(`   ✅ Pool initialized`);
    console.log(`   TX: ${receiptPool.hash}`);

    // Verify pool state
    try {
      const [rToken, rUSDC] = await marketplace.getReserves(tokenAddr);
      const price = await marketplace.getPriceUSDCperToken(tokenAddr);

      console.log(`\n📊 Liquidity Pool State:`);
      console.log(`   Token: ${ethers.formatUnits(rToken, 18)}`);
      console.log(`   USDC: ${ethers.formatUnits(rUSDC, 6)} USDC`);
      console.log(`   Price: ${ethers.formatUnits(price, 18)} USDC/token`);
    } catch (err) {
      console.warn(`   ⚠️  Could not verify pool state: ${err.message}`);
    }

    // Step 4: Update backend registry
    console.log(`\n📁 Step 4: Updating registry...`);
    const data = fs.existsSync(DATASETS_FILE)
      ? JSON.parse(fs.readFileSync(DATASETS_FILE))
      : {};

    data[tokenAddr.toLowerCase()] = {
      symbol: symbol,
      cid: cid,
      token_address: tokenAddr.toLowerCase(),
      marketplace_address: marketplaceAddr.toLowerCase(),
      creator: wallet.address.toLowerCase(),
      name: name,
      description: description,
      timestamp: Date.now(),
    };

    fs.writeFileSync(DATASETS_FILE, JSON.stringify(data, null, 2));
    console.log(`   ✅ Registered in datasets.json`);

    console.log(`\n✅ Dataset created successfully!`);
    console.log(`   Token: ${tokenAddr}`);
    console.log(`   Marketplace: ${marketplaceAddr}`);
    console.log(
      `   Explorer: https://sepolia.basescan.org/address/${tokenAddr}`
    );

    return {
      tokenAddress: tokenAddr,
      marketplaceAddress: marketplaceAddr,
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
