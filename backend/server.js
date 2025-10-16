// backend/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const { PORT, DATASETS_FILE, DB_FILE } = require("./config");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend"))); // optional: serve frontend

// Return list of available tokens (datasets.json)
app.get("/datasets", (req, res) => {
  if (!fs.existsSync(DATASETS_FILE)) return res.json({});
  const data = JSON.parse(fs.readFileSync(DATASETS_FILE));
  res.json(data);
});

// Return last access record for a user & symbol
app.get("/access/:user/:symbol", (req, res) => {
  const { user, symbol } = req.params;
  if (!fs.existsSync(DB_FILE)) return res.status(404).json({ error: "no redemptions" });
  const db = JSON.parse(fs.readFileSync(DB_FILE));
  // find most recent matching entry
  const entry = db.slice().reverse().find(x => x.user.toLowerCase() === user.toLowerCase() && x.symbol === symbol);
  if (!entry) return res.status(404).json({ error: "not found" });
  res.json({ user: entry.user, symbol: entry.symbol, download: entry.downloadUrl, ts: entry.ts });
});

app.get("/", (req, res) => {
  res.send("MYRAD Backend API running ✅");
});

app.listen(PORT, () => console.log(`🚀 Backend API running on port ${PORT}`));
