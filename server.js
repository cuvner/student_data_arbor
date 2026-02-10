require('dotenv').config();
const express = require("express");
const cors = require("cors");
const os = require("os");
const https = require("https");
const fs = require("fs");

const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3443;
const API_URL = process.env.ARBOR_API_URL;
const AUTH_STRING = process.env.ARBOR_AUTH_TOKEN;

// --- SSL SETUP ---
const sslOptions = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

// --- CACHE & STATE ---
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.static("public"));

// --- DATA SCRUBBING LOGIC (GDPR COMPLIANCE) ---
function scrubStudentData(rawData) {
  const arborData = Array.isArray(rawData) ? rawData : (rawData.data || []);
  
  return arborData.map(student => {
    const fullName = student["Student"] || "Unknown";
    const nameParts = fullName.trim().split(/\s+/);
    
    // Calculate initials on the server so full names are never transmitted
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0] ? nameParts[0][0] : "?").toUpperCase();

    return {
      "Arbor Student ID": student["Arbor Student ID"],
      "Initials": initials,
      "Points": Number(student["Points"]) || 0
    };
  });
}

// --- API FETCHING ---
async function refreshArborData() {
  if (!API_URL || !AUTH_STRING) {
    console.error("❌ Error: API_URL or AUTH_TOKEN missing in .env");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      headers: { "Authorization": AUTH_STRING, "Accept": "application/json" },
    });
    
    if (response.ok) {
      const data = await response.json();
      // Scrub immediately after fetching
      cachedData = scrubStudentData(data);
      lastFetchTime = Date.now();
      console.log(`[${new Date().toLocaleTimeString()}] Data scrubbed and cached.`);
    } else {
      console.error(`Arbor API Error: ${response.status}`);
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

// Initial fetch on startup
refreshArborData();

// --- ROUTES ---
app.get("/data", (req, res) => {
  // Auto-refresh if cache is old
  if (Date.now() - lastFetchTime > CACHE_DURATION) {
    refreshArborData();
  }

  if (cachedData) {
    res.json(cachedData);
  } else {
    res.status(503).json({ error: "Waiting for initial data fetch" });
  }
});

// --- START SECURE SERVER ---
// Binding to '127.0.0.1' ensures only the Pi itself can see this data.
https.createServer(sslOptions, app).listen(PORT, '127.0.0.1', () => {
  console.log("-----------------------------------------");
  console.log(`🔐 GDPR-SECURE KIOSK SERVER`);
  console.log(`🏠 Internal Address: https://127.0.0.1:${PORT}`);
  console.log(`🚫 External Network: BLOCKED`);
  console.log(`✅ Data Status: Scrubbing full names to initials`);
  console.log("-----------------------------------------");
});