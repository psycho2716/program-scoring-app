# Mr. and Miss Katimugan — Live Pageant Scoring System

Local-network live scoring app for pageant judges and the Tabulator (admin). Built with **Next.js**, **Express**, **Socket.io**, and **MySQL (WAMP)**.

## Features

- **7 judges** score **8 candidates** across **6 weighted categories** (raw scores 1–10)
- **Tabulator panel** broadcasts active categories, monitors submission matrix, views auto-calculated standings
- **Real-time updates** via Socket.io (category changes, score progress, submissions)
- **Excel export** of full results workbook (Candidates, RawScores, Tabulation, Meta sheets)
- **Katimugan scoring formula**: `category_weighted = (avg_raw / 10) × weight%`, final score out of 100

## Project Structure

```
program-scoring-app/
├── backend/          Express + Socket.io API (port 4000)
├── frontend/         Next.js UI (port 3000)
├── backend/schema.sql
└── .env.example
```

## Prerequisites

- Node.js 18+
- WAMP (MySQL running on port 3306)
- Windows Firewall access for LAN devices (ports 3000 and 4000)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

Copy settings from `.env.example`:

**`backend/.env`**
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pageant_scoring
JWT_SECRET=your-long-random-secret
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 3. Create the database

Using phpMyAdmin or MySQL CLI, import:

```
backend/schema.sql
```

This creates all tables and seed data:
- Judges: `judge1` … `judge7` (display names prefilled for the Katimugan panel)
- Tabulator: `admin`
- Default password for all accounts: **`password123`**
- Admin can change judge passwords anytime under **Overview → Judge Accounts**

### 4. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## LAN Access (Judge Tablets)

Judges on the same Wi-Fi can open the app at `http://<your-pc-lan-ip>:3000` (e.g. `http://10.0.0.39:3000`). Use the **Wi-Fi / Ethernet** address from `ipconfig`, not Tailscale or VPN IPs unless the tablet uses the same VPN.

### Quick setup

1. **Start the app** from the project root:
   ```bash
   npm run dev
   ```
   This prints LAN URLs when the frontend starts.

2. **Allow Windows Firewall** (required once, run PowerShell **as Administrator**):
   ```powershell
   npm run lan:firewall
   ```
   This creates/updates inbound allow rules for ports **3000** and **4000** on Domain, Private, and Public profiles. Only port **3000** is required for judges when using the built-in API proxy; 4000 is for direct API access during debugging.

3. **On each judge tablet**, open the printed URL (same network as the host PC).

No manual `NEXT_PUBLIC_API_URL` changes are needed for LAN: the frontend proxies `/api`, `/uploads`, and `/socket.io` through port 3000 when opened via a LAN IP.

### Optional: direct backend URL

If you prefer tablets to call the API on port 4000 directly, set in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:4000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.100:4000
```
And ensure port 4000 is allowed through the firewall.

## Scoring Categories

| Category | Weight |
|----------|--------|
| Production Number | 10% |
| Advocacy Speech | 15% |
| School Uniform | 10% |
| Talent | 20% |
| ASEAN Attire | 20% |
| Question & Answer | 25% |

## Usage Flow

1. **Tabulator (`admin`)** logs in → selects category → **Broadcast to Judges** → **Open Scoring**
2. **Judges** score all 8 candidates (1–10) → **Submit Category Scores** → waiting screen
3. **Tabulator** monitors the 7×8 submission matrix in real time
4. Repeat for all 6 categories
5. **Tabulator** views standings / winner and clicks **Export to Excel**

## API Endpoints

| Method | Route | Role |
|--------|-------|------|
| POST | `/api/auth/login` | public |
| GET | `/api/state` | any |
| PUT | `/api/state` | admin |
| GET | `/api/scores/active` | judge |
| PUT | `/api/scores/:candidateId` | judge |
| POST | `/api/scores/submit` | judge |
| GET | `/api/tabulation` | admin |
| GET | `/api/tabulation/export` | admin |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend (prints LAN URLs) |
| `npm run dev:backend` | Express API only |
| `npm run dev:frontend` | Next.js UI only |
| `npm run lan:firewall` | Open Windows Firewall ports 3000/4000 (run as Admin) |
| `npm run build` | Production build |

## Troubleshooting

- **Database connection failed**: Ensure WAMP MySQL is running and credentials in `backend/.env` match
- **Judges can't connect on LAN**: Run `scripts/open-lan-firewall.ps1` as Admin; use Wi-Fi IP from `ipconfig` (e.g. `10.0.0.x`), not VPN/Tailscale; ensure `npm run dev` is running on the host
- **Socket not updating**: Confirm `NEXT_PUBLIC_SOCKET_URL` uses LAN IP, not `localhost`, on judge devices
- **Login fails**: Re-import `schema.sql` to reset seed accounts
