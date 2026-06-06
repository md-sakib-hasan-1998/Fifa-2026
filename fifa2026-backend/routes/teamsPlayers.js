const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const Player = require("../models/Player");
const { protect, authorize } = require("../middleware/authMiddleware");

// ══════════════════════════════════════════════════
//  TEAM ROUTES
// ══════════════════════════════════════════════════

// ─── GET /api/teams ───────────────────────────────────────
// Public. Returns all teams, optionally filtered by group.
router.get("/", async (req, res) => {
  try {
    const { group } = req.query;
    const filter = group ? { group } : {};
    const teams = await Team.find(filter).sort({ group: 1, "stats.points": -1 });
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/teams/:id ───────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/teams/:id/rating ────────────────────────────
// Admin or mod: update a team's star rating
router.put(
  "/:id/rating",
  protect,
  authorize("admin", "moderator"),
  async (req, res) => {
    try {
      const { starRating } = req.body;
      if (!starRating || starRating < 1 || starRating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const team = await Team.findByIdAndUpdate(
        req.params.id,
        { starRating },
        { new: true }
      );

      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json({ message: "Team rating updated", team });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ══════════════════════════════════════════════════
//  PLAYER ROUTES
// ══════════════════════════════════════════════════

// ─── GET /api/players ─────────────────────────────────────
// Public. Supports ?team=teamId filter.
router.get("/players", async (req, res) => {
  try {
    const { team, position } = req.query;
    const filter = {};
    if (team) filter.team = team;
    if (position) filter.position = position;

    const players = await Player.find(filter)
      .populate("team", "name shortName logoUrl")
      .sort({ "stats.goals": -1 });

    res.json({ players });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/players/top-scorers ────────────────────────
// Public. Returns top 10 goal scorers.
router.get("/players/top-scorers", async (req, res) => {
  try {
    const players = await Player.find({ "stats.goals": { $gt: 0 } })
      .populate("team", "name shortName logoUrl flagUrl")
      .sort({ "stats.goals": -1 })
      .limit(10);

    res.json({ players });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/players/top-assists ────────────────────────
// Public. Returns top 10 assist providers.
router.get("/players/top-assists", async (req, res) => {
  try {
    const players = await Player.find({ "stats.assists": { $gt: 0 } })
      .populate("team", "name shortName logoUrl flagUrl")
      .sort({ "stats.assists": -1 })
      .limit(10);

    res.json({ players });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/players/:id ─────────────────────────────────
router.get("/players/:id", async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate(
      "team",
      "name shortName logoUrl"
    );
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ player });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/players/:id/rating ─────────────────────────
// Admin or mod: update a player's star rating
router.put(
  "/players/:id/rating",
  protect,
  authorize("admin", "moderator"),
  async (req, res) => {
    try {
      const { starRating } = req.body;
      if (!starRating || starRating < 1 || starRating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const player = await Player.findByIdAndUpdate(
        req.params.id,
        { starRating },
        { new: true }
      );

      if (!player) return res.status(404).json({ message: "Player not found" });
      res.json({ message: "Player rating updated", player });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
