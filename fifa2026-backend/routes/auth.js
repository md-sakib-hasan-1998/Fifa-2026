const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// ─── Helper: generate JWT ─────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─── POST /api/auth/register ──────────────────────────────
// Public. Creates a new user with status = 'pending'.
// Admin or moderator must approve before the user can log in.
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, country, password } = req.body;

    if (!name || !email || !phone || !country || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      phone,
      country,
      password,
      role: "user",
      status: "pending",
    });

    res.status(201).json({
      message:
        "Registration successful. Your account is pending approval by an admin or moderator.",
      user: user.toPublicJSON(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
// Public. Returns JWT on success.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Include password field for this query only
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "banned") {
      return res.status(403).json({ message: "Your account has been banned" });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        message: "Your account is pending approval. Please wait for an admin or moderator to approve you.",
      });
    }

    res.json({
      token: generateToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
// Protected. Returns the logged-in user's own profile.
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// ─── PUT /api/auth/change-password ───────────────────────
// Protected. Any logged-in user can change their own password.
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save(); // pre-save hook hashes it automatically

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
