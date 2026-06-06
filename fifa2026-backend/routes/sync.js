// ─── routes/sync.js ──────────────────────────────────────────────────────────
// Called by cron-job.org every 1 minute.
// Smart scheduling: reads today's match schedule from MongoDB, then decides
// whether to actually call the external API or skip, based on:
//   • Is there an active / upcoming match right now?
//   • How many matches are today? (decides how often to refresh)
//   • Is today a match-free day? (space evenly through the day)
//   • Is it a break between two matches today? (wait 1-2 hours)
//
// Protected by the PI_SECRET header so no one can spam it from outside.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const Match   = require("../models/Match");
const Team    = require("../models/Team");
const Player  = require("../models/Player");
const { piAuth } = require("../middleware/authMiddleware");

// ─── API Key Rotation ─────────────────────────────────────────────────────────
// Set SPORTS_API_KEY in your Render env vars as a comma-separated list:
//   e.g.  key1,key2,key3
// The server picks a different key each minute automatically.
const getApiKey = () => {
  const envVal = process.env.SPORTS_API_KEY || "";
  const keys   = envVal.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    console.warn("[Sync] SPORTS_API_KEY is not set!");
    return "";
  }
  const index = Math.floor(Date.now() / 60000) % keys.length;
  console.log(`[Sync] Key rotation: slot ${index + 1}/${keys.length}`);
  return keys[index];
};

const API_BASE    = () => process.env.SPORTS_API_BASE || "https://v3.football.api-sports.io";
const apiHeaders  = () => ({
  "x-apisports-key": getApiKey(),
  "x-rapidapi-host": "v3.football.api-sports.io",
});

// ─── Status / Stage Mappers ───────────────────────────────────────────────────
const mapStatus = (shortCode) => {
  if (["1H","2H","ET","BT","P","LIVE"].includes(shortCode)) return "live";
  if (["HT"].includes(shortCode))                           return "halftime";
  if (["FT","AET","PEN"].includes(shortCode))               return "finished";
  if (["PST","CANC","ABD","AWD","WO","SUSP","INT","TBD"].includes(shortCode)) return "postponed";
  return "scheduled";
};

const mapStage = (round = "") => {
  const r = round.toLowerCase();
  if (r.includes("group"))                      return "Group Stage";
  if (r.includes("32"))                         return "Round of 32";
  if (r.includes("16"))                         return "Round of 16";
  if (r.includes("quarter"))                    return "Quarter-final";
  if (r.includes("semi"))                       return "Semi-final";
  if (r.includes("third") || r.includes("place")) return "Third Place";
  if (r.includes("final"))                      return "Final";
  return "Group Stage";
};

// ─── Smart Schedule Calculator ────────────────────────────────────────────────
// Given today's matches (sorted by kickoffTime), calculates:
//   shouldFetch  → true/false — should we actually call the API right now?
//   reason       → human-readable reason for logging
//   minInterval  → minimum minutes between syncs for today (for logging only)
//
// Rules:
//  1. If any match is currently LIVE or HALFTIME → always fetch.
//  2. If a match starts within the next 15 minutes → always fetch (pre-match).
//  3. If we are in a BREAK between two matches (next match > 15 min away, prev match
//     ended < 2 hours ago) → fetch every 2 hours (check lastSyncedAt).
//  4. Match-Free Day → spread the 300 daily requests evenly (100 per key × 3 keys).
//     Calculate: minutesBetweenSyncs = (24 × 60) / safeRequestsPerDay.
//  5. If matches exist today but none is active/upcoming and there is no break
//     (all done) → sync once every 6 hours just for safety.
const calculateShouldFetch = async (now, lastSyncedAt) => {
  // ── Start of "today" in UTC ─────────────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // ── Load today's matches from DB ────────────────────────────────────────────
  const todayMatches = await Match.find({
    kickoffTime: { $gte: todayStart, $lt: todayEnd },
    status:      { $ne: "postponed" },
  }).sort({ kickoffTime: 1 });

  const totalToday = todayMatches.length;

  // ── Calculate safe minimum interval based on match count and API keys ────────
  // Dynamically determine total usable requests per day (90 requests per key to leave buffer)
  const envVal = process.env.SPORTS_API_KEY || "";
  const keys = envVal.split(",").map(k => k.trim()).filter(Boolean);
  const keysCount = Math.max(1, keys.length);
  const USABLE_REQUESTS = keysCount * 90;

  const MINUTES_PER_MATCH = 110; // 90 min play + 10 extra time buffer + 10 pre-match
  const totalLiveMinutes = totalToday * MINUTES_PER_MATCH;
  
  // safeInterval: how many minutes to wait between fetches during live time
  const safeIntervalMins = totalToday === 0
    ? 360 // no matches today → every 6 hours
    : Math.max(1, Math.ceil(totalLiveMinutes / USABLE_REQUESTS));

  // ── Check for currently active/upcoming matches ─────────────────────────────
  // A match is active if it is live/halftime, or scheduled and kickoff is between
  // now - 3 hours and now + 15 minutes.
  const activeMatches = todayMatches.filter(m => {
    if (m.status === "live" || m.status === "halftime") return true;
    if (m.status === "scheduled") {
      const minKickoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const maxKickoff = new Date(now.getTime() + 15 * 60 * 1000);
      return m.kickoffTime >= minKickoff && m.kickoffTime <= maxKickoff;
    }
    return false;
  });

  if (activeMatches.length > 0) {
    return {
      shouldFetch: shouldThrottle(lastSyncedAt, safeIntervalMins, now),
      reason: `${activeMatches.length} active match(es) detected. Interval: ${safeIntervalMins} min.`,
      safeIntervalMins
    };
  }

  // ── Check if we are in a break between matches (post-match, pre-next) ───────
  // "Break" = last finished match ended < 2 hours ago AND next match is in the future
  const twoHoursAgo   = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const recentlyEnded = todayMatches.find(
    m => (m.status === "finished") && m.lastSyncedAt && m.lastSyncedAt >= twoHoursAgo
  );
  const nextUpcoming  = todayMatches.find(
    m => m.status === "scheduled" && m.kickoffTime > now
  );
  if (recentlyEnded && nextUpcoming) {
    // We are in a break — sync every 2 hours
    return { shouldFetch: shouldThrottle(lastSyncedAt, 120, now),
             reason: `Break between matches. Syncing every 2 hours.`,
             safeIntervalMins: 120 };
  }

  // ── Match-Free Day or all matches done for today ────────────────────────────
  if (totalToday === 0) {
    // No matches today at all — spread requests evenly over 24 hours
    const freeIntervalMins = Math.ceil((24 * 60) / USABLE_REQUESTS);
    return { shouldFetch: shouldThrottle(lastSyncedAt, freeIntervalMins, now),
             reason: `Match-free day. Syncing every ${freeIntervalMins} min.`,
             safeIntervalMins: freeIntervalMins };
  }

  // All today's matches are finished or no upcoming → sync every 6 hours
  return { shouldFetch: shouldThrottle(lastSyncedAt, 360, now),
           reason: `All today's matches done. Syncing every 6 hours.`,
           safeIntervalMins: 360 };
};

// Helper: returns true only if enough time has passed since lastSyncedAt
const shouldThrottle = (lastSyncedAt, intervalMins, now) => {
  if (!lastSyncedAt) return true; // never synced → go ahead
  const elapsed = (now.getTime() - lastSyncedAt.getTime()) / (1000 * 60);
  return elapsed >= intervalMins;
};

// ─── POST /api/sync/refresh ───────────────────────────────────────────────────
// cron-job.org hits this every 1 minute with the header:
//   x-pi-secret: <PI_SECRET>
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", piAuth, async (req, res) => {
  const io = req.app.get("io");

  const LEAGUE_ID = process.env.SPORTS_LEAGUE_ID || "1";
  const SEASON    = process.env.SPORTS_SEASON    || "2026";
  const forceAll  = req.query.forceAll === "true";
  const now       = new Date();

  const results = { teams: 0, players: 0, matches: 0, errors: [], skipped: false };

  // ── Check static collection counts ─────────────────────────────────────────
  const [teamCount, playerCount, matchCount] = await Promise.all([
    Team.countDocuments(),
    Player.countDocuments(),
    Match.countDocuments(),
  ]);

  const shouldSyncTeams   = forceAll || teamCount   === 0;
  const shouldSyncPlayers = forceAll || playerCount === 0;

  // ── Smart match scheduling decision ────────────────────────────────────────
  let shouldSyncMatches = forceAll || matchCount === 0;
  let scheduleReason    = "forceAll or empty DB";

  if (!shouldSyncMatches) {
    const latestSynced = await Match.findOne({}, { lastSyncedAt: 1 })
                                    .sort({ lastSyncedAt: -1 });
    const lastSyncedAt = latestSynced?.lastSyncedAt || null;

    const { shouldFetch, reason, safeIntervalMins } =
      await calculateShouldFetch(now, lastSyncedAt);

    shouldSyncMatches = shouldFetch;
    scheduleReason    = reason;
    console.log(`[Sync] Schedule decision: ${shouldFetch ? "✅ FETCH" : "⏭ SKIP"} — ${reason}`);
  }

  // ── Skip entirely if nothing to do ─────────────────────────────────────────
  if (!shouldSyncTeams && !shouldSyncPlayers && !shouldSyncMatches) {
    results.skipped = true;
    return res.status(200).json({
      status:  "skipped",
      message: scheduleReason,
      results,
    });
  }

  // ── 1. Sync Teams (only when empty or forceAll) ─────────────────────────────
  if (shouldSyncTeams) {
    try {
      const { data } = await axios.get(`${API_BASE()}/teams`, {
        headers: apiHeaders(),
        params:  { league: LEAGUE_ID, season: SEASON },
      });
      const teams = data.response || [];
      const teamOps = teams.map(({ team }) => ({
        updateOne: {
          filter: { apiTeamId: String(team.id) },
          update: {
            $set: {
              apiTeamId: String(team.id),
              name:      team.name,
              shortName: team.code || team.name.slice(0, 3).toUpperCase(),
              country:   team.country || team.name,
              logoUrl:   team.logo || null,
            },
            $setOnInsert: {
              starRating: 3,
              stats: { played: 0, won: 0, drawn: 0, lost: 0,
                       goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
            },
          },
          upsert: true,
        },
      }));
      if (teamOps.length) await Team.bulkWrite(teamOps);
      results.teams = teams.length;
      console.log(`[Sync] Teams synced: ${teams.length}`);
    } catch (err) {
      results.errors.push(`teams: ${err.message}`);
    }
  }

  // ── 2. Sync Players (only when empty or forceAll) ───────────────────────────
  if (shouldSyncPlayers) {
    try {
      const MAX_PAGES = 5;
      let allPlayers  = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data } = await axios.get(`${API_BASE()}/players`, {
          headers: apiHeaders(),
          params:  { league: LEAGUE_ID, season: SEASON, page },
        });
        const batch = data.response || [];
        allPlayers  = allPlayers.concat(batch);
        if (batch.length < 20) break;
      }

      const teamDocs = await Team.find({}, { _id: 1, apiTeamId: 1 });
      const teamMap  = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t._id]));
      const posMap   = { Goalkeeper: "Goalkeeper", Defender: "Defender",
                         Midfielder: "Midfielder", Attacker: "Forward" };

      const playerOps = allPlayers
        .filter(({ statistics }) => {
          const stat = statistics?.[0];
          return stat && teamMap[String(stat?.team?.id)];
        })
        .map(({ player, statistics }) => {
          const stat   = statistics[0];
          const teamId = teamMap[String(stat.team.id)];
          return {
            updateOne: {
              filter: { apiPlayerId: String(player.id) },
              update: {
                $set: {
                  apiPlayerId:  String(player.id),
                  name:         player.name,
                  shortName:    player.firstname || player.name,
                  team:         teamId,
                  teamName:     stat.team.name,
                  photoUrl:     player.photo      || null,
                  nationality:  player.nationality || null,
                  age:          player.age         || null,
                  position:     posMap[player.position] || "Midfielder",
                  jerseyNumber: player.number      || null,
                  "stats.goals":         stat.goals?.total      || 0,
                  "stats.assists":       stat.goals?.assists     || 0,
                  "stats.appearances":   stat.games?.appearences || 0,
                  "stats.minutesPlayed": stat.games?.minutes     || 0,
                  "stats.yellowCards":   stat.cards?.yellow      || 0,
                  "stats.redCards":      stat.cards?.red         || 0,
                  "stats.shotsOnTarget": stat.shots?.on          || 0,
                  "stats.passAccuracy":  stat.passes?.accuracy   || null,
                },
              },
              upsert: true,
            },
          };
        });

      if (playerOps.length) await Player.bulkWrite(playerOps);
      results.players = playerOps.length;
      console.log(`[Sync] Players synced: ${playerOps.length}`);
    } catch (err) {
      results.errors.push(`players: ${err.message}`);
    }
  }

  // ── 3. Sync Matches / Fixtures ──────────────────────────────────────────────
  if (shouldSyncMatches) {
    try {
      const { data } = await axios.get(`${API_BASE()}/fixtures`, {
        headers: apiHeaders(),
        params:  { league: LEAGUE_ID, season: SEASON },
      });
      const fixtures = data.response || [];

      const matchOps = fixtures.map(({ fixture, league, teams, goals }) => ({
        updateOne: {
          filter: { apiMatchId: String(fixture.id) },
          update: {
            $set: {
              apiMatchId:          String(fixture.id),
              stage:               mapStage(league.round),
              "homeTeam.name":     teams.home.name,
              "homeTeam.shortName":teams.home.name.slice(0, 3).toUpperCase(),
              "homeTeam.logoUrl":  teams.home.logo,
              "homeTeam.apiTeamId":String(teams.home.id),
              "awayTeam.name":     teams.away.name,
              "awayTeam.shortName":teams.away.name.slice(0, 3).toUpperCase(),
              "awayTeam.logoUrl":  teams.away.logo,
              "awayTeam.apiTeamId":String(teams.away.id),
              "score.home":  goals?.home ?? 0,
              "score.away":  goals?.away ?? 0,
              status:        mapStatus(fixture.status?.short),
              minute:        fixture.status?.elapsed || null,
              kickoffTime:   new Date(fixture.date),
              venue:         fixture.venue?.name || null,
              city:          fixture.venue?.city || null,
              lastSyncedAt:  new Date(),
            },
          },
          upsert: true,
        },
      }));

      if (matchOps.length) await Match.bulkWrite(matchOps);
      results.matches = fixtures.length;
      console.log(`[Sync] Fixtures synced: ${fixtures.length}`);
    } catch (err) {
      results.errors.push(`matches: ${err.message}`);
    }
  }

  // ── 4. Broadcast via Socket.io ──────────────────────────────────────────────
  if (results.teams > 0 || results.players > 0 || results.matches > 0) {
    io.emit("dataRefreshed", {
      teams:   results.teams,
      players: results.players,
      matches: results.matches,
      at:      now.toISOString(),
    });
  }

  const hasErrors = results.errors.length > 0;
  console.log(`🔄 Sync done — teams:${results.teams} players:${results.players} matches:${results.matches}${hasErrors ? " | errors: " + results.errors.join(", ") : ""}`);

  res.status(hasErrors ? 207 : 200).json({
    status:  hasErrors ? "partial" : "ok",
    message: scheduleReason,
    results,
  });
});

// ─── GET /api/sync/status ─────────────────────────────────────────────────────
// Public health-check — shows DB record counts + today's match schedule.
router.get("/status", async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [teams, players, matches, todayMatches] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
      Match.countDocuments(),
      Match.find({ kickoffTime: { $gte: todayStart, $lt: todayEnd } })
           .select("homeTeam.name awayTeam.name kickoffTime status")
           .sort({ kickoffTime: 1 }),
    ]);

    res.json({
      db:    { teams, players, matches },
      today: { count: todayMatches.length, matches: todayMatches },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
