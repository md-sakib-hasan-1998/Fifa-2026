const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    apiTeamId: { type: String, unique: true, sparse: true },

    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true }, // e.g. "BRA", "FRA"
    country: { type: String, required: true },

    logoUrl: { type: String, default: null }, // official badge image
    flagUrl: { type: String, default: null }, // country flag image

    // FIFA group assignment (A through L for 48-team WC 2026)
    group: { type: String, default: null },

    // ─── Star rating ───────────────────────────────────────
    // Updated by admin/mod; displayed on team card
    starRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    // ─── Tournament stats (updated live) ───────────────────
    stats: {
      played: { type: Number, default: 0 },
      won: { type: Number, default: 0 },
      drawn: { type: Number, default: 0 },
      lost: { type: Number, default: 0 },
      goalsFor: { type: Number, default: 0 },
      goalsAgainst: { type: Number, default: 0 },
      goalDifference: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },

    // Whether they are still in the tournament
    eliminated: { type: Boolean, default: false },
    eliminatedAt: { type: String, default: null }, // e.g. "Round of 16"

    // Coach name
    coach: { type: String, default: null },

    // FIFA world ranking at time of tournament
    fifaRanking: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Team", teamSchema);
