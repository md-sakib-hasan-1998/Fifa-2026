/**
 * fix_star_players.js
 * Sets Messi, Neymar, and Ronaldo to 5 stars.
 */
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Player = require("../models/Player");

const MONGO_URI =
  "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

const TARGETS = [
  /messi/i,
  /neymar/i,
  /ronaldo/i,
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const pattern of TARGETS) {
    const result = await Player.updateMany(
      { name: { $regex: pattern } },
      { $set: { starRating: 5 } }
    );
    console.log(`Pattern ${pattern}: updated ${result.modifiedCount} player(s)`);
  }

  // Print updated players
  const updated = await Player.find({
    name: { $in: [/messi/i, /neymar/i, /ronaldo/i] }
  }).select("name teamName starRating");
  console.log("\nVerification:");
  updated.forEach(p => console.log(`  ${p.name} (${p.teamName}): ⭐ ${p.starRating}`));

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(console.error);
