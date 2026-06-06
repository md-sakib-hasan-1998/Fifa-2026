// ─── syncTeamsPlayers.js ──────────────────────────────────
// Run ONCE before the tournament starts to seed your MongoDB
// with all 48 World Cup teams and their full squads.
//
// Usage on Pi: node scripts/syncTeamsPlayers.js
//
// This script:
//  1. Fetches all 48 WC 2026 teams from api-football
//  2. For each team, fetches the squad (players)
//  3. POSTs them to your backend (you'll need to add the
//     /api/admin/sync-teams route — see note at bottom)
//
// Run this again anytime squads change (injuries, call-ups).

require("dotenv").config({ path: "../.env" });
const axios = require("axios");

const API_KEY   = process.env.SPORTS_API_KEY;
const API_BASE  = process.env.SPORTS_API_BASE || "https://v3.football.api-sports.io";
const LEAGUE_ID = parseInt(process.env.WC_LEAGUE_ID || "1");
const SEASON    = parseInt(process.env.WC_SEASON    || "2026");
const BACKEND   = process.env.BACKEND_URL;
const PI_SECRET = process.env.PI_SECRET;

const sportsAPI = axios.create({
  baseURL: API_BASE,
  headers: { "x-apisports-key": API_KEY },
  timeout: 15000,
});

const backendAPI = axios.create({
  baseURL: BACKEND,
  headers: { "x-pi-secret": PI_SECRET, "Content-Type": "application/json" },
  timeout: 15000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Fetch all teams in the tournament ───────────────────
const fetchAllTeams = async () => {
  console.log("📡 Fetching WC 2026 teams...");
  const res = await sportsAPI.get("/teams", {
    params: { league: LEAGUE_ID, season: SEASON },
  });
  return res.data.response || [];
};

// ─── Fetch squad for one team ─────────────────────────────
const fetchSquad = async (teamId) => {
  try {
    const res = await sportsAPI.get("/players/squads", {
      params: { team: teamId },
    });
    return res.data.response?.[0]?.players || [];
  } catch {
    return [];
  }
};

// ─── Push one team + its players to the backend ──────────
const pushTeamData = async (teamData, players) => {
  try {
    await backendAPI.post("/api/admin/sync-team", {
      team: {
        apiTeamId: String(teamData.team.id),
        name:      teamData.team.name,
        shortName: teamData.team.code || teamData.team.name.substring(0, 3).toUpperCase(),
        country:   teamData.team.country,
        logoUrl:   teamData.team.logo,
      },
      players: players.map((p) => ({
        apiPlayerId:  String(p.id),
        name:         p.name,
        photoUrl:     p.photo,
        nationality:  teamData.team.country,
        age:          p.age,
        position:     mapPosition(p.position),
        jerseyNumber: p.number || null,
      })),
    });

    console.log(`✅ Synced: ${teamData.team.name} (${players.length} players)`);
  } catch (err) {
    console.error(`❌ Failed to sync ${teamData.team.name}:`, err.response?.data?.message || err.message);
  }
};

// ─── Map api-football position names to our enum ─────────
const mapPosition = (pos) => {
  const map = {
    Goalkeeper: "Goalkeeper",
    Defender:   "Defender",
    Midfielder: "Midfielder",
    Attacker:   "Forward",
  };
  return map[pos] || "Midfielder";
};

// ─── Main ─────────────────────────────────────────────────
const run = async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  FIFA 2026 — Team & Player Sync");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const teams = await fetchAllTeams();
  console.log(`Found ${teams.length} teams\n`);

  for (const teamData of teams) {
    const squad = await fetchSquad(teamData.team.id);
    await pushTeamData(teamData, squad);
    // Respect API rate limits — 1 request per second on free plan
    await sleep(1100);
  }

  console.log("\n✅ Sync complete.");
};

run().catch((err) => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
