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
- Judges: `judge1` … `judge7`
- Tabulator: `admin`
- Default password for all accounts: **`password123`**

### 4. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## LAN Access (Judge Tablets)

1. Find your PC's LAN IP: `ipconfig` → e.g. `192.168.1.100`
2. Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.100:4000
   NEXT_PUBLIC_SOCKET_URL=http://192.168.1.100:4000
   ```
3. Update `backend/.env`:
   ```env
   FRONTEND_URL=http://192.168.1.100:3000
   ```
4. Start Next.js bound to all interfaces:
   ```bash
   cd frontend
   npx next dev -H 0.0.0.0 -p 3000
   ```
5. Allow **ports 3000 and 4000** through Windows Firewall (Private network)
6. Judges open: `http://192.168.1.100:3000`

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
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Express API only |
| `npm run dev:frontend` | Next.js UI only |
| `npm run build` | Production build |

## Troubleshooting

- **Database connection failed**: Ensure WAMP MySQL is running and credentials in `backend/.env` match
- **Judges can't connect on LAN**: Check firewall, IP in env vars, and `HOST=0.0.0.0` on backend
- **Socket not updating**: Confirm `NEXT_PUBLIC_SOCKET_URL` uses LAN IP, not `localhost`, on judge devices
- **Login fails**: Re-import `schema.sql` to reset seed accounts
