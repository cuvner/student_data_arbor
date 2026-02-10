require('dotenv').config(); // Load variables from .env
const express = require("express");
const cors = require("cors");
const os = require("os");
const https = require("https");
const fs = require("fs");

const app = express();

// Load values from .env with fallbacks
const PORT = process.env.PORT || 3443;
const API_URL = process.env.ARBOR_API_URL;
const AUTH_STRING = process.env.ARBOR_AUTH_TOKEN;

// --- SSL CREDENTIALS ---
// Ensure key.pem and cert.pem exist in your root folder
const sslOptions = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

// --- CACHE SETUP ---
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.static("public"));

// --- DATA LOGIC ---
async function refreshArborData() {
  if (!API_URL || !AUTH_STRING) {
    console.error("❌ Error: API_URL or AUTH_TOKEN missing in .env file");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      headers: { "Authorization": AUTH_STRING, "Accept": "application/json" },
    });
    
    if (response.ok) {
      const rawData = await response.json();
      cachedData = Array.isArray(rawData) ? rawData : (rawData.data || []);
      lastFetchTime = Date.now();
      console.log(`[${new Date().toLocaleTimeString()}] Arbor Cache Updated.`);
    } else {
      console.error(`Arbor Error: ${response.status}`);
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

// Initial fetch
refreshArborData();

app.get("/data", (req, res) => {
  if (Date.now() - lastFetchTime > CACHE_DURATION) refreshArborData();
  cachedData ? res.json(cachedData) : res.status(503).json({ error: "Waiting for data" });
});

// --- HELPER: GET NETWORK IP ---
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}

// --- START SECURE SERVER ---
https.createServer(sslOptions, app).listen(PORT, () => {
  const localIP = getLocalIP();
  console.log("-----------------------------------------");
  console.log(`🔐 SECURE SERVER LOADED FROM .ENV`);
  console.log(`🌐 Network Access: https://${localIP}:${PORT}`);
  console.log("-----------------------------------------");
});