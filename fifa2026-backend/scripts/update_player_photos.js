const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Player = require("../models/Player");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

const normalize = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
};

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const players = await Player.find({});
  console.log(`Migrating photos for ${players.length} players...`);

  let updatedCount = 0;
  for (const player of players) {
    const teamName = player.teamName;
    const name = player.name;
    if (teamName && name) {
      const githubUrl = `https://raw.githubusercontent.com/md-sakib-hasan-1998/Fifa-2026/main/player-photos/${normalize(teamName)}_${normalize(name)}.png`;
      if (player.photoUrl !== githubUrl) {
        player.photoUrl = githubUrl;
        await player.save();
        updatedCount++;
      }
    }
  }

  console.log(`Photo migration complete. Updated ${updatedCount} player photo URL(s).`);
  await mongoose.disconnect();
}

main().catch(console.error);
