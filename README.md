# Store POC — VMG Industries

Design POC for the Store department: inventory, stock in/out, material requests, and low-stock alerts.

## Stack
- **Frontend**: React + MUI (Vite) — navy/orange VMG-inspired theme
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (managed via pgAdmin)

## Structure
```
Store POC/
├── backend/     Express API (routes, db pool, config)
├── frontend/    React + MUI app (pages, components, theme)
└── db/          PostgreSQL schema + seed data (run via pgAdmin or psql)
```

## Setup — Docker (recommended)

Runs Postgres, pgAdmin, backend, and frontend in containers. Schema + seed data load automatically on first Postgres start.

```
docker compose up -d --build
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:4000/api/health
- pgAdmin: http://localhost:5050 (login `admin@test.com` / `admin123`) — the "Store POC - Postgres" server is pre-registered (password when prompted: `postgres`)
- Postgres (for external tools): `localhost:5432`, db `store_poc`, user `postgres` / `postgres`

Stop with `docker compose down` (add `-v` to also wipe the database volume).

## Test accounts (app login)

All seeded users share the password `Password@123`:

| Role | Email |
|---|---|
| Admin | admin@test.com |
| Store Manager | storemanager@test.com |
| Store Executive | storeexec@test.com |
| Purchase | purchase@test.com |
| Quality | quality@test.com |
| Production | production@test.com |

## Setup — Manual (no Docker)

### 1. Database
Open pgAdmin, create a database `store_poc`, then run `db/schema.sql` followed by `db/seed.sql` in the Query Tool.

### 2. Backend
```
cd backend
npm install
copy .env.example .env   # fill in your pgAdmin/Postgres connection details
npm run dev
```
Runs on http://localhost:4000

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Scope (POC)
Implements 8 of the SOP's 13 modules: Material Receiving & Inspection (GRN), Material Issue, Inventory (incl.
valuation), Rejected Material, Housekeeping, Safety & Compliance, User Roles, and a Dashboard. See
[`specs/001-store-department-poc/`](specs/001-store-department-poc/) for the full specification, architecture
plan, and task/gap tracking (built with [GitHub Spec Kit](https://github.com/github/spec-kit)).
