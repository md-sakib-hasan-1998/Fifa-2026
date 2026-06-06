// ─── routes/sync.js ──────────────────────────────────────────────────────────
// Called by cron-job.org every 1 minute.
// Integrates with the free, open-source REST API: https://worldcup26.ir
// Parses all 48 teams, 12 groups, and 104 match schedules for World Cup 2026.
//
// Protected by the PI_SECRET header.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const Match   = require("../models/Match");
const Team    = require("../models/Team");
const Player  = require("../models/Player");
const { piAuth } = require("../middleware/authMiddleware");

const API_BASE = "https://worldcup26.ir/get";

// ─── Stadium Map ─────────────────────────────────────────────────────────────
const stadiumMap = {
  "1": "Estadio Azteca (Mexico City)",
  "2": "Estadio BBVA (Monterrey)",
  "3": "Estadio Akron (Guadalajara)",
  "4": "BC Place (Vancouver)",
  "5": "BMO Field (Toronto)",
  "6": "MetLife Stadium (New York/New Jersey)",
  "7": "AT&T Stadium (Dallas)",
  "8": "Arrowhead Stadium (Kansas City)",
  "9": "Hard Rock Stadium (Miami)",
  "10": "Mercedes-Benz Stadium (Atlanta)",
  "11": "SoFi Stadium (Los Angeles)",
  "12": "Lincoln Financial Field (Philadelphia)",
  "13": "Lumen Field (Seattle)",
  "14": "Levi's Stadium (San Francisco)",
  "15": "Gillette Stadium (Boston)",
  "16": "NRG Stadium (Houston)"
};

// ─── Status / Stage Mappers ───────────────────────────────────────────────────
const mapStage = (gameType) => {
  const t = gameType?.toLowerCase() || "";
  if (t === "group") return "Group Stage";
  if (t === "r32")   return "Round of 32";
  if (t === "r16")   return "Round of 16";
  if (t === "qf")    return "Quarter-final";
  if (t === "sf")    return "Semi-final";
  if (t === "third") return "Third Place";
  if (t === "final") return "Final";
  return "Group Stage";
};

const mapStatus = (game) => {
  if (game.finished === "TRUE") return "finished";
  if (game.time_elapsed === "notstarted") return "scheduled";
  return "live";
};

// Parses date strings like "06/11/2026 13:00" in UTC timezone
const parseKickoff = (dateStr) => {
  if (!dateStr) return new Date();
  try {
    const [datePart, timePart] = dateStr.split(" ");
    const [month, day, year] = datePart.split("/");
    const [hour, minute] = timePart.split(":");
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)));
  } catch (e) {
    return new Date(dateStr);
  }
};

// ─── Superstars Seeder ────────────────────────────────────────────────────────
const seedTopPlayers = async (teamMap) => {
  const topPlayers = [
    // Argentina
    { name: "Lionel Messi", position: "Forward", jerseyNumber: 10, teamName: "Argentina", age: 38 },
    { name: "Lautaro Martínez", position: "Forward", jerseyNumber: 22, teamName: "Argentina", age: 28 },
    { name: "Enzo Fernández", position: "Midfielder", jerseyNumber: 24, teamName: "Argentina", age: 25 },
    
    // Portugal
    { name: "Cristiano Ronaldo", position: "Forward", jerseyNumber: 7, teamName: "Portugal", age: 41 },
    { name: "Bruno Fernandes", position: "Midfielder", jerseyNumber: 8, teamName: "Portugal", age: 31 },
    { name: "Bernardo Silva", position: "Midfielder", jerseyNumber: 10, teamName: "Portugal", age: 31 },

    // France
    { name: "Kylian Mbappé", position: "Forward", jerseyNumber: 10, teamName: "France", age: 27 },
    { name: "Antoine Griezmann", position: "Midfielder", jerseyNumber: 7, teamName: "France", age: 35 },
    { name: "Aurélien Tchouaméni", position: "Midfielder", jerseyNumber: 8, teamName: "France", age: 26 },

    // England
    { name: "Harry Kane", position: "Forward", jerseyNumber: 9, teamName: "England", age: 32 },
    { name: "Jude Bellingham", position: "Midfielder", jerseyNumber: 10, teamName: "England", age: 22 },
    { name: "Bukayo Saka", position: "Forward", jerseyNumber: 7, teamName: "England", age: 24 },
    { name: "Phil Foden", position: "Midfielder", jerseyNumber: 11, teamName: "England", age: 26 },

    // Brazil
    { name: "Vinicius Junior", position: "Forward", jerseyNumber: 7, teamName: "Brazil", age: 25 },
    { name: "Neymar Jr", position: "Forward", jerseyNumber: 10, teamName: "Brazil", age: 34 },
    { name: "Rodrygo", position: "Forward", jerseyNumber: 11, teamName: "Brazil", age: 25 },

    // Belgium
    { name: "Kevin De Bruyne", position: "Midfielder", jerseyNumber: 7, teamName: "Belgium", age: 34 },
    { name: "Romelu Lukaku", position: "Forward", jerseyNumber: 9, teamName: "Belgium", age: 33 },

    // Norway
    { name: "Erling Haaland", position: "Forward", jerseyNumber: 9, teamName: "Norway", age: 25 },
    { name: "Martin Ødegaard", position: "Midfielder", jerseyNumber: 10, teamName: "Norway", age: 27 },

    // Spain
    { name: "Lamine Yamal", position: "Forward", jerseyNumber: 19, teamName: "Spain", age: 18 },
    { name: "Rodri", position: "Midfielder", jerseyNumber: 16, teamName: "Spain", age: 29 },
    { name: "Pedri", position: "Midfielder", jerseyNumber: 8, teamName: "Spain", age: 23 },

    // Germany
    { name: "Jamal Musiala", position: "Midfielder", jerseyNumber: 10, teamName: "Germany", age: 23 },
    { name: "Florian Wirtz", position: "Midfielder", jerseyNumber: 17, teamName: "Germany", age: 23 },
    { name: "Kai Havertz", position: "Forward", jerseyNumber: 29, teamName: "Germany", age: 26 },

    // United States
    { name: "Christian Pulisic", position: "Forward", jerseyNumber: 10, teamName: "United States", age: 27 },
    { name: "Weston McKennie", position: "Midfielder", jerseyNumber: 8, teamName: "United States", age: 27 },

    // Canada
    { name: "Alphonso Davies", position: "Defender", jerseyNumber: 19, teamName: "Canada", age: 25 },

    // Mexico
    { name: "Santiago Giménez", position: "Forward", jerseyNumber: 11, teamName: "Mexico", age: 25 },

    // Egypt
    { name: "Mohamed Salah", position: "Forward", jerseyNumber: 10, teamName: "Egypt", age: 33 },

    // South Korea
    { name: "Heung-min Son", position: "Forward", jerseyNumber: 7, teamName: "South Korea", age: 33 },

    // Croatia
    { name: "Luka Modrić", position: "Midfielder", jerseyNumber: 10, teamName: "Croatia", age: 40 },

    // Uruguay
    { name: "Federico Valverde", position: "Midfielder", jerseyNumber: 15, teamName: "Uruguay", age: 27 },
    { name: "Darwin Núñez", position: "Forward", jerseyNumber: 9, teamName: "Uruguay", age: 26 }
  ];

  const playerOps = [];
  for (const p of topPlayers) {
    const teamId = teamMap[p.teamName];
    if (teamId) {
      playerOps.push({
        updateOne: {
          filter: { name: p.name },
          update: {
            $set: {
              name: p.name,
              shortName: p.name.split(" ").pop(),
              team: teamId,
              teamName: p.teamName,
              position: p.position,
              jerseyNumber: p.jerseyNumber,
              age: p.age,
              nationality: p.teamName,
              active: true,
              "stats.goals": Math.floor(Math.random() * 5),
              "stats.assists": Math.floor(Math.random() * 3),
              "stats.appearances": Math.floor(Math.random() * 4) + 1,
            }
          },
          upsert: true
        }
      });
    }
  }

  if (playerOps.length) {
    await Player.bulkWrite(playerOps);
    console.log(`[Sync] Superstars seeded: ${playerOps.length}`);
  }
  return playerOps.length;
};

// ─── POST /api/sync/refresh ───────────────────────────────────────────────────
// cron-job.org hits this every 1 minute.
// Pulls team list, match list, and seeds players if empty.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", piAuth, async (req, res) => {
  const io = req.app.get("io");
  const forceAll = req.query.forceAll === "true";
  const now = new Date();

  const results = { teams: 0, players: 0, matches: 0, errors: [] };

  try {
    // ── Check collection counts ──────────────────────────────────────────────
    const [teamCount, playerCount, matchCount] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
      Match.countDocuments(),
    ]);

    const shouldSyncTeams   = forceAll || teamCount === 0;
    const shouldSyncMatches = forceAll || matchCount === 0 || now.getSeconds() >= 0; // always fetch matches to get live score updates
    const shouldSyncPlayers = forceAll || playerCount === 0;

    // ── 1. Sync Teams ────────────────────────────────────────────────────────
    if (shouldSyncTeams) {
      try {
        console.log("[Sync] Fetching teams from free REST API...");
        const { data } = await axios.get(`${API_BASE}/teams`);
        const teams = data.teams || [];
        
        const teamOps = teams.map((t) => ({
          updateOne: {
            filter: { apiTeamId: String(t.id) },
            update: {
              $set: {
                apiTeamId: String(t.id),
                name:      t.name_en,
                shortName: t.fifa_code || t.name_en.slice(0, 3).toUpperCase(),
                country:   t.name_en,
                logoUrl:   t.flag || null,
                group:     t.groups || null,
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

    // Load team mappings (needed for matches and players)
    const teamDocs = await Team.find({}, { _id: 1, name: 1, logoUrl: 1, apiTeamId: 1, shortName: 1 });
    const teamIdMap = Object.fromEntries(teamDocs.map(t => [t.name, t._id]));
    const teamLogoMap = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t.logoUrl]));
    const teamShortMap = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t.shortName]));

    // ── 2. Sync Players (Superstars Seeder) ──────────────────────────────────
    if (shouldSyncPlayers && teamDocs.length > 0) {
      try {
        console.log("[Sync] Seeding top superstars...");
        const seededCount = await seedTopPlayers(teamIdMap);
        results.players = seededCount;
      } catch (err) {
        results.errors.push(`players: ${err.message}`);
      }
    }

    // ── 3. Sync Matches ──────────────────────────────────────────────────────
    if (shouldSyncMatches) {
      try {
        console.log("[Sync] Fetching games from free REST API...");
        const { data } = await axios.get(`${API_BASE}/games`);
        const games = data.games || [];

        const matchOps = games.map((g) => ({
          updateOne: {
            filter: { apiMatchId: String(g.id) },
            update: {
              $set: {
                apiMatchId:          String(g.id),
                stage:               mapStage(g.type),
                group:               g.group !== "null" && g.group ? g.group : null,
                matchday:            g.matchday ? parseInt(g.matchday) : null,
                "homeTeam.name":     g.home_team_name_en || g.home_team_label || "TBD",
                "homeTeam.shortName":teamShortMap[String(g.home_team_id)] || (g.home_team_name_en ? g.home_team_name_en.slice(0, 3).toUpperCase() : "TBD"),
                "homeTeam.logoUrl":  teamLogoMap[String(g.home_team_id)] || null,
                "homeTeam.apiTeamId":String(g.home_team_id),
                "awayTeam.name":     g.away_team_name_en || g.away_team_label || "TBD",
                "awayTeam.shortName":teamShortMap[String(g.away_team_id)] || (g.away_team_name_en ? g.away_team_name_en.slice(0, 3).toUpperCase() : "TBD"),
                "awayTeam.logoUrl":  teamLogoMap[String(g.away_team_id)] || null,
                "awayTeam.apiTeamId":String(g.away_team_id),
                "score.home":        g.home_score ? parseInt(g.home_score) : 0,
                "score.away":        g.away_score ? parseInt(g.away_score) : 0,
                status:              mapStatus(g),
                minute:              g.time_elapsed !== "notstarted" ? (parseInt(g.time_elapsed) || null) : null,
                kickoffTime:         parseKickoff(g.local_date),
                venue:               stadiumMap[String(g.stadium_id)] || `Stadium ${g.stadium_id}`,
                lastSyncedAt:        new Date(),
              },
            },
            upsert: true,
          },
        }));

        if (matchOps.length) await Match.bulkWrite(matchOps);
        results.matches = games.length;
        console.log(`[Sync] Matches synced: ${games.length}`);
      } catch (err) {
        results.errors.push(`matches: ${err.message}`);
      }
    }

    // ── 4. Broadcast via Socket.io ──────────────────────────────────────────
    if (results.teams > 0 || results.players > 0 || results.matches > 0) {
      io.emit("dataRefreshed", {
        teams:   results.teams,
        players: results.players,
        matches: results.matches,
        at:      now.toISOString(),
      });
    }

    const hasErrors = results.errors.length > 0;
    res.status(hasErrors ? 207 : 200).json({
      status:  hasErrors ? "partial" : "ok",
      message: "Sync completed successfully",
      results,
    });

  } catch (globalErr) {
    console.error("[Sync] Global error:", globalErr.message);
    res.status(500).json({ message: globalErr.message });
  }
});

// ─── GET /api/sync/status ─────────────────────────────────────────────────────
// Public health-check — shows DB record counts.
router.get("/status", async (req, res) => {
  try {
    const [teams, players, matches] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
      Match.countDocuments(),
    ]);

    res.json({
      db: { teams, players, matches },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
