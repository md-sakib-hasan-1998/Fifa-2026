const mongoose = require("mongoose");

// ─── Individual goal event ────────────────────────────────
const goalEventSchema = new mongoose.Schema(
  {
    minute: { type: Number },
    team: { type: String },           // 'home' or 'away'
    playerName: { type: String },
    type: {
      type: String,
      enum: ["goal", "own_goal", "penalty"],
      default: "goal",
    },
  },
  { _id: false }
);

// ─── Card event (yellow/red) ──────────────────────────────
const cardEventSchema = new mongoose.Schema(
  {
    minute: { type: Number },
    team: { type: String },
    playerName: { type: String },
    cardType: { type: String, enum: ["yellow", "red", "yellow_red"] },
  },
  { _id: false }
);

// ─── Main match schema ────────────────────────────────────
const matchSchema = new mongoose.Schema(
  {
    // External ID from the sports API (used to deduplicate updates)
    apiMatchId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Stage ─────────────────────────────────────────────
    stage: {
      type: String,
      enum: [
        "Group Stage",
        "Round of 32",
        "Round of 16",
        "Quarter-final",
        "Semi-final",
        "Third Place",
        "Final",
      ],
      required: true,
    },

    group: {
      type: String, // e.g. "A", "B", ... only for group stage
      default: null,
    },

    matchday: { type: Number, default: null }, // 1, 2, or 3 for group stage

    // ─── Teams ─────────────────────────────────────────────
    homeTeam: {
      name: { type: String, required: true },
      shortName: { type: String }, // e.g. "BRA"
      logoUrl: { type: String },   // official team logo URL
      apiTeamId: { type: String }, // ID from sports API
    },

    awayTeam: {
      name: { type: String, required: true },
      shortName: { type: String },
      logoUrl: { type: String },
      apiTeamId: { type: String },
    },

    // ─── Score ─────────────────────────────────────────────
    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
      // Penalty scores (only if match went to penalties)
      homePenalty: { type: Number, default: null },
      awayPenalty: { type: Number, default: null },
    },

    // ─── Status ────────────────────────────────────────────
    // 'scheduled'  → not started yet
    // 'live'       → currently being played
    // 'halftime'   → half time break
    // 'finished'   → full time
    // 'postponed'  → postponed
    status: {
      type: String,
      enum: ["scheduled", "live", "halftime", "finished", "postponed"],
      default: "scheduled",
    },

    // Current minute of the match (only relevant when status = 'live')
    minute: { type: Number, default: null },

    // ─── Timing ────────────────────────────────────────────
    kickoffTime: { type: Date, required: true },
    venue: { type: String, default: null },
    city: { type: String, default: null },

    // ─── Match events ──────────────────────────────────────
    goals: [goalEventSchema],
    cards: [cardEventSchema],

    // Lineups & Formations (Home/Away)
    lineups: {
      home: {
        formation: { type: String, default: "4-3-3" },
        startingXI: [{
          name: { type: String },
          jerseyNumber: { type: Number },
          position: { type: String },
          photoUrl: { type: String, default: null }
        }],
        bench: [{
          name: { type: String },
          jerseyNumber: { type: Number },
          position: { type: String, default: null }
        }]
      },
      away: {
        formation: { type: String, default: "4-3-3" },
        startingXI: [{
          name: { type: String },
          jerseyNumber: { type: Number },
          position: { type: String },
          photoUrl: { type: String, default: null }
        }],
        bench: [{
          name: { type: String },
          jerseyNumber: { type: Number },
          position: { type: String },
          photoUrl: { type: String, default: null }
        }]
      }
    },

    substitutions: [{
      minute: { type: Number },
      team: { type: String }, // 'home' or 'away'
      playerOut: { type: String },
      playerIn: { type: String }
    }],

    penalties: [{
      order: { type: Number },
      team: { type: String }, // 'home' or 'away'
      playerName: { type: String },
      scored: { type: Boolean }
    }],

    // ─── Stream link ───────────────────────────────────────
    // Admin or moderator posts the live stream URL here
    streamLink: {
      url: { type: String, default: null },
      postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      postedAt: { type: Date, default: null },
    },

    // ─── Last synced from API ───────────────────────────────
    lastSyncedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries by status (live scores page)
matchSchema.index({ status: 1 });
matchSchema.index({ kickoffTime: 1 });

module.exports = mongoose.model("Match", matchSchema);
