# VidyutOne

EV mobility intelligence platform. This repository is the **technical foundation** for a hackathon MVP. The UI will be implemented later from screenshots — this codebase does not invent a visual design.

VidyutOne has two user experiences on one backend:

1. **Planner / DISCOM web dashboard** — candidate charging sites, stations, demand/grid indicators, and a site recommendation (`BUILD`, `BUILD_IF_MANAGED`, `DONT_BUILD`).
2. **Driver PWA** — nearby chargers, charger details, and booking a charging slot.

Coordinates and scores in `data/` look like Bengaluru but are **demo/simulated**. They are not live infrastructure, demand, or grid measurements.

## Current MVP scope

Included now:

- Project structure for frontend, backend, demo data, and docs
- FastAPI endpoints for health, sites, chargers, and bookings
- Mock JSON dataset (10 candidate sites, 14 chargers)
- Isolated site recommendation engine (weighted score + rule-based recommendation)
- In-memory booking create/get (no payment)
- React Router routes for planner and driver placeholders
- Axios service layer using `VITE_API_BASE_URL`
- SQLAlchemy + PostgreSQL configuration prepared (not required to run the API)
- CORS for local frontend development
- Docker Compose for frontend, backend, and PostGIS-ready Postgres

Intentionally not included yet:

- Polished UI / dashboards
- Authentication
- Real PostgreSQL persistence for API data
- PostGIS spatial queries
- ML, optimization, grid modelling, dynamic pricing, route optimization
- Payments
- Simulation
- Production hardening

## Architecture

```
React (planner + driver routes)
        |
        |  Axios / VITE_API_BASE_URL
        v
FastAPI (/api/...)
        |
        +-- services (mock JSON + in-memory bookings)
        +-- engines/recommendation.py
        +-- SQLAlchemy models (ready, unused by current routes)
        v
PostgreSQL / PostGIS (optional for this MVP)
```

See [docs/architecture.md](docs/architecture.md) for how to swap mock data and UI later.

## Folder structure

```
VidyutOne/
├── frontend/                 React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/       Reusable, unstyled building blocks
│   │   ├── layouts/          Planner and driver shells (easy to restyle)
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── planner/
│   │   │   └── driver/
│   │   ├── services/         Axios API client
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── data/
│   │   └── assets/
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── api/routes/       FastAPI routers
│   │   ├── core/             Settings / env
│   │   ├── database/         SQLAlchemy engine + session
│   │   ├── models/           ORM (PostgreSQL-ready)
│   │   ├── schemas/          Pydantic models
│   │   ├── services/         Business logic (mock-backed)
│   │   ├── engines/          Recommendation placeholder
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── data/                     Simulated demo JSON
├── docs/
├── docker-compose.yml
└── README.md
```

## Install frontend

```bash
cd frontend
copy .env.example .env
npm install
```

On macOS/Linux use `cp .env.example .env`.

## Install backend

Python 3.12+ recommended.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

On macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

PostgreSQL does **not** need to be running for the current mock API.

## Run both locally

Terminal 1 — backend (http://127.0.0.1:8001):

Port 8000 is often blocked or reserved on Windows (`WinError 10013`). Local development uses **8001**.

```bash
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Terminal 2 — frontend (http://localhost:5173):

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 — the home page calls `GET /api/health`.

Optional Docker (Postgres + both apps):

```bash
docker compose up --build
```

## Available API endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Liveness |
| GET | `/api/sites` | Candidate sites + computed recommendation |
| GET | `/api/sites/{site_id}` | Single site |
| GET | `/api/chargers` | Demo chargers |
| GET | `/api/chargers/{charger_id}` | Single charger |
| POST | `/api/bookings` | Create booking (`BOOKED`) |
| GET | `/api/bookings/{booking_id}` | Fetch booking |

Interactive docs: http://127.0.0.1:8001/docs

Example booking body:

```json
{
  "user_id": "user-driver-demo",
  "charger_id": "chg-koramangala-01",
  "slot_time": "2026-08-20T10:30:00+00:00",
  "price": 18.5
}
```

### Recommendation engine (MVP)

`site_score` =

- 40% `demand_score`
- 35% `grid_capacity_score`
- 15% `accessibility_score`
- 10% `charger_gap_score`

Recommendation:

- `BUILD` if demand ≥ 70 and grid ≥ 70
- `BUILD_IF_MANAGED` if demand ≥ 70 and grid ≥ 40
- `DONT_BUILD` otherwise

Logic lives only in `backend/app/engines/` so it can be replaced with ML later.

## Current limitations

- UI is placeholder markup only
- Sites and chargers come from JSON files, not the database
- Bookings are stored in process memory and reset on backend restart
- No auth, payments, notifications, or real-time availability
- MapLibre, Recharts, and Lucide are installed but not visually configured
- Demo coordinates must not be treated as operational data

## Planned future features

- Screenshot-accurate planner dashboard and driver PWA
- PostgreSQL persistence + PostGIS
- Authentication and role-based access (planner vs driver)
- ML / optimization for siting
- Grid modelling and dynamic pricing
- Route optimization
- Payments
- Simulation and richer demand/grid indicators
