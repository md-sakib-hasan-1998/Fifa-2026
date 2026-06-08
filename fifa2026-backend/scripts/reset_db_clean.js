const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const Player = require("../models/Player");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Zero all player stats
  const playerResult = await Player.updateMany(
    {},
    {
      $set: {
        "stats.goals":        0,
        "stats.assists":      0,
        "stats.appearances":  0,
        "stats.minutesPlayed":0,
        "stats.yellowCards":  0,
        "stats.redCards":     0,
        "stats.shotsOnTarget":0,
      },
    }
  );
  console.log(`Reset stats for ${playerResult.modifiedCount} players.`);

  // Zero all match scores and clear events
  const matchResult = await Match.updateMany(
    {},
    {
      $set: {
        "score.home": 0,
        "score.away": 0,
        "score.homePenalty": null,
        "score.awayPenalty": null,
        goals: [],
        cards: [],
        status: "scheduled",
        minute: null,
        penalties: [],
      },
    }
  );
  console.log(`Reset score/events for ${matchResult.modifiedCount} matches.`);

  await mongoose.disconnect();
}

main().catch(console.error);
