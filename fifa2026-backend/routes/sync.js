// ─── routes/sync.js ──────────────────────────────────────────────────────────
// This endpoint is called by the Render Scheduled Job (cron) every 5 minutes.
// It pulls fresh data from API-Football, saves it to MongoDB, then broadcasts
// a "dataRefreshed" Socket.io event so every connected browser updates instantly.
//
// Protected by the same PI_SECRET used by the Raspberry Pi route, so no one
// can spam it from outside.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const Match   = require("../models/Match");
const Team    = require("../models/Team");
const Player  = require("../models/Player");
const { piAuth } = require("../middleware/authMiddleware");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_KEY  = () => process.env.SPORTS_API_KEY;
const API_BASE = () => process.env.SPORTS_API_BASE || "https://v3.football.api-sports.io";

const apiHeaders = () => ({
  "x-apisports-key": API_KEY(),
  "x-rapidapi-host": "v3.football.api-sports.io",
});

// Maps API-Football fixture status codes → our schema enum
const mapStatus = (shortCode) => {
  const live       = ["1H", "2H", "ET", "BT", "P", "LIVE"];
  const halftime   = ["HT"];
  const finished   = ["FT", "AET", "PEN"];
  const postponed  = ["PST", "CANC", "ABD", "AWD", "WO", "SUSP", "INT", "TBD"];
  if (live.includes(shortCode))      return "live";
  if (halftime.includes(shortCode))  return "halftime";
  if (finished.includes(shortCode))  return "finished";
  if (postponed.includes(shortCode)) return "postponed";
  return "scheduled";
};

// Maps API-Football round string → our stage enum (best-effort)
const mapStage = (round = "") => {
  const r = round.toLowerCase();
  if (r.includes("group"))           return "Group Stage";
  if (r.includes("32"))              return "Round of 32";
  if (r.includes("16"))              return "Round of 16";
  if (r.includes("quarter"))         return "Quarter-final";
  if (r.includes("semi"))            return "Semi-final";
  if (r.includes("third") || r.includes("place")) return "Third Place";
  if (r.includes("final"))           return "Final";
  return "Group Stage"; // safe default
};

// ─── POST /api/sync/refresh ───────────────────────────────────────────────────
// The Render cron job runs this command every 5 minutes:
//   curl -X POST https://<backend-url>/api/sync/refresh \
//        -H "x-pi-secret: <PI_SECRET>"
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", piAuth, async (req, res) => {
  const io = req.app.get("io");

  // ── Configuration ─────────────────────────────────────────────────────────
  // FIFA World Cup 2026 league ID on API-Football.
  // WC 2026 = ID 1 (FIFA World Cup). Season = 2026.
  const LEAGUE_ID = process.env.SPORTS_LEAGUE_ID || "1";
  const SEASON    = process.env.SPORTS_SEASON    || "2026";

  const results = { teams: 0, players: 0, matches: 0, errors: [] };

  // ── 1. Sync Teams ──────────────────────────────────────────────────────────
  try {
    const { data } = await axios.get(`${API_BASE()}/teams`, {
      headers: apiHeaders(),
      params:  { league: LEAGUE_ID, season: SEASON },
    });

    const teams = data.response || [];

    const teamOps = teams.map(({ team, venue }) => ({
      updateOne: {
        filter: { apiTeamId: String(team.id) },
        update: {
          $set: {
            apiTeamId: String(team.id),
            name:      team.name,
            shortName: team.code || team.name.slice(0, 3).toUpperCase(),
            country:   team.country || team.name,
            logoUrl:   team.logo  || null,
          },
          $setOnInsert: {
            // Only set defaults when first creating the document
            starRating: 3,
            stats:      { played: 0, won: 0, drawn: 0, lost: 0,
                          goalsFor: 0, goalsAgainst: 0,
                          goalDifference: 0, points: 0 },
          },
        },
        upsert: true,
      },
    }));

    if (teamOps.length) await Team.bulkWrite(teamOps);
    results.teams = teams.length;
  } catch (err) {
    results.errors.push(`teams: ${err.message}`);
  }

  // ── 2. Sync Players ────────────────────────────────────────────────────────
  try {
    // API-Football paginates players (page param, ~20 per page).
    // We fetch the first 3 pages which covers ~60 players – enough for squads.
    const MAX_PAGES = 5;
    let allPlayers  = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await axios.get(`${API_BASE()}/players`, {
        headers: apiHeaders(),
        params:  { league: LEAGUE_ID, season: SEASON, page },
      });
      const batch = data.response || [];
      allPlayers = allPlayers.concat(batch);
      if (batch.length < 20) break; // last page
    }

    // Build a mapping from apiTeamId → Mongo _id
    const teamDocs = await Team.find({}, { _id: 1, apiTeamId: 1 });
    const teamMap  = Object.fromEntries(teamDocs.map((t) => [t.apiTeamId, t._id]));

    const positionMap = {
      Goalkeeper: "Goalkeeper",
      Defender:   "Defender",
      Midfielder: "Midfielder",
      Attacker:   "Forward",
    };

    const playerOps = allPlayers
      .filter(({ player, statistics }) => {
        const stat = statistics?.[0];
        return stat && teamMap[String(stat?.team?.id)];
      })
      .map(({ player, statistics }) => {
        const stat    = statistics[0];
        const teamId  = teamMap[String(stat.team.id)];
        const pos     = positionMap[player.position] || "Midfielder";

        return {
          updateOne: {
            filter: { apiPlayerId: String(player.id) },
            update: {
              $set: {
                apiPlayerId: String(player.id),
                name:        player.name,
                shortName:   player.firstname || player.name,
                team:        teamId,
                teamName:    stat.team.name,
                photoUrl:    player.photo  || null,
                nationality: player.nationality || null,
                age:         player.age   || null,
                position:    pos,
                jerseyNumber: player.number || null,
                "stats.goals":         stat.goals?.total   || 0,
                "stats.assists":       stat.goals?.assists || 0,
                "stats.appearances":   stat.games?.appearences || 0,
                "stats.minutesPlayed": stat.games?.minutes || 0,
                "stats.yellowCards":   stat.cards?.yellow || 0,
                "stats.redCards":      stat.cards?.red    || 0,
                "stats.shotsOnTarget": stat.shots?.on     || 0,
                "stats.passAccuracy":  stat.passes?.accuracy || null,
              },
            },
            upsert: true,
          },
        };
      });

    if (playerOps.length) await Player.bulkWrite(playerOps);
    results.players = playerOps.length;
  } catch (err) {
    results.errors.push(`players: ${err.message}`);
  }

  // ── 3. Sync Matches (Fixtures) ─────────────────────────────────────────────
  try {
    const { data } = await axios.get(`${API_BASE()}/fixtures`, {
      headers: apiHeaders(),
      params:  { league: LEAGUE_ID, season: SEASON },
    });

    const fixtures = data.response || [];

    const matchOps = fixtures.map(({ fixture, league, teams, score, goals }) => {
      const status  = mapStatus(fixture.status?.short);
      const stage   = mapStage(league.round);

      return {
        updateOne: {
          filter: { apiMatchId: String(fixture.id) },
          update: {
            $set: {
              apiMatchId:  String(fixture.id),
              stage,
              "homeTeam.name":      teams.home.name,
              "homeTeam.shortName": teams.home.name.slice(0, 3).toUpperCase(),
              "homeTeam.logoUrl":   teams.home.logo,
              "homeTeam.apiTeamId": String(teams.home.id),
              "awayTeam.name":      teams.away.name,
              "awayTeam.shortName": teams.away.name.slice(0, 3).toUpperCase(),
              "awayTeam.logoUrl":   teams.away.logo,
              "awayTeam.apiTeamId": String(teams.away.id),
              "score.home": goals?.home ?? 0,
              "score.away": goals?.away ?? 0,
              status,
              minute:       fixture.status?.elapsed || null,
              kickoffTime:  new Date(fixture.date),
              venue:        fixture.venue?.name || null,
              city:         fixture.venue?.city || null,
              lastSyncedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (matchOps.length) await Match.bulkWrite(matchOps);
    results.matches = fixtures.length;
  } catch (err) {
    results.errors.push(`matches: ${err.message}`);
  }

  // ── 4. Broadcast via Socket.io ─────────────────────────────────────────────
  // Every connected browser will receive this event and re-fetch its data.
  io.emit("dataRefreshed", {
    teams:   results.teams,
    players: results.players,
    matches: results.matches,
    at:      new Date().toISOString(),
  });

  const hasErrors = results.errors.length > 0;
  console.log(`🔄 Sync done — teams:${results.teams} players:${results.players} matches:${results.matches}${hasErrors ? " | errors: " + results.errors.join(", ") : ""}`);

  res.status(hasErrors ? 207 : 200).json({
    status:  hasErrors ? "partial" : "ok",
    message: "Data synced and broadcast via Socket.io",
    results,
  });
});

// ─── GET /api/sync/status ─────────────────────────────────────────────────────
// Public health-check – shows how many records are in each collection.
router.get("/status", async (req, res) => {
  try {
    const [teams, players, matches] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
      Match.countDocuments(),
    ]);
    res.json({ teams, players, matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
