// ─── aggregatePlayerStats.js ─────────────────────────────────────────────────
// Loops through all finished matches, reads their goals[] events, and
// recomputes each player's stats.goals and stats.assists in the Player collection.
//
// Data source: worldcup26.ir (via the Match collection's goals array)
// Called after: each sync refresh cycle
// ─────────────────────────────────────────────────────────────────────────────

const Match  = require("../models/Match");
const Player = require("../models/Player");
const Team   = require("../models/Team");

/**
 * Aggregate goals and assists from all finished (or live) matches.
 * Finds each scorer/assister by name + team in the Player collection.
 * Safe to run multiple times — always overwrites with fresh counts.
 */
const aggregatePlayerStats = async () => {
  // Only count goals from matches that have started
  const matches = await Match.find({
    status: { $in: ["finished", "live", "halftime"] },
    "goals.0": { $exists: true }, // only matches that have goals data
  });

  if (!matches.length) {
    console.log("[AggStats] No finished matches with goals yet. Skipping.");
    return { playersUpdated: 0 };
  }

  // Build a map: teamName → team._id (for quick lookup)
  const teams = await Team.find({}, { _id: 1, name: 1, shortName: 1, apiTeamId: 1 });
  const teamByName = Object.fromEntries(teams.map(t => [t.name.toLowerCase(), t._id]));
  const teamByApiId = Object.fromEntries(teams.map(t => [t.apiTeamId, t._id]));

  // Accumulate goals/assists per player name + teamId
  // Map key: `${playerName}||${teamId}`
  const statsMap = {}; // key → { goals: 0, assists: 0 }

  const bump = (playerName, teamId, field) => {
    if (!playerName || !teamId) return;
    const key = `${playerName.toLowerCase().trim()}||${teamId}`;
    if (!statsMap[key]) statsMap[key] = { name: playerName, teamId, goals: 0, assists: 0 };
    statsMap[key][field]++;
  };

  for (const match of matches) {
    // Resolve home/away team IDs
    const homeTeamId = match.homeTeam?._id ||
      teamByApiId[match.homeTeam?.apiTeamId] ||
      teamByName[match.homeTeam?.name?.toLowerCase()];
    const awayTeamId = match.awayTeam?._id ||
      teamByApiId[match.awayTeam?.apiTeamId] ||
      teamByName[match.awayTeam?.name?.toLowerCase()];

    for (const goal of (match.goals || [])) {
      const scoringTeamId = goal.team === "home" ? homeTeamId : awayTeamId;

      if (goal.type === "own_goal") {
        // Own goal — credit the other team's goal count, not the player
        continue;
      }

      // Credit goal to scorer
      if (goal.playerName && scoringTeamId) {
        bump(goal.playerName, scoringTeamId, "goals");
      }

      // Credit assist if present
      if (goal.assistPlayerName && scoringTeamId) {
        bump(goal.assistPlayerName, scoringTeamId, "assists");
      }
    }
  }

  if (!Object.keys(statsMap).length) {
    console.log("[AggStats] No goal events found in finished matches.");
    return { playersUpdated: 0 };
  }

  // Now update the Player collection
  let playersUpdated = 0;
  for (const entry of Object.values(statsMap)) {
    const { name, teamId, goals, assists } = entry;

    // Try exact name match first
    let player = await Player.findOne({
      team: teamId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    // Fallback: last-name match within same team
    if (!player) {
      const lastName = name.trim().split(" ").pop()?.toLowerCase();
      if (lastName && lastName.length > 2) {
        player = await Player.findOne({
          team: teamId,
          name: { $regex: new RegExp(lastName, "i") },
        });
      }
    }

    if (player) {
      player.stats = player.stats || {};
      player.stats.goals   = goals;
      player.stats.assists = assists;
      await player.save();
      playersUpdated++;
    }
  }

  console.log(`[AggStats] Updated stats for ${playersUpdated} players from ${matches.length} matches.`);
  return { playersUpdated, matchesProcessed: matches.length };
};

module.exports = { aggregatePlayerStats };
