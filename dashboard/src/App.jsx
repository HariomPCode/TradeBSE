import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:4000";
const PAGE_SIZE = 10;

function App() {
  const [trades, setTrades] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trades") || "[]");
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch previously pulled trades
  useEffect(() => {
    let cancelled = false;

    async function fetchTrades() {
      try {
        const response = await fetch(`${API_URL}/api/trades`);

        if (!response.ok) {
          throw new Error("Failed to fetch previously pulled trades");
        }

        const data = await response.json();
        const fetchedTrades = Array.isArray(data) ? data : data.trades;

        if (!Array.isArray(fetchedTrades)) {
          throw new Error("Invalid trades response");
        }

        if (!cancelled) {
          setTrades(fetchedTrades);
          localStorage.setItem("trades", JSON.stringify(fetchedTrades));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrades();

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const socket = io(API_URL);

    socket.on("pull:completed", ({ newTrades = [] }) => {
      setTrades((previousTrades) => {
        const existingIds = new Set(
          previousTrades.map((trade) => trade.tradeId),
        );

        const uniqueNewTrades = newTrades.filter(
          (trade) => !existingIds.has(trade.tradeId),
        );

        if (uniqueNewTrades.length === 0) {
          return previousTrades;
        }

        const updatedTrades = [...uniqueNewTrades, ...previousTrades];

        localStorage.setItem("trades", JSON.stringify(updatedTrades));

        return updatedTrades;
      });

      setError("");
    });

    socket.on("pull:failed", ({ message }) => {
      setError(message || "Trade pull failed");
    });

    socket.on("connect_error", () => {
      setError("Unable to connect to the real-time server.");
    });

    return () => socket.disconnect();
  }, []);

  async function startPull() {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/pulls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ delayMs: 5000 }),
      });

      if (!response.ok) {
        throw new Error("Unable to start trade pull");
      }

      const result = await response.json();

      console.log("Pull started:", result.pullId);
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTrades = trades.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Trades Dashboard</h1>

      <button onClick={startPull}>Start Trade Pull</button>

      <p>Total pulled trades: {trades.length}</p>

      {loading && <p>Loading previously pulled trades...</p>}

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && trades.length === 0 && (
        <p>No trades have been pulled yet.</p>
      )}

      {trades.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                marginTop: "16px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Trade ID",
                    "Client",
                    "Symbol",
                    "Quantity",
                    "Price",
                    "Timestamp",
                  ].map((heading) => (
                    <th key={heading} style={headerStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedTrades.map((trade) => (
                  <tr key={trade.tradeId}>
                    <td style={cellStyle}>{trade.tradeId}</td>
                    <td style={cellStyle}>{trade.client}</td>
                    <td style={cellStyle}>{trade.symbol}</td>
                    <td style={cellStyle}>{trade.quantity}</td>
                    <td style={cellStyle}>{trade.price}</td>
                    <td style={cellStyle}>
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => setCurrentPage((page) => page - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>

          <p style={{ textAlign: "center", color: "#666" }}>
            Showing {startIndex + 1}–
            {Math.min(startIndex + PAGE_SIZE, trades.length)} of {trades.length}{" "}
            trades
          </p>
        </>
      )}
    </main>
  );
}

const headerStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left",
};

const cellStyle = {
  border: "1px solid #ccc",
  padding: "10px",
};

export default App;
