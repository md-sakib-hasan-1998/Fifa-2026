const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const Match = require("../models/Match");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";

// All stored times are 2 hours AHEAD of correct BDT.
// Fix: subtract 2 hours from every kickoffTime in the DB.
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const matches = await Match.find({ kickoffTime: { $exists: true } });
  console.log(`Found ${matches.length} matches to fix`);

  let fixed = 0;
  for (const m of matches) {
    if (!m.kickoffTime) continue;
    const original = new Date(m.kickoffTime);
    const corrected = new Date(original.getTime() - TWO_HOURS_MS);
    m.kickoffTime = corrected;
    await m.save();
    fixed++;
    if (fixed <= 5) {
      // Show first 5 as a sanity check
      const bdtOld = new Date(original.getTime() + 6 * 60 * 60 * 1000);
      const bdtNew = new Date(corrected.getTime() + 6 * 60 * 60 * 1000);
      console.log(
        `  Match ${m.apiMatchId}: ${bdtOld.toUTCString().slice(17,22)} BDT → ${bdtNew.toUTCString().slice(17,22)} BDT`
      );
    }
  }

  console.log(`\n✅ Fixed ${fixed} matches — all times shifted back 2 hours`);
  await mongoose.disconnect();
}

main().catch(console.error);
