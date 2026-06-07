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

// ─── FIFA World Rankings (April 2026 update) ─────────────────────────────────
// Used to auto-assign star ratings to teams.
const FIFA_RANKINGS = {
  "France": 1, "Spain": 2, "Argentina": 3, "England": 4, "Portugal": 5,
  "Brazil": 6, "Netherlands": 7, "Morocco": 8, "Belgium": 9, "Germany": 10,
  "Croatia": 11, "Italy": 12, "Colombia": 13, "Senegal": 14, "Mexico": 15,
  "United States": 16, "Uruguay": 17, "Japan": 18, "Switzerland": 19,
  "Denmark": 20, "Iran": 21, "Austria": 23, "South Korea": 24,
  "Australia": 25, "Algeria": 27, "Norway": 29, "Sweden": 30,
  "Ecuador": 44, "Scotland": 32, "Turkey": 31, "Egypt": 34, "Chile": 35,
  "Saudi Arabia": 56, "Tunisia": 38, "Ivory Coast": 49, "Nigeria": 42,
  "Qatar": 55, "New Zealand": 82, "Cape Verde": 73, "Ghana": 60,
  "Paraguay": 52, "Jordan": 66, "Iraq": 63, "Haiti": 85,
  "Democratic Republic of the Congo": 67, "South Africa": 64,
  "Bosnia and Herzegovina": 58, "Czech Republic": 37,
  "Canada": 44, "Panama": 80, "Jamaica": 55,
  "Uzbekistan": 72, "Curaçao": 74,
};

// Convert FIFA ranking to star rating (1-5 stars)
const rankToStars = (rank) => {
  if (!rank) return 2;
  if (rank <= 10) return 5;
  if (rank <= 20) return 4.5;
  if (rank <= 30) return 4;
  if (rank <= 50) return 3;
  if (rank <= 70) return 2;
  return 1;
};

// ─── Superstars Seeder ────────────────────────────────────────────────────────
const seedTopPlayers = async (teamMap) => {
  // ~80 world-class players covering all major teams
  // photoUrl: TheSportsDB player thumbnail (free CDN, no API key)
  const topPlayers = [
    // Argentina
    { name: "Lionel Messi",       position: "Forward",    jerseyNumber: 10, teamName: "Argentina",     age: 38, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/yb7hm91511300982.jpg" },
    { name: "Lautaro Martínez",   position: "Forward",    jerseyNumber: 22, teamName: "Argentina",     age: 28, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/d2ggp61587308940.jpg" },
    { name: "Enzo Fernández",     position: "Midfielder", jerseyNumber: 24, teamName: "Argentina",     age: 25, photoUrl: null },
    // France
    { name: "Kylian Mbappé",      position: "Forward",    jerseyNumber: 10, teamName: "France",        age: 27, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/ryqwyp1519482602.jpg" },
    { name: "Antoine Griezmann",  position: "Midfielder", jerseyNumber: 7,  teamName: "France",        age: 35, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/rqr1zt1519733611.jpg" },
    { name: "Aurélien Tchouaméni",position: "Midfielder", jerseyNumber: 8,  teamName: "France",        age: 26, photoUrl: null },
    { name: "Ousmane Dembélé",    position: "Forward",    jerseyNumber: 11, teamName: "France",        age: 28, photoUrl: null },
    // Spain
    { name: "Lamine Yamal",       position: "Forward",    jerseyNumber: 19, teamName: "Spain",         age: 18, photoUrl: null },
    { name: "Rodri",              position: "Midfielder", jerseyNumber: 16, teamName: "Spain",         age: 29, photoUrl: null },
    { name: "Pedri",              position: "Midfielder", jerseyNumber: 8,  teamName: "Spain",         age: 23, photoUrl: null },
    { name: "Álvaro Morata",      position: "Forward",    jerseyNumber: 7,  teamName: "Spain",         age: 32, photoUrl: null },
    // England
    { name: "Harry Kane",         position: "Forward",    jerseyNumber: 9,  teamName: "England",       age: 32, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/4kgep01519741528.jpg" },
    { name: "Jude Bellingham",    position: "Midfielder", jerseyNumber: 10, teamName: "England",       age: 22, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/8l0bxb1671441200.jpg" },
    { name: "Bukayo Saka",        position: "Forward",    jerseyNumber: 7,  teamName: "England",       age: 24, photoUrl: null },
    { name: "Phil Foden",         position: "Midfielder", jerseyNumber: 11, teamName: "England",       age: 26, photoUrl: null },
    // Portugal
    { name: "Cristiano Ronaldo",  position: "Forward",    jerseyNumber: 7,  teamName: "Portugal",      age: 41, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/pucpit1519741414.jpg" },
    { name: "Bruno Fernandes",    position: "Midfielder", jerseyNumber: 8,  teamName: "Portugal",      age: 31, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/gk0l2x1588603370.jpg" },
    { name: "Bernardo Silva",     position: "Midfielder", jerseyNumber: 10, teamName: "Portugal",      age: 31, photoUrl: null },
    { name: "Rafael Leão",        position: "Forward",    jerseyNumber: 17, teamName: "Portugal",      age: 26, photoUrl: null },
    // Brazil
    { name: "Vinicius Junior",    position: "Forward",    jerseyNumber: 7,  teamName: "Brazil",        age: 25, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/v6yqjn1591887803.jpg" },
    { name: "Rodrygo",            position: "Forward",    jerseyNumber: 11, teamName: "Brazil",        age: 25, photoUrl: null },
    { name: "Endrick",            position: "Forward",    jerseyNumber: 9,  teamName: "Brazil",        age: 19, photoUrl: null },
    { name: "Lucas Paquetá",      position: "Midfielder", jerseyNumber: 10, teamName: "Brazil",        age: 28, photoUrl: null },
    // Netherlands
    { name: "Virgil van Dijk",    position: "Defender",   jerseyNumber: 4,  teamName: "Netherlands",   age: 34, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/dnrjmg1519742207.jpg" },
    { name: "Cody Gakpo",         position: "Forward",    jerseyNumber: 11, teamName: "Netherlands",   age: 26, photoUrl: null },
    { name: "Memphis Depay",      position: "Forward",    jerseyNumber: 10, teamName: "Netherlands",   age: 31, photoUrl: null },
    // Morocco
    { name: "Achraf Hakimi",      position: "Defender",   jerseyNumber: 2,  teamName: "Morocco",       age: 27, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/bvhxpz1671441600.jpg" },
    { name: "Hakim Ziyech",       position: "Midfielder", jerseyNumber: 7,  teamName: "Morocco",       age: 32, photoUrl: null },
    { name: "Youssef En-Nesyri",  position: "Forward",    jerseyNumber: 19, teamName: "Morocco",       age: 28, photoUrl: null },
    // Belgium
    { name: "Kevin De Bruyne",    position: "Midfielder", jerseyNumber: 7,  teamName: "Belgium",       age: 34, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/uwbpxv1519741478.jpg" },
    { name: "Romelu Lukaku",      position: "Forward",    jerseyNumber: 9,  teamName: "Belgium",       age: 33, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/ovryxv1519742038.jpg" },
    // Germany
    { name: "Jamal Musiala",      position: "Midfielder", jerseyNumber: 10, teamName: "Germany",       age: 23, photoUrl: null },
    { name: "Florian Wirtz",      position: "Midfielder", jerseyNumber: 17, teamName: "Germany",       age: 23, photoUrl: null },
    { name: "Kai Havertz",        position: "Forward",    jerseyNumber: 29, teamName: "Germany",       age: 26, photoUrl: null },
    { name: "Manuel Neuer",       position: "Goalkeeper", jerseyNumber: 1,  teamName: "Germany",       age: 39, photoUrl: null },
    // Croatia
    { name: "Luka Modrić",        position: "Midfielder", jerseyNumber: 10, teamName: "Croatia",       age: 40, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/t5mgq11519741395.jpg" },
    { name: "Ivan Perišić",       position: "Forward",    jerseyNumber: 4,  teamName: "Croatia",       age: 36, photoUrl: null },
    // Senegal
    { name: "Sadio Mané",         position: "Forward",    jerseyNumber: 10, teamName: "Senegal",       age: 33, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/kw5qyq1519741448.jpg" },
    { name: "Edouard Mendy",      position: "Goalkeeper", jerseyNumber: 16, teamName: "Senegal",       age: 33, photoUrl: null },
    // Mexico
    { name: "Santiago Giménez",   position: "Forward",    jerseyNumber: 11, teamName: "Mexico",        age: 25, photoUrl: null },
    { name: "Hirving Lozano",     position: "Forward",    jerseyNumber: 22, teamName: "Mexico",        age: 30, photoUrl: null },
    // United States
    { name: "Christian Pulisic",  position: "Forward",    jerseyNumber: 10, teamName: "United States", age: 27, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/6l9hk91519742100.jpg" },
    { name: "Weston McKennie",    position: "Midfielder", jerseyNumber: 8,  teamName: "United States", age: 27, photoUrl: null },
    { name: "Tyler Adams",        position: "Midfielder", jerseyNumber: 4,  teamName: "United States", age: 26, photoUrl: null },
    // Uruguay
    { name: "Federico Valverde",  position: "Midfielder", jerseyNumber: 15, teamName: "Uruguay",       age: 27, photoUrl: null },
    { name: "Darwin Núñez",       position: "Forward",    jerseyNumber: 9,  teamName: "Uruguay",       age: 26, photoUrl: null },
    // Japan
    { name: "Takumi Minamino",    position: "Midfielder", jerseyNumber: 10, teamName: "Japan",         age: 30, photoUrl: null },
    { name: "Reo Hatate",         position: "Midfielder", jerseyNumber: 7,  teamName: "Japan",         age: 28, photoUrl: null },
    // Colombia
    { name: "James Rodríguez",    position: "Midfielder", jerseyNumber: 10, teamName: "Colombia",      age: 34, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/hjzq0y1519741441.jpg" },
    { name: "Luis Díaz",          position: "Forward",    jerseyNumber: 7,  teamName: "Colombia",      age: 28, photoUrl: null },
    // Switzerland
    { name: "Granit Xhaka",       position: "Midfielder", jerseyNumber: 10, teamName: "Switzerland",   age: 33, photoUrl: null },
    { name: "Xherdan Shaqiri",    position: "Midfielder", jerseyNumber: 23, teamName: "Switzerland",   age: 33, photoUrl: null },
    // Egypt
    { name: "Mohamed Salah",      position: "Forward",    jerseyNumber: 10, teamName: "Egypt",         age: 33, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/n8u2hm1519741486.jpg" },
    // South Korea
    { name: "Heung-min Son",      position: "Forward",    jerseyNumber: 7,  teamName: "South Korea",   age: 33, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/b0k1wq1519741485.jpg" },
    { name: "Lee Kang-in",        position: "Midfielder", jerseyNumber: 17, teamName: "South Korea",   age: 24, photoUrl: null },
    // Australia
    { name: "Mat Ryan",           position: "Goalkeeper", jerseyNumber: 1,  teamName: "Australia",     age: 33, photoUrl: null },
    { name: "Mitchell Duke",      position: "Forward",    jerseyNumber: 19, teamName: "Australia",     age: 34, photoUrl: null },
    // Canada
    { name: "Alphonso Davies",    position: "Defender",   jerseyNumber: 19, teamName: "Canada",        age: 25, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/bfxioh1671441000.jpg" },
    { name: "Jonathan David",     position: "Forward",    jerseyNumber: 9,  teamName: "Canada",        age: 25, photoUrl: null },
    // Norway
    { name: "Erling Haaland",     position: "Forward",    jerseyNumber: 9,  teamName: "Norway",        age: 25, photoUrl: "https://www.thesportsdb.com/images/media/player/thumb/v9xlnb1671441300.jpg" },
    { name: "Martin Ødegaard",    position: "Midfielder", jerseyNumber: 10, teamName: "Norway",        age: 27, photoUrl: null },
    // Sweden
    { name: "Viktor Gyökeres",    position: "Forward",    jerseyNumber: 10, teamName: "Sweden",        age: 27, photoUrl: null },
    // Austria
    { name: "David Alaba",        position: "Defender",   jerseyNumber: 6,  teamName: "Austria",       age: 33, photoUrl: null },
    { name: "Marcel Sabitzer",    position: "Midfielder", jerseyNumber: 7,  teamName: "Austria",       age: 31, photoUrl: null },
    // Iran
    { name: "Mehdi Taremi",       position: "Forward",    jerseyNumber: 9,  teamName: "Iran",          age: 33, photoUrl: null },
    { name: "Sardar Azmoun",      position: "Forward",    jerseyNumber: 7,  teamName: "Iran",          age: 30, photoUrl: null },
    // Turkey
    { name: "Arda Güler",         position: "Midfielder", jerseyNumber: 10, teamName: "Turkey",        age: 20, photoUrl: null },
    { name: "Hakan Çalhanoğlu",   position: "Midfielder", jerseyNumber: 8,  teamName: "Turkey",        age: 31, photoUrl: null },
    // Ecuador
    { name: "Enner Valencia",     position: "Forward",    jerseyNumber: 13, teamName: "Ecuador",       age: 35, photoUrl: null },
    { name: "Moisés Caicedo",     position: "Midfielder", jerseyNumber: 10, teamName: "Ecuador",       age: 23, photoUrl: null },
    // Scotland
    { name: "Andy Robertson",     position: "Defender",   jerseyNumber: 3,  teamName: "Scotland",      age: 32, photoUrl: null },
    { name: "Scott McTominay",    position: "Midfielder", jerseyNumber: 10, teamName: "Scotland",      age: 28, photoUrl: null },
    // Saudi Arabia
    { name: "Salem Al-Dawsari",   position: "Forward",    jerseyNumber: 11, teamName: "Saudi Arabia",  age: 33, photoUrl: null },
    // Paraguay
    { name: "Miguel Almirón",     position: "Midfielder", jerseyNumber: 10, teamName: "Paraguay",      age: 31, photoUrl: null },
    // Ivory Coast
    { name: "Sébastien Haller",   position: "Forward",    jerseyNumber: 9,  teamName: "Ivory Coast",   age: 31, photoUrl: null },
    // Algeria
    { name: "Riyad Mahrez",       position: "Forward",    jerseyNumber: 26, teamName: "Algeria",       age: 34, photoUrl: null },
    { name: "Islam Slimani",      position: "Forward",    jerseyNumber: 19, teamName: "Algeria",       age: 36, photoUrl: null },
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
              name:          p.name,
              shortName:     p.name.split(" ").pop(),
              team:          teamId,
              teamName:      p.teamName,
              position:      p.position,
              jerseyNumber:  p.jerseyNumber,
              age:           p.age,
              nationality:   p.teamName,
              photoUrl:      p.photoUrl || null,
              active:        true,
            },
            $setOnInsert: {
              "stats.goals":       0,
              "stats.assists":     0,
              "stats.appearances": 0,
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

        const teamOps = teams.map((t) => {
          const fifaRank   = FIFA_RANKINGS[t.name_en] || null;
          const starRating = rankToStars(fifaRank);
          return {
            updateOne: {
              filter: { apiTeamId: String(t.id) },
              update: {
                $set: {
                  apiTeamId:   String(t.id),
                  name:        t.name_en,
                  shortName:   t.fifa_code || t.name_en.slice(0, 3).toUpperCase(),
                  country:     t.name_en,
                  logoUrl:     t.flag || null,
                  group:       t.groups || null,
                  fifaRanking: fifaRank,
                  starRating:  starRating,
                },
                $setOnInsert: {
                  stats: { played: 0, won: 0, drawn: 0, lost: 0,
                           goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
                },
              },
              upsert: true,
            },
          };
        });

        if (teamOps.length) await Team.bulkWrite(teamOps);
        results.teams = teams.length;
        console.log(`[Sync] Teams synced: ${teams.length} (with FIFA rankings & star ratings)`);
      } catch (err) {
        results.errors.push(`teams: ${err.message}`);
      }
    }

    // Load team mappings (needed for matches and players)
    const teamDocs = await Team.find({}, { _id: 1, name: 1, logoUrl: 1, apiTeamId: 1, shortName: 1 });
    const teamIdMap     = Object.fromEntries(teamDocs.map(t => [t.name, t._id]));
    const teamLogoMap   = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t.logoUrl]));
    const teamShortMap  = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t.shortName]));
    const teamMongoMap  = Object.fromEntries(teamDocs.map(t => [t.apiTeamId, t._id])); // MongoDB _id by apiTeamId

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
                "homeTeam._id":      teamMongoMap[String(g.home_team_id)] || null,
                "awayTeam.name":     g.away_team_name_en || g.away_team_label || "TBD",
                "awayTeam.shortName":teamShortMap[String(g.away_team_id)] || (g.away_team_name_en ? g.away_team_name_en.slice(0, 3).toUpperCase() : "TBD"),
                "awayTeam.logoUrl":  teamLogoMap[String(g.away_team_id)] || null,
                "awayTeam.apiTeamId":String(g.away_team_id),
                "awayTeam._id":      teamMongoMap[String(g.away_team_id)] || null,
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

        if (matchOps.length) {
          await Match.bulkWrite(matchOps);
          
          // Auto-enrich matches with lineups, subs, goals, cards, and shootouts
          try {
            const { enrichMatch } = require("../utils/matchEnricher");
            const allMatches = await Match.find({});
            let enrichedCount = 0;
            for (const match of allMatches) {
              const isModified = await enrichMatch(match);
              if (isModified) {
                await match.save();
                enrichedCount++;
              }
            }
            console.log(`[Sync] Matches enriched: ${enrichedCount}`);
          } catch (enrichErr) {
            console.error("[Sync] Match enrichment error:", enrichErr.message);
          }
        }
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
