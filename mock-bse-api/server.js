const express = require("express");

const app = express();
app.use(express.json());

const PORT = 4001;

const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO"];

const clients = Array.from({ length: 100 }, (_, i) => `CLIENT${101 + i}`);

let nextTradeId = 100001;

const trades = [];

function generateTrades(count) {
  const newTrades = Array.from({ length: count }, () => {
    const trade = {
      tradeId: `TRD${nextTradeId++}`,
      client: clients[Math.floor(Math.random() * clients.length)],
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      quantity: Math.floor(Math.random() * 100) + 1,
      price: Number((Math.random() * 2000 + 500).toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    return trade;
  });

  trades.push(...newTrades);

  return newTrades;
}

generateTrades(3000);

app.get("/getTrades", (req, res) => {
  res.json({
    count: trades.length,
    trades,
  });
});

const pulls = new Map();

app.post("/pulls", (req, res) => {
  const pullId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const requestedDelay = Number(req.query.delayMs);
  const delayMs = Number.isFinite(requestedDelay)
    ? Math.max(1000, Math.min(requestedDelay, 900000))
    : 5000;

  const startedAt = new Date().toISOString();

  const newTrades = generateTrades(100);

  pulls.set(pullId, {
    status: "IN_PROGRESS",
    startedAt,
    trades: null,
  });

  setTimeout(() => {
    pulls.set(pullId, {
      status: "COMPLETED",
      startedAt,
      trades: newTrades,
    });
  }, delayMs);

  res.status(202).json({
    pullId,
    status: "IN_PROGRESS",
    message: "Pull started",
  });
});

app.get("/pulls/:pullId", (req, res) => {
  const pull = pulls.get(req.params.pullId);

  if (!pull) {
    return res.status(404).json({ error: "Pull not found" });
  }

  res.json({
    pullId: req.params.pullId,
    status: pull.status,
    startedAt: pull.startedAt,
    ...(pull.status === "COMPLETED" && {
      count: pull.trades.length,
      trades: pull.trades,
    }),
  });
});

app.listen(PORT, () => {
  console.log(`Mock BSE API running at http://localhost:${PORT}`);
});
