const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never returned in queries unless explicitly asked
    },

    // ─── Role ──────────────────────────────────────────────
    // 'admin'     → 1 only, set by seedAdmin script
    // 'moderator' → promoted by admin
    // 'user'      → default after signup
    role: {
      type: String,
      enum: ["admin", "moderator", "user"],
      default: "user",
    },

    // ─── Account status ────────────────────────────────────
    // 'pending'  → just signed up, waiting for admin/mod approval
    // 'approved' → can log in and use the site
    // 'banned'   → blocked by admin or moderator
    status: {
      type: String,
      enum: ["pending", "approved", "banned"],
      default: "pending",
    },

    // Who approved or banned this user (stored for audit trail)
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    bannedReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ─── Hash password before saving ─────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if password was changed or is new
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare password on login ──────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Virtual: safe public profile (no password) ──────────
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    country: this.country,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
