const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const { protect, authorize, piAuth } = require("../middleware/authMiddleware");

// ─── GET /api/matches ─────────────────────────────────────
// Public. Returns all matches with optional filters.
router.get("/", async (req, res) => {
  try {
    const { status, stage, group, team } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (stage)  filter.stage  = stage;
    if (group)  filter.group  = group;

    // If ?team=<mongoId>, look up the team's apiTeamId and filter by that
    if (team) {
      try {
        const Team = require("../models/Team");
        const teamDoc = await Team.findById(team);
        if (teamDoc) {
          filter.$or = [
            { "homeTeam.apiTeamId": teamDoc.apiTeamId },
            { "awayTeam.apiTeamId": teamDoc.apiTeamId },
            { "homeTeam.name":      teamDoc.name },
            { "awayTeam.name":      teamDoc.name },
          ];
        }
      } catch (e) { /* invalid id — ignore */ }
    }

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

    // If the user is not logged in, hide the stream links
    const matchData = match.toObject();
    const isAuthenticated = req.headers.authorization ? true : false;
    if (!isAuthenticated && matchData.streamLinks) {
      matchData.streamLinks = [];
    }

    res.json({ match: matchData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/matches/:id/stream ──────────────────────────
// Admin or mod only. Replaces the full streamLinks array.
// Body: { links: [{ label: "Link 1", url: "https://..." }, ...] }
router.put(
  "/:id/stream",
  protect,
  authorize("admin", "moderator"),
  async (req, res) => {
    try {
      const { links } = req.body; // array of { label, url }
      const match = await Match.findById(req.params.id);
      if (!match) return res.status(404).json({ message: "Match not found" });

      // Build validated link array (remove empty URLs)
      const now = new Date();
      match.streamLinks = (Array.isArray(links) ? links : [])
        .filter((l) => l.url && l.url.trim())
        .map((l, i) => ({
          label:    (l.label && l.label.trim()) || `Link ${i + 1}`,
          url:      l.url.trim(),
          postedBy: req.user._id,
          postedAt: now,
        }));

      await match.save();

      // Emit real-time update to all connected clients
      const io = req.app.get("io");
      io.emit("streamLinkUpdated", {
        matchId:  match._id,
        hasLinks: match.streamLinks.length > 0,
      });

      res.json({
        message: match.streamLinks.length ? "Stream links updated" : "Stream links cleared",
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

    // Run match enrichment to ensure lineups, subs, and shootout details are present
    try {
      const { enrichMatch } = require("../utils/matchEnricher");
      const isModified = await enrichMatch(match);
      if (isModified) {
        await match.save();
      }
    } catch (enrichErr) {
      console.error("[Pi Update] Match enrichment error:", enrichErr.message);
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
