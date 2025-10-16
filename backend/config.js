require("dotenv").config();
module.exports = {
  RPC: process.env.BASE_SEPOLIA_RPC_URL,
  PORT: process.env.PORT || 4000,
  DOWNLOAD_SECRET: process.env.DOWNLOAD_SECRET || "secret",
  DB_FILE: "./backend/db.json",
  DATASETS_FILE: "./backend/datasets.json"
};
