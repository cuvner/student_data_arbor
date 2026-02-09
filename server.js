const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

const API_URL =
  "https://livingstone-academy.uk.arbor.sc/data-export/export/id/235/h/c4f245d9e6235dc9/format/json/v/2/";
const AUTH_STRING =
  "Basic bGF1dG9tdGlvbnM6ZTdhY2RiNmRjYzc2NWYxODI2YzVkZmZmYTU0ZTgyMDgwNDc4YTEyMA==";

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute (60,000ms)

// Function to fetch data from Arbor
async function refreshArborData() {
  try {
    console.log("Refreshing Arbor Cache...");
    const response = await fetch(API_URL, {
      headers: { Authorization: AUTH_STRING, Accept: "application/json" },
    });
    if (response.ok) {
      cachedData = await response.json();
      lastFetchTime = Date.now();
      console.log("Cache Updated.");
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

// Initial fetch when server starts
refreshArborData();

// Endpoint sends the cache instantly
app.get("/data", async (req, res) => {
  // If cache is older than 1 minute, refresh it in the background
  if (Date.now() - lastFetchTime > CACHE_DURATION) {
    refreshArborData();
  }

  if (cachedData) {
    res.json(cachedData);
  } else {
    res.status(503).json({ error: "Data not ready yet" });
  }
});

app.listen(PORT, () => console.log(`🚀 Fast Server: http://localhost:${PORT}`));
