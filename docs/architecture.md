# VidyutOne architecture (MVP)

This document describes the current foundation. Visual design is intentionally
out of scope and will be implemented later from UI screenshots.

## Apps

- `frontend/` — React + TypeScript SPA (planner dashboard + driver PWA routes)
- `backend/` — FastAPI API
- `data/` — simulated Bengaluru demo JSON (not live infrastructure)

Both UIs share one backend.

## Request flow

1. Page or hook calls a function in `frontend/src/services/api.ts`
2. Axios sends the request to `VITE_API_BASE_URL`
3. FastAPI route in `backend/app/api/routes/` delegates to a service
4. Services currently read mock JSON / in-memory bookings
5. Site recommendations are computed in `backend/app/engines/recommendation.py`

## Replacing mock data with PostgreSQL

SQLAlchemy models and session helpers already exist under
`backend/app/models/` and `backend/app/database/`. Swap service implementations
to use `get_db()` when ready. Latitude/longitude are floats so PostGIS geometry
columns can be added later without changing the API contract.

## UI replacement

Pages under `frontend/src/pages/` are placeholders. Layouts, reusable
components, Tailwind `@theme` tokens, and the API/types layer are structured so
screenshot-based UI can replace page markup without rewriting business logic.
