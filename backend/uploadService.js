const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY;
const LIGHTHOUSE_API_URL = "https://node.lighthouse.storage/api/v0/add";

/**
 * Upload file to Lighthouse IPFS and return CID
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Original filename
 * @returns {Promise<string>} - IPFS CID
 */
async function uploadToLighthouse(fileBuffer, fileName) {
  try {
    if (!LIGHTHOUSE_API_KEY) {
      throw new Error("LIGHTHOUSE_API_KEY not configured");
    }

    const form = new FormData();
    form.append("file", fileBuffer, fileName);

    const response = await axios.post(LIGHTHOUSE_API_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${LIGHTHOUSE_API_KEY}`,
      },
      timeout: 60000,
    });

    if (response.data && response.data.Hash) {
      const cid = response.data.Hash;
      console.log(`✅ File uploaded to IPFS: ${cid}`);
      return cid;
    } else {
      throw new Error("No CID returned from Lighthouse");
    }
  } catch (err) {
    console.error("❌ Lighthouse upload failed:", err.message);
    throw new Error(`Upload failed: ${err.message}`);
  }
}

/**
 * Upload file from base64 encoded data
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original filename
 * @returns {Promise<string>} - IPFS CID
 */
async function uploadBase64ToLighthouse(base64Data, fileName) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");
    return await uploadToLighthouse(buffer, fileName);
  } catch (err) {
    throw new Error(`Base64 upload failed: ${err.message}`);
  }
}

module.exports = {
  uploadToLighthouse,
  uploadBase64ToLighthouse,
};
