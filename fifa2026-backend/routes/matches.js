const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const { protect, authorize, piAuth } = require("../middleware/authMiddleware");

// ─── GET /api/matches ─────────────────────────────────────
// Public. Returns all matches with optional filters.
router.get("/", async (req, res) => {
  try {
    const { status, stage, group } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (stage) filter.stage = stage;
    if (group) filter.group = group;

    const matches = await Match.find(filter)
      .sort({ kickoffTime: 1 })
      .populate("streamLink.postedBy", "name role");

    res.json({ matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/matches/live ────────────────────────────────
// Public. Returns only currently live matches.
router.get("/live", async (req, res) => {
  try {
    const matches = await Match.find({ status: "live" })
      .sort({ kickoffTime: 1 });
    res.json({ matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/matches/:id ─────────────────────────────────
// Public. Returns a single match by its MongoDB _id.
router.get("/:id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("streamLink.postedBy", "name role");

    if (!match) return res.status(404).json({ message: "Match not found" });

    // If the user is not logged in, hide the stream link URL
    const matchData = match.toObject();
    const isAuthenticated = req.headers.authorization ? true : false;
    if (!isAuthenticated && matchData.streamLink) {
      matchData.streamLink.url = null;
    }

    res.json({ match: matchData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/matches/:id/stream ──────────────────────────
// Admin or mod only. Posts or updates the live stream link.
router.put(
  "/:id/stream",
  protect,
  authorize("admin", "moderator"),
  async (req, res) => {
    try {
      const { url } = req.body;
      const match = await Match.findById(req.params.id);
      if (!match) return res.status(404).json({ message: "Match not found" });

      match.streamLink = {
        url: url || null,
        postedBy: url ? req.user._id : null,
        postedAt: url ? new Date() : null,
      };

      await match.save();

      // Emit real-time update to all connected clients
      const io = req.app.get("io");
      io.emit("streamLinkUpdated", {
        matchId: match._id,
        hasLink: !!url,
      });

      res.json({
        message: url ? "Stream link updated" : "Stream link removed",
        match,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

const { broadcastScoreUpdate } = require("../socket/socketHandler");

// ─── POST /api/matches/pi/update ─────────────────────────
// Pi fetcher only (protected by x-pi-secret header).
// This is how your Raspberry Pi pushes live score updates.
router.post("/pi/update", piAuth, async (req, res) => {
  try {
    const { apiMatchId, score, status, minute, goals, cards } = req.body;

    if (!apiMatchId) {
      return res.status(400).json({ message: "apiMatchId is required" });
    }

    const match = await Match.findOneAndUpdate(
      { apiMatchId },
      {
        $set: {
          score: score || {},
          status: status || "live",
          minute: minute || null,
          goals: goals || [],
          cards: cards || [],
          lastSyncedAt: new Date(),
        },
      },
      { new: true, upsert: false }
    );

    if (!match) {
      return res.status(404).json({ message: `No match found with apiMatchId: ${apiMatchId}` });
    }

    // Broadcast the update to every connected browser via Socket.io room and global events
    const io = req.app.get("io");
    broadcastScoreUpdate(io, match._id, {
      matchId: match._id,
      apiMatchId: match.apiMatchId,
      score: match.score,
      status: match.status,
      minute: match.minute,
      goals: match.goals,
      cards: match.cards,
    });

    res.json({ message: "Score updated and broadcast", matchId: match._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
