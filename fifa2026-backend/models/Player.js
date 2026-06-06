const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    apiPlayerId: { type: String, unique: true, sparse: true },

    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true }, // display name on cards

    // Which team they play for in this tournament
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    teamName: { type: String }, // denormalized for fast queries

    photoUrl: { type: String, default: null },

    nationality: { type: String },
    dateOfBirth: { type: Date, default: null },
    age: { type: Number, default: null },

    position: {
      type: String,
      enum: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
      required: true,
    },

    jerseyNumber: { type: Number, default: null },

    // ─── Star rating (1–5) ─────────────────────────────────
    // Set/updated by admin or moderator
    starRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    // ─── Tournament stats (updated by Pi fetcher) ──────────
    stats: {
      goals: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      appearances: { type: Number, default: 0 },
      minutesPlayed: { type: Number, default: 0 },
      yellowCards: { type: Number, default: 0 },
      redCards: { type: Number, default: 0 },
      shotsOnTarget: { type: Number, default: 0 },
      passAccuracy: { type: Number, default: null }, // percentage
    },

    // Is this player still in the tournament (team not eliminated)?
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for top scorers / top assists leaderboards
playerSchema.index({ "stats.goals": -1 });
playerSchema.index({ "stats.assists": -1 });
playerSchema.index({ team: 1 });

module.exports = mongoose.model("Player", playerSchema);
