// ─── Socket.io handler ───────────────────────────────────
// Called once from server.js when the Socket.io server is ready.
// Manages client connections and real-time event broadcasting.

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ─── Client joins a match room ────────────────────────
    // The frontend calls socket.emit('joinMatch', matchId)
    // so it only receives events for that specific match.
    socket.on("joinMatch", (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`Client ${socket.id} joined room: match:${matchId}`);
    });

    socket.on("leaveMatch", (matchId) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

// ─── Broadcast helpers (called from routes) ──────────────
// These are convenience wrappers used in match routes.

// Broadcast score update to everyone in a match room
const broadcastScoreUpdate = (io, matchId, data) => {
  io.to(`match:${matchId}`).emit("scoreUpdate", data);
  // Also broadcast globally so the home scoreboard updates too
  io.emit("scoreUpdateGlobal", { matchId, ...data });
};

// Broadcast stream link change to everyone
const broadcastStreamLink = (io, matchId, hasLink) => {
  io.emit("streamLinkUpdated", { matchId, hasLink });
};

module.exports = { setupSocket, broadcastScoreUpdate, broadcastStreamLink };
