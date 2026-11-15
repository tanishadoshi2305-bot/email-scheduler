const express = require("express");
const cors = require("cors");
const prisma = require("./config/prisma");
const { queueConnection } = require("./queue/emailQueue");
const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/emails");

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPong = await queueConnection.ping();
    return res.status(200).json({
      status: "ok",
      database: "connected",
      redis: redisPong === "PONG" ? "connected" : redisPong,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: "degraded",
      error: err.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  return res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;
