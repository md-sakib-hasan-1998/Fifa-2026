/**
 * import_official_squads.js
 *
 * Reads wc26-official-squads.json and wc26-official-squads2.json,
 * merges them (file2 overrides file1 for any team that has a non-empty array),
 * then for every team found:
 *   - Deletes all existing player records for that team
 *   - Inserts fresh players with correct starRating, position, and GitHub photo URL
 *
 * Run once:  node scripts/import_official_squads.js
 */

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Team = require("../models/Team");
const Player = require("../models/Player");

const MONGO_URI =
  "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

const SQUAD_FILE_1 = "C:/Users/user/Downloads/worldcup26-main (1)/worldcup26-main/wc26-official-squads.json";
const SQUAD_FILE_2 = "C:/Users/user/Downloads/worldcup26-main (1)/worldcup26-main/wc26-official-squads2.json";

// GitHub raw photo URL helper
const normalize = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

const getGithubPhotoUrl = (teamName, playerName) => {
  if (!teamName || !playerName) return null;
  return `https://raw.githubusercontent.com/md-sakib-hasan-1998/Fifa-2026/main/player-photos/${normalize(teamName)}_${normalize(playerName)}.png`;
};

// Normalize position strings
const normalizePosition = (pos) => {
  const map = {
    Goalkeeper: "Goalkeeper",
    goalkeeper: "Goalkeeper",
    Defender: "Defender",
    defender: "Defender",
    Midfielder: "Midfielder",
    midfielder: "Midfielder",
    Attacker: "Forward",
    attacker: "Forward",
    Forward: "Forward",
    forward: "Forward",
  };
  return map[pos] || "Midfielder";
};

async function main() {
  // ── Load both JSON files ──────────────────────────────────
  const squads1 = JSON.parse(fs.readFileSync(SQUAD_FILE_1, "utf8"));
  const squads2 = JSON.parse(fs.readFileSync(SQUAD_FILE_2, "utf8"));

  // Merge: start with squads1, override with squads2 where it has non-empty arrays
  const merged = { ...squads1 };
  for (const [code, players] of Object.entries(squads2)) {
    if (code.startsWith("_")) continue; // skip metadata keys
    if (Array.isArray(players) && players.length > 0) {
      merged[code] = players;
    }
  }

  // Filter out metadata keys
  const teamCodes = Object.keys(merged).filter(k => !k.startsWith("_") && Array.isArray(merged[k]) && merged[k].length > 0);
  console.log(`\nSquad data found for ${teamCodes.length} teams:`, teamCodes.join(", "));

  // ── Connect to MongoDB ────────────────────────────────────
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB\n");

  // ── Load all teams from DB keyed by shortName ─────────────
  const dbTeams = await Team.find({});
  const teamByCode = {};
  dbTeams.forEach(t => {
    teamByCode[t.shortName] = t;
  });

  let totalInserted = 0;
  let totalDeleted = 0;
  let teamsUpdated = 0;
  let teamsMissing = [];

  // ── Process each team ─────────────────────────────────────
  for (const code of teamCodes) {
    const team = teamByCode[code];
    if (!team) {
      console.warn(`⚠️  Team code "${code}" not found in DB — skipping`);
      teamsMissing.push(code);
      continue;
    }

    const officialPlayers = merged[code];

    // Delete all existing players for this team
    const deleteResult = await Player.deleteMany({ team: team._id });
    totalDeleted += deleteResult.deletedCount;

    // Insert fresh players
    const playerDocs = officialPlayers.map((p) => ({
      name: p.name,
      shortName: p.name,
      team: team._id,
      teamName: team.name,
      position: normalizePosition(p.position),
      starRating: p.stars || 3,
      jerseyNumber: p.jerseyNumber || null,
      active: true,
      photoUrl: getGithubPhotoUrl(team.name, p.name),
      stats: {
        goals: 0,
        assists: 0,
        appearances: 0,
        minutesPlayed: 0,
        yellowCards: 0,
        redCards: 0,
        shotsOnTarget: 0,
      },
    }));

    await Player.insertMany(playerDocs);
    totalInserted += playerDocs.length;
    teamsUpdated++;

    console.log(
      `✅  ${team.name} (${code}): deleted ${deleteResult.deletedCount} old, inserted ${playerDocs.length} players`
    );
  }

  console.log("\n════════════════════════════════════════");
  console.log(`Teams updated:    ${teamsUpdated}`);
  console.log(`Players deleted:  ${totalDeleted}`);
  console.log(`Players inserted: ${totalInserted}`);
  if (teamsMissing.length) {
    console.log(`Teams not found in DB: ${teamsMissing.join(", ")}`);
  }
  console.log("════════════════════════════════════════\n");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(console.error);
