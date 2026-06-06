require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const { setupSocket } = require("./socket/socketHandler");

// ─── Routes ──────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const matchRoutes = require("./routes/matches");
const teamPlayerRoutes = require("./routes/teamsPlayers");

// ─── Connect to MongoDB ──────────────────────────────────
connectDB();

const app = express();
const server = http.createServer(app);

// Allow localhost for dev + any CLIENT_URL(s) set in environment
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];
// CLIENT_URL can be a single URL or comma-separated list e.g.
// "https://fifa-2026-frontend-oc9s.onrender.com"
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach((u) =>
    allowedOrigins.push(u.trim())
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

// ─── Socket.io setup ─────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible in all route handlers via req.app.get("io")
app.set("io", io);
setupSocket(io);

// ─── Middleware ──────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());

// ─── API Routes ──────────────────────────────────────────
const syncRoutes = require("./routes/sync");
app.use("/api/auth",    authRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/teams",   teamPlayerRoutes);
app.use("/api/sync",    syncRoutes);   // Render cron job hits this

// ─── Health check ────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FIFA 2026 API is running" });
});

// ─── 404 handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// ─── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 FIFA 2026 server running on port ${PORT}`);
  console.log(`🌍 Accepting requests from: ${process.env.CLIENT_URL}`);
});
