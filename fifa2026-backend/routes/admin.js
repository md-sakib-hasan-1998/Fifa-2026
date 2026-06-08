const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Team = require("../models/Team");
const Player = require("../models/Player");
const Match = require("../models/Match");
const { protect, authorize, piAuth } = require("../middleware/authMiddleware");

// All routes here require login + admin or moderator role
const adminOrMod = [protect, authorize("admin", "moderator")];
const adminOnly = [protect, authorize("admin")];

// ─── GET /api/admin/users ─────────────────────────────────
// Get all users (with optional status filter)
router.get("/users", ...adminOrMod, async (req, res) => {
  try {
    const { status, role } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/approve ────────────────────
// Admin or mod approves a pending user
router.put("/users/:id/approve", ...adminOrMod, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "approved") {
      return res.status(400).json({ message: "User is already approved" });
    }

    user.status = "approved";
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    res.json({ message: `${user.name} has been approved`, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/ban ────────────────────────
// Admin or mod bans a user
router.put("/users/:id/ban", ...adminOrMod, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Moderators cannot ban admins or other moderators
    if (req.user.role === "moderator" && user.role !== "user") {
      return res.status(403).json({
        message: "Moderators can only ban regular users",
      });
    }

    // Nobody can ban the admin
    if (user.role === "admin") {
      return res.status(403).json({ message: "The admin account cannot be banned" });
    }

    user.status = "banned";
    user.bannedBy = req.user._id;
    user.bannedAt = new Date();
    user.bannedReason = reason || null;
    await user.save();

    res.json({ message: `${user.name} has been banned`, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/unban ──────────────────────
router.put("/users/:id/unban", ...adminOrMod, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "approved";
    user.bannedBy = null;
    user.bannedAt = null;
    user.bannedReason = null;
    await user.save();

    res.json({ message: `${user.name} has been unbanned`, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/promote ────────────────────
// Admin only: promote a user to moderator
router.put("/users/:id/promote", ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot change the admin role" });
    }

    if (user.role === "moderator") {
      return res.status(400).json({ message: "User is already a moderator" });
    }

    user.role = "moderator";
    await user.save();

    res.json({ message: `${user.name} is now a moderator`, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/demote ─────────────────────
// Admin only: demote a moderator back to user
router.put("/users/:id/demote", ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot change the admin role" });
    }

    if (user.role === "user") {
      return res.status(400).json({ message: "User already has the user role" });
    }

    user.role = "user";
    await user.save();

    res.json({ message: `${user.name} is now a regular user`, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/users/:id/reset-password ─────────────
// Admin only: force-reset any user's password
router.put("/users/:id/reset-password", ...adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();

    res.json({ message: `Password reset for ${user.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════
//  PI SYNC ROUTES
//  Called by the Raspberry Pi's syncTeamsPlayers.js script.
//  Protected by the x-pi-secret header (piAuth middleware).
// ══════════════════════════════════════════════════════

// ─── POST /api/admin/sync-team ────────────────────────────
// Upserts one team + its full squad into MongoDB.
// If the team already exists (matched by apiTeamId), it updates it.
// If players already exist (matched by apiPlayerId), they are updated.
// New players are inserted. Players no longer in the squad are left
// untouched (they may have been edited manually).
router.post("/sync-team", piAuth, async (req, res) => {
  const { team: teamData, players: playersData = [] } = req.body;

  if (!teamData || !teamData.apiTeamId) {
    return res.status(400).json({ message: "team.apiTeamId is required" });
  }

  try {
    // ── 1. Upsert the team ──────────────────────────────
    const team = await Team.findOneAndUpdate(
      { apiTeamId: teamData.apiTeamId },
      {
        $set: {
          name:      teamData.name,
          shortName: teamData.shortName  || teamData.name.substring(0, 3).toUpperCase(),
          country:   teamData.country    || teamData.name,
          logoUrl:   teamData.logoUrl    || null,
          flagUrl:   teamData.flagUrl    || null,
          coach:     teamData.coach      || null,
          fifaRanking: teamData.fifaRanking || null,
          // Only set group if provided — don't overwrite a manually set group
          ...(teamData.group ? { group: teamData.group } : {}),
        },
        // $setOnInsert only runs when a NEW document is created
        $setOnInsert: {
          starRating: 3,
          eliminated: false,
          stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
        },
      },
      { upsert: true, new: true }
    );

    // ── 2. Upsert each player ───────────────────────────
    let inserted = 0;
    let updated  = 0;

    for (const p of playersData) {
      if (!p.apiPlayerId) continue;

      // Map position string → our enum values
      const positionMap = {
        Goalkeeper: "Goalkeeper",
        Defender:   "Defender",
        Midfielder: "Midfielder",
        Attacker:   "Forward",
        Forward:    "Forward",
      };
      const position = positionMap[p.position] || "Midfielder";

      const result = await Player.findOneAndUpdate(
        { apiPlayerId: p.apiPlayerId },
        {
          $set: {
            name:         p.name,
            shortName:    p.shortName    || p.name,
            team:         team._id,
            teamName:     team.name,
            photoUrl:     p.photoUrl     || null,
            nationality:  p.nationality  || team.country,
            age:          p.age          || null,
            position,
            jerseyNumber: p.jerseyNumber || null,
            active:       true,
          },
          $setOnInsert: {
            starRating: 3,
            stats: { goals: 0, assists: 0, appearances: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0, shotsOnTarget: 0, passAccuracy: null },
          },
        },
        { upsert: true, new: true }
      );

      // Mongoose doesn't directly tell us insert vs update in findOneAndUpdate,
      // so we check the timestamp as a proxy
      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      isNew ? inserted++ : updated++;
    }

    res.json({
      message: `Synced: ${team.name}`,
      teamId:   team._id,
      players: { inserted, updated, total: playersData.length },
    });

  } catch (error) {
    console.error("sync-team error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/admin/sync-player-stats ───────────────────
// Called by the Pi fetcher to bulk-update player stats
// after a match finishes (goals, assists, cards, minutes).
router.post("/sync-player-stats", piAuth, async (req, res) => {
  const { stats = [] } = req.body;

  // stats = array of:
  // { apiPlayerId, goals, assists, appearances, minutesPlayed, yellowCards, redCards }

  if (!Array.isArray(stats) || stats.length === 0) {
    return res.status(400).json({ message: "stats array is required" });
  }

  try {
    let updatedCount = 0;

    for (const s of stats) {
      if (!s.apiPlayerId) continue;

      await Player.findOneAndUpdate(
        { apiPlayerId: s.apiPlayerId },
        {
          $set: {
            "stats.goals":        s.goals        ?? 0,
            "stats.assists":      s.assists       ?? 0,
            "stats.appearances":  s.appearances   ?? 0,
            "stats.minutesPlayed":s.minutesPlayed ?? 0,
            "stats.yellowCards":  s.yellowCards   ?? 0,
            "stats.redCards":     s.redCards      ?? 0,
            "stats.shotsOnTarget":s.shotsOnTarget ?? 0,
          },
        }
      );
      updatedCount++;
    }

    res.json({ message: `Updated stats for ${updatedCount} players` });

  } catch (error) {
    console.error("sync-player-stats error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/admin/teams/:id/group ──────────────────────
// Admin or mod: manually assign a team to a group.
// Useful before the official group draw is available via API.
router.put("/teams/:id/group", ...adminOrMod, async (req, res) => {
  const { group } = req.body;
  if (!group) return res.status(400).json({ message: "group is required" });

  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $set: { group: group.toUpperCase() } },
      { new: true }
    );
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ message: `${team.name} assigned to Group ${group.toUpperCase()}`, team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/admin/sync-status ──────────────────────────
// Returns a quick summary of how many teams/players are in the DB.
// Useful to verify the sync ran correctly.
router.get("/sync-status", piAuth, async (req, res) => {
  try {
    const [teamCount, playerCount] = await Promise.all([
      Team.countDocuments(),
      Player.countDocuments(),
    ]);
    res.json({
      message: "DB sync status",
      teams:   teamCount,
      players: playerCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/admin/reset-stats ─────────────────────────────
// Admin only. Zeros all player stats and match scores.
// Use ONLY before the tournament starts to clear phantom data.
router.post("/reset-stats", ...adminOnly, async (req, res) => {
  try {
    const Match = require("../models/Match");

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

    // Zero all match scores and clear goal/card events
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
        },
      }
    );

    res.json({
      message: "All stats and scores reset to zero",
      playersReset: playerResult.modifiedCount,
      matchesReset: matchResult.modifiedCount,
    });
  } catch (error) {
    console.error("reset-stats error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/admin/dedup-players ───────────────────────────
// Admin only. Removes duplicate player documents (same name + team).
// Keeps the document with the most data (highest stats sum, or latest updatedAt).
router.post("/dedup-players", ...adminOnly, async (req, res) => {
  try {
    // Find all players grouped by name (case-insensitive) + team
    const duplicates = await Player.aggregate([
      {
        $group: {
          _id: {
            nameLower: { $toLower: "$name" },
            team: "$team",
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          statsSums: { $push: { $add: [{ $ifNull: ["$stats.goals", 0] }, { $ifNull: ["$stats.assists", 0] }] } },
          updatedAts: { $push: "$updatedAt" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    let deletedCount = 0;

    for (const dup of duplicates) {
      const { ids, statsSums, updatedAts } = dup;

      // Pick the "best" record: highest stats sum, or if equal, most recently updated
      let bestIdx = 0;
      for (let i = 1; i < ids.length; i++) {
        if (
          statsSums[i] > statsSums[bestIdx] ||
          (statsSums[i] === statsSums[bestIdx] && new Date(updatedAts[i]) > new Date(updatedAts[bestIdx]))
        ) {
          bestIdx = i;
        }
      }

      // Delete all except the best
      const toDelete = ids.filter((_, i) => i !== bestIdx);
      await Player.deleteMany({ _id: { $in: toDelete } });
      deletedCount += toDelete.length;
    }

    res.json({
      message: `Dedup complete. Removed ${deletedCount} duplicate player records.`,
      duplicateGroupsFound: duplicates.length,
      deletedCount,
    });
  } catch (error) {
    console.error("dedup-players error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/admin/reset-stats ─────────────────────────
// Admin only: Zero all player stats and scheduled match scores.
// Run this BEFORE the tournament starts (June 11).
// After the tournament begins, DO NOT run this — stats are real.
router.post("/reset-stats", ...adminOnly, async (req, res) => {
  try {
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

    // Zero match scores for scheduled (not-yet-played) matches only
    const matchResult = await Match.updateMany(
      { status: { $in: ["scheduled", "live"] } },
      {
        $set: {
          "score.home": 0,
          "score.away": 0,
          goals:        [],
          cards:        [],
          minute:       null,
        },
      }
    );

    console.log(`[Admin] reset-stats: ${playerResult.modifiedCount} players zeroed, ${matchResult.modifiedCount} match scores reset.`);
    res.json({
      message: `Stats reset complete. ${playerResult.modifiedCount} players zeroed, ${matchResult.modifiedCount} match scores cleared.`,
      players: playerResult.modifiedCount,
      matches: matchResult.modifiedCount,
    });
  } catch (error) {
    console.error("reset-stats error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/admin/dedup-players ───────────────────────
// Admin only: Remove duplicate player documents.
// Groups players by name (case-insensitive) + team.
// Keeps the document with the most data (apiPlayerId or photoUrl),
// deletes all other duplicates.
router.post("/dedup-players", ...adminOnly, async (req, res) => {
  try {
    // Aggregate duplicates: group by lowercased name + team
    const duplicates = await Player.aggregate([
      {
        $group: {
          _id: {
            name: { $toLower: "$name" },
            team: "$team",
          },
          docs: { $push: { _id: "$_id", apiPlayerId: "$apiPlayerId", photoUrl: "$photoUrl", starRating: "$starRating" } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (!duplicates.length) {
      return res.json({ message: "No duplicate players found.", removed: 0, groups: 0 });
    }

    let totalRemoved = 0;
    for (const group of duplicates) {
      const docs = group.docs;

      // Score each doc — prefer the one with apiPlayerId, then photoUrl, then higher starRating
      const scored = docs.map((d) => ({
        ...d,
        score:
          (d.apiPlayerId ? 100 : 0) +
          (d.photoUrl ? 50 : 0) +
          (d.starRating || 0),
      }));
      scored.sort((a, b) => b.score - a.score);

      // Keep the best one, delete the rest
      const toDelete = scored.slice(1).map((d) => d._id);
      if (toDelete.length) {
        await Player.deleteMany({ _id: { $in: toDelete } });
        totalRemoved += toDelete.length;
      }
    }

    console.log(`[Admin] dedup-players: removed ${totalRemoved} duplicates across ${duplicates.length} groups.`);
    res.json({
      message: `Dedup complete. Removed ${totalRemoved} duplicate player(s) across ${duplicates.length} group(s).`,
      removed: totalRemoved,
      groups:  duplicates.length,
    });
  } catch (error) {
    console.error("dedup-players error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
