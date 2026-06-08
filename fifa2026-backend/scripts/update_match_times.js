const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Match = require("../models/Match");

const MONGO_URI = "mongodb://fifa2026user:Sakib1998@ac-ft5cg4w-shard-00-00.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-01.xnq40ix.mongodb.net:27017,ac-ft5cg4w-shard-00-02.xnq40ix.mongodb.net:27017/fifa2026?ssl=true&authSource=admin&retryWrites=true&w=majority";
const htmlPath = "C:/Users/user/Downloads/worldcup26-main (1)/worldcup26-main/index.html";

const TOURNAMENT_YEAR = 2026;
const MONTH_INDEX = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

function parseLocalBDTDate(dateStr, timeStr) {
  const parts = dateStr.match(/[A-Za-z]{3}\s+(\d{1,2})\s+([A-Za-z]{3})/);
  const clock = timeStr.split(":").map(Number);
  if (!parts || clock.length !== 2) return new Date(NaN);
  
  const day = Number(parts[1]);
  const month = MONTH_INDEX[parts[2]];
  
  const localMs = Date.UTC(TOURNAMENT_YEAR, month, day, clock[0], clock[1]);
  // Bangladesh offset is UTC+6
  return new Date(localMs - 6 * 60 * 60 * 1000);
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error(`Downloaded index.html not found at: ${htmlPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(htmlPath, "utf8");
  const fixturesMatch = content.match(/const\s+FIXTURES\s*=\s*(\[[\s\S]*?\]);/);
  const koMatch = content.match(/const\s+KO_MATCHES\s*=\s*(\[[\s\S]*?\]);/);

  if (!fixturesMatch || !koMatch) {
    console.error("Could not parse FIXTURES or KO_MATCHES from downloaded index.html");
    process.exit(1);
  }

  const fixtures = eval(fixturesMatch[1]);
  const koMatches = eval(koMatch[1]);

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const newMatchTimes = [];

  // 1. Process Group Stage matches
  for (const f of fixtures) {
    const matchNum = parseInt(f.id.replace("GS", ""), 10);
    const utcKickoff = parseLocalBDTDate(f.date, f.time);

    if (Number.isNaN(utcKickoff.getTime())) {
      console.warn(`Invalid date/time for Group Match ${matchNum}: ${f.date} ${f.time}`);
      continue;
    }

    const matchDoc = await Match.findOne({ apiMatchId: String(matchNum) });
    if (matchDoc) {
      matchDoc.kickoffTime = utcKickoff;
      await matchDoc.save();
      console.log(`Updated Group Match ${matchNum} (${f.home} vs ${f.away}) kickoff to ${utcKickoff.toISOString()}`);
    } else {
      console.warn(`Match document for Group Match ${matchNum} not found in DB`);
    }

    newMatchTimes.push({
      group: f.group,
      index: matchNum - 1,
      home: f.home,
      away: f.away,
      kickoff: utcKickoff.toISOString(),
      matchNum: matchNum
    });
  }

  // 2. Process Knockout matches
  for (const m of koMatches) {
    const matchNum = m.no;
    const utcKickoff = parseLocalBDTDate(m.date, m.time);

    if (Number.isNaN(utcKickoff.getTime())) {
      console.warn(`Invalid date/time for Knockout Match ${matchNum}: ${m.date} ${m.time}`);
      continue;
    }

    const matchDoc = await Match.findOne({ apiMatchId: String(matchNum) });
    if (matchDoc) {
      matchDoc.kickoffTime = utcKickoff;
      await matchDoc.save();
      console.log(`Updated Knockout Match ${matchNum} kickoff to ${utcKickoff.toISOString()}`);
    } else {
      console.warn(`Match document for Knockout Match ${matchNum} not found in DB`);
    }

    newMatchTimes.push({
      stage: m.round,
      index: matchNum - 1,
      kickoff: utcKickoff.toISOString(),
      matchNum: matchNum
    });
  }

  // Write new matchTimes.json file
  const outputPath = path.join(__dirname, "../utils/matchTimes.json");
  fs.writeFileSync(outputPath, JSON.stringify(newMatchTimes, null, 2), "utf8");
  console.log(`Saved new match override times to ${outputPath}`);

  await mongoose.disconnect();
}

main().catch(console.error);
