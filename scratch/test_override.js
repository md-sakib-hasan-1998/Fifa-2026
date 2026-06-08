const fs = require("fs");
const path = require("path");
const matchTimes = require("../fifa2026-backend/utils/matchTimes.json");

const normalizeTeamName = (name) => {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  if (n === "usa" || n === "united states" || n === "united states of america") return "usa";
  if (n === "bosnia and herzegovina" || n === "bosnia-herzegovina") return "bosnia";
  if (n === "ivory coast" || n === "cote d'ivoire" || n === "côte d'ivoire") return "cote";
  if (n === "turkey" || n === "türkiye") return "turkey";
  if (n === "democratic republic of the congo" || n === "dr congo" || n === "dr. congo" || n === "congo dr") return "drcongo";
  return n;
};

async function testOverride() {
  const res = await fetch("https://worldcup26.ir/get/games");
  const data = await res.json();
  const games = data.games || [];

  console.log(`Fetched ${games.length} games from API`);

  let matchedCount = 0;
  let groupStageCount = 0;
  const unmatched = [];

  games.forEach(g => {
    // Only group stage matches
    if (g.type === "group") {
      groupStageCount++;
      const homeName = g.home_team_name_en;
      const awayName = g.away_team_name_en;
      const group = g.group;

      const normHome = normalizeTeamName(homeName);
      const normAway = normalizeTeamName(awayName);

      const match = matchTimes.find(m => {
        if (m.group.toUpperCase() !== group.toUpperCase()) return false;
        const mHome = normalizeTeamName(m.home);
        const mAway = normalizeTeamName(m.away);
        return (mHome === normHome && mAway === normAway) || (mHome === normAway && mAway === normHome);
      });

      if (match) {
        matchedCount++;
      } else {
        unmatched.push({ id: g.id, home: homeName, away: awayName, group });
      }
    }
  });

  console.log(`Total Group Stage Games in API: ${groupStageCount}`);
  console.log(`Successfully Matched with Local Times: ${matchedCount}`);
  console.log(`Unmatched Games: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log("Unmatched details:", unmatched);
  }
}

testOverride().catch(console.error);
