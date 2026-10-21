# Trade Pull Dashboard

A small trade-pull application with three services:

- **Mock BSE API** (`localhost:4001`): serves seeded trades and simulates a delayed source.
- **Backend API** (`localhost:4000`): starts pull requests, fetches source trades, deduplicates them, and emits completion/failure events over Socket.IO.
- **Dashboard** (`localhost:5173`): displays previously pulled trades and listens for real-time pull events.

## Requirements

- Node.js and npm
- Three terminal windows
- The project dependencies installed in each service directory

## Run locally

Run each service in a separate terminal. The commands below assume each directory contains its own `package.json`.

### 1. Mock BSE API

```bash
cd mock-bse-api
npm install
node server.js
```

The mock API listens on `http://localhost:4001`.

- `GET /getTrades` returns the current mock dataset.
- `POST /pulls?delayMs=5000` starts a simulated source pull.
- `GET /pulls/:pullId` returns the status of a mock pull.

### 2. Backend

```bash
cd backend
npm install
node server.js
```

Use the actual backend entry filename if it differs from `server.js`. The backend listens on `http://localhost:4000` and expects the Mock BSE API at `http://localhost:4001`.

Backend endpoints:

- `GET /api/trades` — returns trades pulled into the backend.
- `POST /api/pulls` — starts a delayed pull. The current dashboard sends `{ "delayMs": 5000 }`.
- `GET /api/pulls/:pullId` — returns the tracked status of a backend pull.

The backend emits these Socket.IO events:

- `pull:completed` — includes `pullId`, `status`, and `newTrades`.
- `pull:failed` — includes a failure message.

### 3. Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open the Vite URL shown in the terminal, expected to be `http://localhost:5173`.

## How to use

1. Start all three services.
2. Open the dashboard.
3. Click **Start Trade Pull**.
4. Existing pulled trades remain displayed while the backend waits for the configured delay.
5. When the backend completes the pull, it emits `pull:completed` and the dashboard adds new trades without a manual page refresh.
6. Use Previous/Next to browse pages of 10 trades.

## Configuration

The code shared for this project uses these local service addresses:

| Service      | Address                 |
| ------------ | ----------------------- |
| Mock BSE API | `http://localhost:4001` |
| Backend      | `http://localhost:4000` |
| Dashboard    | `http://localhost:5173` |

The Mock BSE API's `delayMs` query parameter is clamped to a maximum of 900,000 ms (15 minutes). Its default delay is 5,000 ms. The backend currently uses a default of 5,000 ms and clamps its delay to the same maximum.
