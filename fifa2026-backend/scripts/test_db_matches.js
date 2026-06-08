const mongoose = require("mongoose");
const Match = require("../models/Match");

const MONGO_URI = "mongodb+srv://fifa2026user:Sakib1998@fifa2026.xnq40ix.mongodb.net/fifa2026?retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const matches = await Match.find({}).sort({ apiMatchId: 1 });
  console.log(`Found ${matches.length} matches in DB`);

  for (let i = 0; i < 5; i++) {
    const m = matches[i];
    if (!m) break;
    console.log(`Match ${m.apiMatchId}: ${m.homeTeam.name} vs ${m.awayTeam.name} (stage: ${m.stage}, group: ${m.group}) - Kickoff: ${m.kickoffTime.toISOString()}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
