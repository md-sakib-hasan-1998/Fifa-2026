const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Verify JWT and attach user to req ───────────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Block banned users immediately
    if (req.user.status === "banned") {
      return res.status(403).json({ message: "Your account has been banned" });
    }

    // Block pending users from accessing protected routes
    if (req.user.status === "pending") {
      return res.status(403).json({
        message: "Your account is pending approval by an admin or moderator",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// ─── Role guard factory ───────────────────────────────────
// Usage: authorize("admin") or authorize("admin", "moderator")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not allowed to access this route`,
      });
    }
    next();
  };
};

// ─── Pi fetcher secret guard ──────────────────────────────
// Used on the /api/pi/update route so only your Pi can post updates
const piAuth = (req, res, next) => {
  const secret = req.headers["x-pi-secret"];
  if (!secret || secret !== process.env.PI_SECRET) {
    return res.status(401).json({ message: "Unauthorized Pi request" });
  }
  next();
};

module.exports = { protect, authorize, piAuth };
