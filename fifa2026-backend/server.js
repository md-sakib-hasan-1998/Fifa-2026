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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// ─── Socket.io setup ─────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Make io accessible in all route handlers via req.app.get("io")
app.set("io", io);
setupSocket(io);

// ─── Middleware ──────────────────────────────────────────
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/teams", teamPlayerRoutes);

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
