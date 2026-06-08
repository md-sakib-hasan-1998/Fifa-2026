const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Player = require("../models/Player");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const matches = await Match.find({}).sort({ kickoffTime: 1 });
  console.log(`Dumping ${matches.length} matches:`);
  matches.forEach(m => {
    console.log(`${m.apiMatchId} | ${m.stage} | ${m.group || 'KO'} | ${m.homeTeam.name} vs ${m.awayTeam.name} | ${m.kickoffTime.toISOString()}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
