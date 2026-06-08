const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Team = require("../models/Team");
const Player = require("../models/Player");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

const normalizeName = (name) => {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const players = await Player.find({});
  console.log(`Analyzing ${players.length} players for duplicates...`);

  // Group by teamId + normalizedName
  const groups = {};
  for (const player of players) {
    const key = `${player.team.toString()}_${normalizeName(player.name)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(player);
  }

  let deletedCount = 0;
  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      console.log(`Duplicate found for group '${key}': ${list.length} records`);
      
      // Score each record to pick the best one
      const scored = list.map(p => {
        let score = 0;
        if (p.apiPlayerId) score += 100;
        if (p.jerseyNumber !== null && p.jerseyNumber !== undefined) score += 50;
        if (p.photoUrl && !p.photoUrl.includes("default")) score += 30;
        score += (p.starRating || 0);
        // Stats score
        const stats = p.stats || {};
        const statsSum = (stats.goals || 0) + (stats.assists || 0) + (stats.appearances || 0);
        score += statsSum * 10;
        return { player: p, score };
      });

      // Sort descending by score, then by updatedAt
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.player.updatedAt) - new Date(a.player.updatedAt);
      });

      const best = scored[0].player;
      console.log(`Keeping: ${best.name} (ID: ${best._id}, Score: ${scored[0].score}, Jersey: ${best.jerseyNumber})`);

      const toDelete = scored.slice(1).map(item => item.player._id);
      await Player.deleteMany({ _id: { $in: toDelete } });
      deletedCount += toDelete.length;
    }
  }

  console.log(`Deduplication complete. Removed ${deletedCount} duplicate player(s).`);
  await mongoose.disconnect();
}

main().catch(console.error);
