// ─── testConnection.js ────────────────────────────────────
// Run this before starting the fetcher to confirm:
//  1. Your Pi can reach the backend
//  2. The PI_SECRET is accepted
//  3. The Sports API key is valid
//
// Usage: node testConnection.js

require("dotenv").config();
const axios = require("axios");

const BACKEND  = process.env.BACKEND_URL;
const SECRET   = process.env.PI_SECRET;
const API_KEY  = process.env.SPORTS_API_KEY;
const API_BASE = process.env.SPORTS_API_BASE || "https://v3.football.api-sports.io";

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);

const run = async () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  FIFA 2026 Pi — Connection Test");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ─── Test 1: Backend health check ──────────────────────
  console.log("Test 1: Backend reachability");
  try {
    const res = await axios.get(`${BACKEND}/api/health`, { timeout: 8000 });
    pass(`Backend is reachable: ${res.data.message}`);
  } catch (err) {
    fail(`Cannot reach backend at ${BACKEND}`);
    info(`Error: ${err.message}`);
    info("Check: Is BACKEND_URL correct? Is the server running?");
  }

  // ─── Test 2: Pi secret authentication ──────────────────
  console.log("\nTest 2: Pi secret authentication");
  try {
    // We send a dummy payload — a 404 from backend means auth passed
    // A 401 means the secret is wrong
    await axios.post(
      `${BACKEND}/api/matches/pi/update`,
      { apiMatchId: "test_connection_check" },
      {
        headers: { "x-pi-secret": SECRET },
        timeout: 8000,
        validateStatus: (s) => s < 500, // don't throw on 4xx
      }
    );
    pass("PI_SECRET is accepted by the backend");
  } catch (err) {
    if (err.response?.status === 401) {
      fail("PI_SECRET was rejected (401). Check it matches backend .env");
    } else {
      fail(`Unexpected error: ${err.message}`);
    }
  }

  // ─── Test 3: Sports API key ─────────────────────────────
  console.log("\nTest 3: Sports API key");
  try {
    const res = await axios.get(`${API_BASE}/status`, {
      headers: { "x-apisports-key": API_KEY },
      timeout: 8000,
    });

    const account = res.data.response?.account;
    const sub = res.data.response?.subscription;
    const requests = res.data.response?.requests;

    if (account) {
      pass(`API key valid. Account: ${account.email}`);
      info(`Plan: ${sub?.plan || "unknown"}`);
      info(`Requests today: ${requests?.current ?? "?"} / ${requests?.limit_day ?? "?"}`);
    } else {
      fail("API key response was unexpected. Check your key.");
    }
  } catch (err) {
    fail(`Sports API unreachable: ${err.message}`);
    info("Check: Is SPORTS_API_KEY correct?");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Test complete. Fix any ❌ above before");
  console.log("  starting the fetcher with: node fetcher.js");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
};

run();
