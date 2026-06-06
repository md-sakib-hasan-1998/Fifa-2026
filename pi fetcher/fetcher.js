require("dotenv").config();
const axios = require("axios");

// ─── Config ───────────────────────────────────────────────
const BACKEND_URL  = process.env.BACKEND_URL;
const PI_SECRET    = process.env.PI_SECRET;
const API_KEY      = process.env.SPORTS_API_KEY;
const API_BASE     = process.env.SPORTS_API_BASE || "https://v3.football.api-sports.io";
const LEAGUE_ID    = parseInt(process.env.WC_LEAGUE_ID  || "1");
const SEASON       = parseInt(process.env.WC_SEASON     || "2026");
const INTERVAL_IDLE = parseInt(process.env.POLL_INTERVAL_IDLE || "120000"); // 2 min when quiet
const INTERVAL_LIVE = parseInt(process.env.POLL_INTERVAL_LIVE || "30000");  // 30 sec during matches

// ─── Validate env on startup ──────────────────────────────
if (!BACKEND_URL || !PI_SECRET || !API_KEY) {
  console.error("❌ Missing required env variables. Check your .env file.");
  console.error("   Required: BACKEND_URL, PI_SECRET, SPORTS_API_KEY");
  process.exit(1);
}

// ─── API clients ─────────────────────────────────────────
const sportsAPI = axios.create({
  baseURL: API_BASE,
  headers: {
    "x-apisports-key": API_KEY,
  },
  timeout: 10000,
});

const backendAPI = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "x-pi-secret": PI_SECRET,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ─── State ───────────────────────────────────────────────
// Tracks last known score for each match so we only push
// changes to the backend (saves bandwidth and API calls).
const lastKnownState = new Map();
let pollTimer = null;
let consecutiveErrors = 0;
const MAX_ERRORS = 5; // pause after this many errors in a row

// ─────────────────────────────────────────────────────────
//  STEP 1 — Fetch today's WC matches from the sports API
// ─────────────────────────────────────────────────────────
const fetchTodayMatches = async () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    const res = await sportsAPI.get("/fixtures", {
      params: {
        league:  LEAGUE_ID,
        season:  SEASON,
        date:    today,
        timezone: "UTC",
      },
    });

    return res.data.response || [];
  } catch (err) {
    console.error("⚠️  Failed to fetch today's matches:", err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────
//  STEP 2 — Fetch live matches (status = 1H, 2H, HT, ET, P)
// ─────────────────────────────────────────────────────────
const fetchLiveMatches = async () => {
  try {
    const res = await sportsAPI.get("/fixtures", {
      params: {
        league: LEAGUE_ID,
        season: SEASON,
        live:   "all",
      },
    });

    return res.data.response || [];
  } catch (err) {
    console.error("⚠️  Failed to fetch live matches:", err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────
//  STEP 3 — Map API response → backend payload format
// ─────────────────────────────────────────────────────────
const mapFixtureToPayload = (fixture) => {
  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const score = fixture.score;
  const events = fixture.events || [];

  // Map API status codes to our backend status values
  const statusMap = {
    "NS":  "scheduled",   // Not started
    "1H":  "live",        // First half
    "HT":  "halftime",    // Half time
    "2H":  "live",        // Second half
    "ET":  "live",        // Extra time
    "P":   "live",        // Penalties
    "FT":  "finished",    // Full time
    "AET": "finished",    // After extra time
    "PEN": "finished",    // After penalties
    "PST": "postponed",   // Postponed
    "CANC":"postponed",   // Cancelled
  };

  const mappedStatus = statusMap[f.status.short] || "scheduled";

  // Parse goal events
  const goalEvents = events
    .filter((e) => e.type === "Goal")
    .map((e) => ({
      minute:     e.time.elapsed,
      team:       e.team.id === teams.home.id ? "home" : "away",
      playerName: e.player.name,
      type:       e.detail === "Own Goal"
                    ? "own_goal"
                    : e.detail === "Penalty"
                    ? "penalty"
                    : "goal",
    }));

  // Parse card events
  const cardEvents = events
    .filter((e) => e.type === "Card")
    .map((e) => ({
      minute:     e.time.elapsed,
      team:       e.team.id === teams.home.id ? "home" : "away",
      playerName: e.player.name,
      cardType:   e.detail === "Yellow Card"
                    ? "yellow"
                    : e.detail === "Red Card"
                    ? "red"
                    : "yellow_red",
    }));

  return {
    apiMatchId:  String(f.id),
    status:      mappedStatus,
    minute:      f.status.elapsed || null,

    score: {
      home:        goals.home ?? 0,
      away:        goals.away ?? 0,
      homePenalty: score.penalty.home ?? null,
      awayPenalty: score.penalty.away ?? null,
    },

    goals: goalEvents,
    cards: cardEvents,

    // Extra info for reference (backend ignores unknown fields safely)
    homeTeam: {
      name:      teams.home.name,
      shortName: teams.home.name.substring(0, 3).toUpperCase(),
      logoUrl:   teams.home.logo,
      apiTeamId: String(teams.home.id),
    },
    awayTeam: {
      name:      teams.away.name,
      shortName: teams.away.name.substring(0, 3).toUpperCase(),
      logoUrl:   teams.away.logo,
      apiTeamId: String(teams.away.id),
    },
  };
};

// ─────────────────────────────────────────────────────────
//  STEP 4 — Check if anything has changed since last push
// ─────────────────────────────────────────────────────────
const hasChanged = (apiMatchId, payload) => {
  const prev = lastKnownState.get(apiMatchId);
  if (!prev) return true; // first time seeing this match

  const prevStr = JSON.stringify({
    status: prev.status,
    homeScore: prev.score.home,
    awayScore: prev.score.away,
    minute: prev.minute,
    goalCount: prev.goals.length,
    cardCount: prev.cards.length,
  });

  const currStr = JSON.stringify({
    status: payload.status,
    homeScore: payload.score.home,
    awayScore: payload.score.away,
    minute: payload.minute,
    goalCount: payload.goals.length,
    cardCount: payload.cards.length,
  });

  return prevStr !== currStr;
};

// ─────────────────────────────────────────────────────────
//  STEP 5 — Push a single match update to the backend
// ─────────────────────────────────────────────────────────
const pushUpdate = async (payload) => {
  try {
    await backendAPI.post("/api/matches/pi/update", payload);

    // Save to local state so we can skip unchanged matches
    lastKnownState.set(payload.apiMatchId, payload);

    console.log(
      `✅ Updated: ${payload.homeTeam?.name} ${payload.score.home}–${payload.score.away} ${payload.awayTeam?.name}` +
      ` | ${payload.status}${payload.minute ? " " + payload.minute + "'" : ""}`
    );

    consecutiveErrors = 0; // reset error counter on success
  } catch (err) {
    console.error(
      `❌ Failed to push update for match ${payload.apiMatchId}:`,
      err.response?.data?.message || err.message
    );
    consecutiveErrors++;
  }
};

// ─────────────────────────────────────────────────────────
//  MAIN POLL LOOP
// ─────────────────────────────────────────────────────────
const poll = async () => {
  console.log(`\n🔄 Polling at ${new Date().toISOString()}`);

  // Pause if too many errors in a row (likely API/network issue)
  if (consecutiveErrors >= MAX_ERRORS) {
    console.warn(`⚠️  ${MAX_ERRORS} consecutive errors. Waiting 5 minutes before retrying...`);
    consecutiveErrors = 0;
    scheduleNext(5 * 60 * 1000);
    return;
  }

  try {
    // Always fetch live matches first (most important)
    const liveFixtures = await fetchLiveMatches();
    const hasLiveMatches = liveFixtures.length > 0;

    if (hasLiveMatches) {
      console.log(`⚽ ${liveFixtures.length} live match(es) found`);
    }

    // Also check today's matches to catch kick-off and full-time transitions
    const todayFixtures = await fetchTodayMatches();

    // Merge: live fixtures take priority (more up-to-date)
    const liveIds = new Set(liveFixtures.map((f) => f.fixture.id));
    const allFixtures = [
      ...liveFixtures,
      ...todayFixtures.filter((f) => !liveIds.has(f.fixture.id)),
    ];

    if (allFixtures.length === 0) {
      console.log("💤 No matches today.");
      scheduleNext(INTERVAL_IDLE);
      return;
    }

    // Push only fixtures that have actually changed
    let updatedCount = 0;
    for (const fixture of allFixtures) {
      const payload = mapFixtureToPayload(fixture);
      if (hasChanged(payload.apiMatchId, payload)) {
        await pushUpdate(payload);
        updatedCount++;
        // Small delay between pushes to avoid hammering the backend
        await sleep(300);
      }
    }

    if (updatedCount === 0) {
      console.log("💤 No changes detected.");
    }

    // Use faster interval if there are live matches
    scheduleNext(hasLiveMatches ? INTERVAL_LIVE : INTERVAL_IDLE);

  } catch (err) {
    console.error("❌ Unexpected error in poll loop:", err.message);
    consecutiveErrors++;
    scheduleNext(INTERVAL_IDLE);
  }
};

// ─── Helpers ─────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleNext = (interval) => {
  clearTimeout(pollTimer);
  console.log(`⏱  Next poll in ${interval / 1000}s`);
  pollTimer = setTimeout(poll, interval);
};

// ─────────────────────────────────────────────────────────
//  STARTUP
// ─────────────────────────────────────────────────────────
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  🌍 FIFA 2026 Pi Fetcher — Starting up");
console.log(`  Backend : ${BACKEND_URL}`);
console.log(`  League  : ${LEAGUE_ID} | Season: ${SEASON}`);
console.log(`  Interval: ${INTERVAL_LIVE / 1000}s (live) / ${INTERVAL_IDLE / 1000}s (idle)`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Run immediately on startup, then on schedule
poll();

// ─── Graceful shutdown ────────────────────────────────────
process.on("SIGINT",  () => { console.log("\n👋 Shutting down."); clearTimeout(pollTimer); process.exit(0); });
process.on("SIGTERM", () => { console.log("\n👋 Shutting down."); clearTimeout(pollTimer); process.exit(0); });
