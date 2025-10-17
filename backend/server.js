const express = require("express");
const fs = require("fs");
const path = require("path");
const { PORT, DATASETS_FILE, DB_FILE } = require("./config");
const { ethers } = require("ethers");
const multer = require("multer");
const { uploadBase64ToLighthouse } = require("./uploadService");
const { createDatasetToken } = require("./createDatasetAPI");

const app = express();

// Configure multer for file upload (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

const BONDING_CURVE_ABI = [
  "function getPrice() public view returns (uint256)",
  "function ethBalance() public view returns (uint256)",
  "function tokenSupply() public view returns (uint256)",
  "function getBuyAmount(uint256 ethSpent) public view returns (uint256)",
  "function getSellAmount(uint256 tokenAmount) public view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);

app.get("/", (req, res) => {
  res.send("🚀 MYRAD Backend API running ✅");
});

app.get("/datasets", (req, res) => {
  if (!fs.existsSync(DATASETS_FILE)) return res.json({});
  const data = JSON.parse(fs.readFileSync(DATASETS_FILE));
  res.json(data);
});

app.get("/price/:curveAddress", async (req, res) => {
  try {
    const { curveAddress } = req.params;

    if (!ethers.isAddress(curveAddress)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, provider);
    const price = await curve.getPrice();
    const ethBal = await curve.ethBalance();
    const tokenSupply = await curve.tokenSupply();

    res.json({
      price: ethers.formatUnits(price, 18),
      ethBalance: ethers.formatEther(ethBal),
      tokenSupply: ethers.formatUnits(tokenSupply, 18),
    });
  } catch (err) {
    console.error("Price error:", err);
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.get("/quote/buy/:curveAddress/:ethAmount", async (req, res) => {
  try {
    const { curveAddress, ethAmount } = req.params;

    if (!ethers.isAddress(curveAddress)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const ethValue = ethers.parseEther(ethAmount);
    const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, provider);
    const tokenAmount = await curve.getBuyAmount(ethValue);

    res.json({
      ethAmount: ethAmount,
      tokenAmount: ethers.formatUnits(tokenAmount, 18),
      tokenAmountRaw: tokenAmount.toString(),
    });
  } catch (err) {
    console.error("Buy quote error:", err);
    res.status(500).json({ error: "Failed to calculate quote" });
  }
});

app.get("/quote/sell/:curveAddress/:tokenAmount", async (req, res) => {
  try {
    const { curveAddress, tokenAmount } = req.params;

    if (!ethers.isAddress(curveAddress)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const tokenValue = ethers.parseUnits(tokenAmount, 18);
    const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, provider);
    const ethAmount = await curve.getSellAmount(tokenValue);

    res.json({
      tokenAmount: tokenAmount,
      ethAmount: ethers.formatEther(ethAmount),
      ethAmountRaw: ethAmount.toString(),
    });
  } catch (err) {
    console.error("Sell quote error:", err);
    res.status(500).json({ error: "Failed to calculate quote" });
  }
});

app.get("/access/:user/:symbol", (req, res) => {
  const { user, symbol } = req.params;

  if (!fs.existsSync(DB_FILE)) {
    return res.status(404).json({ error: "no redemptions" });
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE));
  const entry = db
    .slice()
    .reverse()
    .find(
      x =>
        x.user.toLowerCase() === user.toLowerCase() && x.symbol === symbol
    );

  if (!entry) {
    return res.status(404).json({ error: "not found" });
  }

  res.json({
    user: entry.user,
    symbol: entry.symbol,
    download: entry.downloadUrl,
    ts: entry.ts,
  });
});

// Upload file to Lighthouse and get CID
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    console.log(`📤 Uploading file: ${req.file.originalname}`);

    // Convert file buffer to base64 for upload
    const base64Data = req.file.buffer.toString("base64");

    // Upload to Lighthouse
    const cid = await uploadBase64ToLighthouse(base64Data, req.file.originalname);

    console.log(`✅ File uploaded, CID: ${cid}`);

    res.json({
      success: true,
      cid: cid,
      filename: req.file.originalname,
      size: req.file.size,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      error: "Upload failed",
      message: err.message,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📊 Open http://localhost:${PORT}`);
});
