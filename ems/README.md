# Meridian — Employee Management System

Editorial, dark-mode-first Employee Management System with JWT auth, role-based access control, employee CRUD, organizational hierarchy, and dashboards. Deployable to Netlify with zero configuration and no external API keys.

## Tech Stack

- **Frontend:** React 18 · TypeScript · Vite · TailwindCSS · React Router · Recharts
- **Backend:** Node.js · Express.js
- **Database:** SQLite via `better-sqlite3` (file for local dev, in-memory for serverless)
- **Auth:** JWT + bcrypt
- **Deploy:** Netlify (static frontend + serverless function wrapping Express)

No API keys. No paid services. No external DB required.

---

## Project Structure

```
meridian/
├── backend/                  # Express app, DB, routes, tests
│   └── src/
│       ├── app.js            # exports the express app
│       ├── server.js         # local dev entry (listens on :5000)
│       ├── db.js             # SQLite + auto-seed on empty
│       ├── routes/           # auth, employees, organization, dashboard
│       ├── middleware/       # auth, RBAC
│       ├── utils/            # auth, hierarchy, validation (+ tests)
│       └── seed/seed.js      # reset & seed local DB
├── frontend/                 # React + Vite SPA
├── netlify/functions/api.js  # serverless wrapper around backend/src/app.js
├── netlify.toml              # build + redirect config
├── package.json              # root deps (used to bundle the function)
└── README.md
```

---

## Local Development

### 1. Backend

```bash
cd backend
npm install
npm run seed     # creates ems.db and seeds demo users
npm run dev      # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:5000`.

---

## Demo Credentials

| Role         | Email                | Password    |
|--------------|----------------------|-------------|
| Super Admin  | admin@ems.local      | admin123    |
| HR Manager   | hr@ems.local         | hr123       |
| Employee     | employee@ems.local   | employee123 |

---

## Deploy to Netlify

The project is Netlify-ready — drag-and-drop or CLI.

### Option A — CLI

```bash
npm install -g netlify-cli
netlify init      # link to a new Netlify site
netlify deploy --build --prod
```

### Option B — Git

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → pick this repo**.
3. Netlify auto-detects `netlify.toml` — no manual settings needed.
4. Deploy.

### How it works on Netlify

- `netlify.toml` builds the frontend and publishes `frontend/dist`.
- `netlify/functions/api.js` wraps the Express app with `serverless-http`.
- Redirect `/api/*` → `/.netlify/functions/api/api/:splat` routes API calls to the function.
- The function uses **in-memory SQLite** seeded on cold start — so demo data is always fresh, but writes will not persist across cold starts on Netlify's free tier. For production, swap `db.js` to point at a hosted Postgres/SQLite (e.g. Turso, Neon) — no other code changes required.

### Optional env vars

Set in Netlify Site settings → Environment:

- `JWT_SECRET` — override the default JWT secret (recommended for production)

---

## API Endpoints

All non-auth endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint                              | Roles                | Purpose                             |
|--------|---------------------------------------|----------------------|-------------------------------------|
| POST   | `/api/auth/login`                     | public               | Login, returns JWT                  |
| POST   | `/api/auth/logout`                    | any                  | Client-side token discard           |
| GET    | `/api/auth/me`                        | any                  | Current user                        |
| GET    | `/api/employees`                      | Super Admin, HR      | List (search/filter/sort/paginate)  |
| GET    | `/api/employees/:id`                  | self / admin / HR    | Single employee                     |
| POST   | `/api/employees`                      | Super Admin, HR      | Create                              |
| PUT    | `/api/employees/:id`                  | Super Admin, HR, Self| Update (role-limited fields)        |
| DELETE | `/api/employees/:id`                  | Super Admin          | Soft delete                         |
| GET    | `/api/employees/:id/reportees`        | Super Admin, HR      | Direct reports                      |
| PATCH  | `/api/employees/:id/manager`          | Super Admin, HR      | Assign reporting manager            |
| GET    | `/api/organization/tree`              | Super Admin, HR      | Full org tree                       |
| GET    | `/api/dashboard/stats`                | Super Admin, HR      | Dashboard counters + charts data    |
| GET    | `/api/health`                         | public               | Health check                        |

### Query Parameters — `GET /api/employees`

`?search=&department=&role=&status=&sortBy=name|joiningDate&order=asc|desc&page=1&pageSize=10`

### Sample cURL

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ems.local","password":"admin123"}'
```

---

## Features

**Authentication** — email/password login, JWT (7-day expiry), bcrypt password hashing, protected routes on both client and server.

**RBAC** — three roles enforced in the API and reflected in the UI:
- **Super Admin** — full CRUD, may assign any role, may delete
- **HR Manager** — create / edit / view; cannot delete; cannot assign or modify Super Admin
- **Employee** — read + edit own profile only (phone, profile image)

**Dashboard** — total / active / inactive headcount, department count, distribution chart, role composition pie.

**Employee management** — CRUD (soft delete), search by name/email, filter by department/role/status, sort by name or joining date, paginated list.

**Organizational hierarchy** — assign reporting manager, tree view, direct-reports lookup, **circular-reporting prevention** at the API layer.

**Validation** — Zod-style checks on the client and server: email format, phone format, non-negative salary, required fields, role/status enums, unique email + employee code.

---

## Testing

```bash
cd backend && npm test
```

Runs unit tests for:
- Password hashing / verification
- JWT sign / verify roundtrip
- Circular-reporting detection (self, transitive, valid)

---

## Design

**Meridian** uses an editorial, dark-mode aesthetic:
- Type — Instrument Serif (display) + Inter (body) + JetBrains Mono (metadata)
- Color — deep charcoal-green background with an emerald accent and a warm ochre secondary
- Density — generous whitespace, quiet dividers, deliberate hierarchy

The design system is defined once in `frontend/src/index.css` via CSS custom properties, so every surface pulls from the same tokens.

---

## Notes

- Soft delete is used for employees (status set to `Inactive`), preserving audit history.
- Circular reporting is enforced by walking the manager chain of the proposed manager before assignment (`backend/src/utils/hierarchy.js`).
- The default `JWT_SECRET` **must** be replaced in production.
- No brand names or vendor lock-in in the source — swap the DB layer or hosting freely.
