const axios = require("axios");
const Team = require("../models/Team");
const Player = require("../models/Player");
const Setting = require("../models/Setting");

const SQUADS_URL = "https://v1rus609.github.io/worldcup26/wc26-official-squads.json";

// Map api-football / web positions to standard enum values
const mapPosition = (pos) => {
  const value = String(pos || "Midfielder").toLowerCase();
  if (value.includes("goal")) return "Goalkeeper";
  if (value.includes("def"))  return "Defender";
  if (value.includes("mid"))  return "Midfielder";
  if (value.includes("for") || value.includes("wing") || value.includes("striker") || value.includes("attack")) return "Forward";
  return "Midfielder";
};

// Convert FIFA ranking to star rating (1-5 stars) as a fallback
const rankToStars = (rank) => {
  if (!rank) return 3;
  if (rank <= 10) return 5;
  if (rank <= 20) return 4.5;
  if (rank <= 30) return 4;
  if (rank <= 50) return 3.5;
  if (rank <= 70) return 3;
  return 2.5;
};

/**
 * Weekly auto-updater for star ratings (Teams and Players)
 * Fetches data from https://v1rus609.github.io/worldcup26/wc26-official-squads.json
 */
const updateStarRatings = async (force = false) => {
  const now = new Date();

  if (!force) {
    // Check if updated in the last 7 days (7 * 24 * 60 * 60 * 1000 = 604800000 ms)
    try {
      const lastUpdateSetting = await Setting.findOne({ key: "lastStarUpdate" });
      if (lastUpdateSetting && lastUpdateSetting.value) {
        const lastUpdate = new Date(lastUpdateSetting.value);
        const diff = now.getTime() - lastUpdate.getTime();
        if (diff < 604800000) {
          console.log("[Star Updater] Star ratings updated recently. Skipping auto-update.");
          return { skipped: true, lastUpdate };
        }
      }
    } catch (e) {
      console.warn("[Star Updater] Setting lookup failed, proceeding with update:", e.message);
    }
  }

  console.log("[Star Updater] Fetching official squads & ratings from v1rus609 website...");
  try {
    const response = await axios.get(SQUADS_URL, { timeout: 15000 });
    const squads = response.data;
    if (!squads || typeof squads !== "object") {
      throw new Error("Invalid squads JSON format");
    }

    let teamsUpdated = 0;
    let playersUpdated = 0;
    let playersCreated = 0;

    // Loop through each team key (e.g. "MEX", "ARG")
    for (const [teamCode, playersList] of Object.entries(squads)) {
      if (teamCode.startsWith("_")) continue; // Skip informational/instructional fields
      if (!Array.isArray(playersList)) continue;

      // Find the team in the database by shortName (e.g. "MEX")
      const team = await Team.findOne({ shortName: teamCode });
      if (!team) {
        // Try fallback by name matching
        continue;
      }

      // Load all players of this team from the database in a single query
      const dbPlayers = await Player.find({ team: team._id });

      let playerStarsSum = 0;
      let ratedPlayersCount = 0;

      for (const p of playersList) {
        const pName = p.name;
        const pStars = p.stars || 3;
        const pPos = mapPosition(p.position);

        playerStarsSum += pStars;
        ratedPlayersCount++;

        // Find the player in memory
        let dbPlayer = dbPlayers.find(
          (dp) => dp.name.trim().toLowerCase() === pName.trim().toLowerCase()
        );

        if (!dbPlayer) {
          // Fallback: match by the last name in memory
          const nameParts = pName.trim().split(" ");
          const lastName = nameParts[nameParts.length - 1]?.toLowerCase();
          if (lastName && lastName.length > 2) {
            dbPlayer = dbPlayers.find((dp) =>
              dp.name.toLowerCase().includes(lastName)
            );
          }
        }

        if (dbPlayer) {
          // Update the existing player's starRating
          let changed = false;
          if (dbPlayer.starRating !== pStars) {
            dbPlayer.starRating = pStars;
            changed = true;
          }
          if (p.jerseyNumber && dbPlayer.jerseyNumber !== p.jerseyNumber) {
            dbPlayer.jerseyNumber = p.jerseyNumber;
            changed = true;
          }
          if (changed) {
            await dbPlayer.save();
            playersUpdated++;
          }
        } else {
          // Double-check against ALL players in the DB (not just this team) using
          // a case-insensitive name match — catches superstars seeded by sync.js
          // under a different team reference or with slightly different casing.
          const globalExisting = await Player.findOne({
            name: { $regex: new RegExp(`^${pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            team: team._id,
          });

          if (globalExisting) {
            // Player exists under this team already (maybe from seedTopPlayers) — just update stars
            let changed = false;
            if (globalExisting.starRating !== pStars) { globalExisting.starRating = pStars; changed = true; }
            if (p.jerseyNumber && globalExisting.jerseyNumber !== p.jerseyNumber) { globalExisting.jerseyNumber = p.jerseyNumber; changed = true; }
            if (changed) { await globalExisting.save(); playersUpdated++; }
          } else {
            // Last-resort fallback: check by jerseyNumber + team to avoid duplicates
            // when name spelling differs between seed data and squads JSON
            let jerseyExisting = null;
            if (p.jerseyNumber) {
              jerseyExisting = await Player.findOne({
                team: team._id,
                jerseyNumber: p.jerseyNumber,
              });
            }

            if (jerseyExisting) {
              // Same jersey number on same team — update name to canonical squads JSON spelling
              let changed = false;
              if (jerseyExisting.starRating !== pStars) { jerseyExisting.starRating = pStars; changed = true; }
              if (jerseyExisting.position !== pPos) { jerseyExisting.position = pPos; changed = true; }
              if (changed) { await jerseyExisting.save(); playersUpdated++; }
            } else {
              // Truly new player — create it
              const newPlayer = new Player({
                name: pName,
                shortName: pName,
                team: team._id,
                teamName: team.name,
                position: pPos,
                starRating: pStars,
                active: true,
                jerseyNumber: p.jerseyNumber || null,
                stats: { goals: 0, assists: 0, appearances: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0 },
              });
              await newPlayer.save();
              playersCreated++;
            }
          }
        }
      }

      // Compute the average player stars for the team
      if (ratedPlayersCount > 0) {
        const avgStars = playerStarsSum / ratedPlayersCount;
        // Round to nearest 0.5 stars
        const roundedStars = Math.round(avgStars * 2) / 2;
        team.starRating = Math.max(1, Math.min(5, roundedStars));
      } else {
        // Fallback to FIFA ranking conversion
        team.starRating = rankToStars(team.fifaRanking || 99);
      }

      await team.save();
      teamsUpdated++;
    }

    // Save update timestamp to settings collection
    await Setting.findOneAndUpdate(
      { key: "lastStarUpdate" },
      { key: "lastStarUpdate", value: now.toISOString() },
      { upsert: true, new: true }
    );

    console.log(`[Star Updater] Success. Teams updated: ${teamsUpdated}, Players updated: ${playersUpdated}, Players created: ${playersCreated}`);
    return { success: true, teamsUpdated, playersUpdated, playersCreated };
  } catch (err) {
    console.error("[Star Updater] Error updating star ratings:", err.message);
    throw err;
  }
};

module.exports = { updateStarRatings, rankToStars };
