const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");

const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(cors());

app.use(express.json());

const PORT = 4000;

const BSE_API = "http://localhost:4001";

const pulledTrades = new Map();

const activePulls = new Map();

app.get("/api/trades", (req, res) => {
  res.json([...pulledTrades.values()]);
});

app.post("/api/pulls", (req, res) => {
  const delayMs = Math.max(
    1000,
    Math.min(Number(req.body.delayMs) || 5000, 900000),
  );

  const pullId = `PULL-${Date.now()}`;

  activePulls.set(pullId, "IN_PROGRESS");

  res.status(202).json({
    pullId,
    status: "IN_PROGRESS",
  });

  setTimeout(async () => {
    try {
      const response = await axios.get(`${BSE_API}/getTrades`);
      const newTrades = [];

      for (const trade of response.data.trades) {
        if (!pulledTrades.has(trade.tradeId)) {
          pulledTrades.set(trade.tradeId, trade);
          newTrades.push(trade);
        }
      }

      activePulls.set(pullId, "COMPLETED");

      io.emit("pull:completed", {
        pullId,
        status: "COMPLETED",
        newTrades,
      });
    } catch (error) {
      activePulls.set(pullId, "FAILED");

      io.emit("pull:failed", {
        pullId,
        message: "Failed to fetch trades from Mock BSE API",
      });
    }
  }, delayMs);
});

app.get("/api/pulls/:pullId", (req, res) => {
  const status = activePulls.get(req.params.pullId);

  if (!status) {
    return res.status(404).json({ error: "Pull not found" });
  }

  res.json({ pullId: req.params.pullId, status });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

server.listen(PORT, () => {
  console.log(`Main backend running at http://localhost:${PORT}`);
});
