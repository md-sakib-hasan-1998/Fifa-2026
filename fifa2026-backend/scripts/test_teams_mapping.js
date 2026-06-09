const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const fs = require("fs");
const Team = require("../models/Team");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const dbTeams = await Team.find({});
  console.log(`Found ${dbTeams.length} teams in MongoDB`);

  const teamsMap = {};
  dbTeams.forEach(t => {
    teamsMap[t.shortName] = { id: t._id, name: t.name };
  });

  console.log("Team shortNames in DB:", Object.keys(teamsMap).sort());
  await mongoose.disconnect();
}

main().catch(console.error);
