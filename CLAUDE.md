# DPMS — Claude Code Project Memory

## Project Overview

A cloud-based Dental Patient Management System for a single-dentist practice. Replaces manual/legacy workflows with an integrated digital solution for patient records, scheduling, clinical charting, and document management.

**Target:** 1 dentist + 1 receptionist, 1,000+ patients, 15–20 appointments/day.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2 (App Router) + TypeScript |
| UI Kit | shadcn/ui (Radix Primitives) + Tailwind CSS v3 |
| Backend | FastAPI (Python 3.11+) + Pydantic v2 |
| ORM | SQLAlchemy 2.x async + asyncpg |
| Database | Neon PostgreSQL |
| File Storage | Cloudflare R2 (S3-compatible, via boto3) |
| Auth | JWT (python-jose) + bcrypt (direct, not via passlib) |
| Migrations | Alembic |
| SMS | Twilio |
| Email | SendGrid |
| Background Jobs | APScheduler (in-process, no Redis) |
| Rate Limiting | SlowAPI |

## Project Structure

```
dental-pms/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # Route handlers (auth, users, patients, appointments,
│   │   │                     #   clinical_notes, treatments, documents,
│   │   │                     #   communications, dashboard, analytics, settings)
│   │   ├── core/             # config.py, database.py, security.py, dependencies.py,
│   │   │                     #   email.py (SendGrid helper), storage.py (Cloudflare R2)
│   │   ├── models/           # SQLAlchemy models (user, patient, appointment,
│   │   │                     #   clinical_note, treatment, document, communication,
│   │   │                     #   password_reset, clinic_settings, procedure)
│   │   ├── schemas/          # Pydantic v2 schemas (auth, user, patient, appointment,
│   │   │                     #   clinical_note, treatment, document, communication, dashboard)
│   │   └── main.py           # FastAPI app, CORS, routers
│   ├── alembic/
│   │   └── versions/001_initial_schema.py   # Full initial migration
│   ├── tests/
│   │   ├── conftest.py           # Env var setup for unit tests (no DB needed)
│   │   ├── test_auth.py          # 12 unit tests for security utilities
│   │   ├── test_patients.py      # 22 unit tests for patient schema validation
│   │   ├── test_appointments.py  # 38 unit tests: FSM, conflict detection, slot calc
│   │   ├── test_clinical.py      # 55 unit tests: FDI validation, SOAP/treatment schemas
│   │   ├── test_documents.py     # 24 unit tests: MIME detection, thumbnail generation
│   │   └── test_dashboard.py     # 9 unit tests: AppointmentCounts + DashboardSummary schemas
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example          # Template — copy to .env and fill in
│   ├── .env                  # Local dev (gitignored)
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/       # Login page (uses AuthContext)
│   │   ├── (auth)/forgot-password/  # Forgot password page
│   │   ├── (auth)/reset-password/   # Reset password page (reads ?token=)
│   │   └── (dashboard)/        # Protected layout + all feature pages
│   │       ├── dashboard/
│   │       ├── patients/[id]/
│   │       ├── appointments/[id]/chart/
│   │       ├── communications/
│   │       ├── reminders/
│   │       ├── settings/
│   │       ├── profile/         # Profile + change password (all roles)
│   │       └── users/           # Staff management (dentist only)
│   ├── components/
│   │   ├── layout/SideNav.tsx          # Role-aware nav, AuthContext logout
│   │   ├── layout/ProtectedLayout.tsx  # Auth guard + loading spinner
│   │   ├── dashboard/DashboardClient.tsx
│   │   ├── ui/               # shadcn/ui primitives: button, input, label, badge,
│   │   │                     #   dialog, alert-dialog, select, textarea, skeleton, card,
│   │   │                     #   tabs, separator, progress
│   │   ├── patients/         # SearchBar.tsx, PatientFormDialog.tsx, DeactivatePatientDialog.tsx
│   │   ├── scheduling/       # StatusBadge, DayViewCalendar, WeekViewCalendar,
│   │   │                     #   DailySummaryBar, NewAppointmentDialog,
│   │   │                     #   StatusWorkflowPanel, CancellationDialog
│   │   ├── clinical/         # SOAPNoteForm.tsx, TreatmentFormDialog.tsx
│   │   ├── documents/        # DocumentCard.tsx, DocumentTypeFilter.tsx,
│   │   │                     #   UploadDialog.tsx, DocumentViewerModal.tsx
│   │   └── communications/
│   ├── context/
│   │   └── AuthContext.tsx   # React Context + useReducer for global auth state
│   ├── lib/
│   │   ├── api.ts            # Axios instance with silent refresh interceptor
│   │   ├── api-server.ts     # Server-side fetch helpers (no auth, RSC)
│   │   ├── auth.ts           # Token storage (localStorage) + helpers
│   │   └── utils.ts          # cn(), formatCurrency(), formatDate(), formatTime()
│   ├── types/index.ts        # TypeScript interfaces mirroring Pydantic schemas
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml        # Local dev stack (backend + frontend + postgres)
├── specification.md
├── spec_documents/           # Feature specs per module
└── design_plans/             # Engineering design docs per module
```

## Database

All tables defined in `backend/alembic/versions/001_initial_schema.py`:

| Table | Purpose |
|---|---|
| `users` | Staff accounts (dentist / receptionist) |
| `password_reset_tokens` | SHA-256 hashed one-use reset tokens |
| `patients` | Patient registry with `pg_trgm` search indexes |
| `clinic_settings` | Working hours, slot duration, timezone |
| `appointments` | Scheduling with 7-state FSM |
| `clinical_notes` | SOAP notes (4 required fields) |
| `treatments` | Procedure records with FDI tooth notation |
| `documents` | File metadata (files in Cloudflare R2) |
| `communications` | Outbound message log (SMS / email) |
| `reminder_configs` | Configurable reminder templates |
| `reminder_dispatch_log` | Idempotency table for reminder scheduler |
| `procedures` | Procedure code catalog |

**Run migrations:** `cd backend && alembic upgrade head`

## Dev Server

### Backend
```bash
cd backend
# First time: python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
# Copy .env.example to .env and fill in values
.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API base: `http://localhost:8000/api/v1`
- Swagger: `http://localhost:8000/api/docs`
- Health: `http://localhost:8000/api/health`

### Running tests
```bash
cd backend
.venv\Scripts\python.exe -m pytest tests/ -v
```

### Frontend
```bash
cd frontend
# First time: npm install
# Copy .env.example to .env.local
npm run dev
```
- Port: **3000**

### Docker (full stack)
```bash
docker-compose up
```

## Features — Build Status

| # | Feature | Spec Doc | Design Doc | Status |
|---|---------|----------|------------|--------|
| 1 | Auth & Security | @spec_documents/auth_and_security.md | @design_plans/auth_and_security.md | ✅ Done |
| 2 | Patient Management | @spec_documents/patient_management.md | @design_plans/patient_management.md | ✅ Done |
| 3 | Scheduling | @spec_documents/scheduling.md | @design_plans/scheduling.md | ✅ Done |
| 4 | Clinical Charting | @spec_documents/clinical_charting.md | @design_plans/clinical_charting.md | ✅ Done |
| 5 | Document Storage | @spec_documents/document_storage.md | @design_plans/document_storage.md | ✅ Done |
| 6 | Communication | @spec_documents/communication.md | @design_plans/communication.md | ⬜ Not Started |
| 7 | Dashboard | @spec_documents/dashboard.md | @design_plans/dashboard.md | ✅ Done |

## Session Log

| Session | Work Done | Date | Key Decisions |
|---------|-----------|------|---------------|
| 0 | Project Scaffold | 2026-05-28 | FastAPI + Next.js 14 App Router; Alembic migrations; 67 backend routes stubbed; both servers start cleanly |
| 1 | Auth & Security | 2026-05-29 | Switched bcrypt from passlib wrapper to direct bcrypt lib (passlib incompatible with bcrypt 5.x); refresh token read from HTTP-only cookie (not request body); added POST /auth/logout endpoint; wired SendGrid email for password reset; added AuthContext + ProtectedLayout + all auth pages |
| 2 | Patient Management | 2026-05-29 | Backend was fully scaffolded from session 0; fixed reactivate_patient path param (UUID = None → UUID); built all shadcn/ui primitives; built SearchBar (debounced autocomplete), PatientFormDialog (react-hook-form + zod), DeactivatePatientDialog; full patients list page + patient profile page; 22 schema unit tests (34 total passing) |
| 3 | Scheduling | 2026-05-29 | App-level conflict detection used instead of PostgreSQL exclusion constraint (simpler, safe for single-dentist MVP); added `AppointmentWithPatient` schema that joins patient name/phone via `selectinload`; slots endpoint now reads clinic_settings for working hours and slot duration; added `GET /users/dentists` endpoint (any-role) for receptionist booking flow; DayViewCalendar uses 1.5px/min absolute positioning (720px for 09:00–17:00); 38 new tests (72 total passing) |
| 4 | Clinical Charting | 2026-05-29 | Backend was already fully implemented from scaffold (models, schemas, all CRUD routes); only frontend needed building; SOAP form uses live per-field character counters via `watch()`; patient profile tabs converted from static buttons to live Radix Tabs with lazy-loaded data per tab; 55 new tests (127 total passing) |
| 5 | Document Storage | 2026-05-29 | Magic-byte MIME detection instead of python-magic (avoids Windows libmagic issues); Cloudflare R2 client uses sync boto3 wrapped in `asyncio.to_thread()` (reliable, no async internals); parallel signed-URL generation via `asyncio.gather` for list endpoint; compensating storage delete when DB insert fails after file is already uploaded; 24 new tests (151 total passing) |
| 6 | Dashboard | 2026-05-29 | Backend was already scaffolded (CTE aggregation query, schema, route all present); DashboardClient converted from broken SSR-props pattern to self-contained client component that fetches via Axios (auth token in localStorage can't be read server-side); per-widget independent error states so a failed stats query doesn't block the appointment list; auto-refresh implemented as setInterval + fetchData() rather than router.refresh(); 9 new schema unit tests (160 total passing) |

## Known Issues / Tech Debt

- `POST /communications/reminders/trigger` and `/bulk` return stub responses — APScheduler job not implemented
- `GET /analytics/*` endpoints return empty stubs
- `backend/app/models/user.py` `updated_at` uses Python-side `onupdate` — consider a DB trigger for consistency
- Frontend page for communications remains a placeholder stub
- Document Storage: signed URL list endpoint generates one signed URL per document per request — parallelised with asyncio.gather but could be expensive for large libraries; consider lazy URL generation on click in future
- Document Storage: document deletion is logged to Python logger only (no dedicated audit table); for medicolegal completeness an audit table should be added in Phase 2
- Document Storage: no `python-magic` library used; inline magic-byte detection covers JPEG/PNG/PDF/DICOM only — an unrecognised file format (e.g. TIFF) is correctly rejected but error message says "DICOM" instead of identifying the actual format
- Document Storage: Cloudflare R2 bucket must be manually created and set to private before uploads will work (bucket: `patient-docs`); configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` in `.env`
- `next.config.mjs` rewrite proxies `/api/v1/*` to backend — requires `BACKEND_URL` env var in production
- `quick_search` in patients.py: `current_user: CurrentUser` must stay as first parameter (Python non-default-before-default rule)
- Patient profile "Communications" tab remains a stub — wired in future sprint
- Clinical charting: no frontend route guard preventing receptionist from navigating to `/appointments/[id]/chart` via URL — the page gracefully hides create/edit/delete controls but a redirect would be more correct
- Chart page loads a max of 100 treatments per appointment (`per_page=100`) — sufficient for MVP but should be replaced with pagination if treatment counts grow large
- No integration tests yet — backend unit tests only cover schema validation; full integration tests require a live DB
- Scheduling: appointments page "New Appointment" button is disabled when no dentist is loaded — requires the clinic to have at least one active dentist account in the DB
- Scheduling: DayViewCalendar hardcodes 09:00–17:00 display range; if clinic_settings specifies different hours, the grid still shows 09:00–17:00 (appointments outside still render but may be clipped)
- Scheduling: edit form on `/appointments/[id]` does not re-run available slot lookup — uses manual time pickers only

## Important Conventions

### Backend
- **Dependency ordering:** `current_user: CurrentUser` (no Python default) MUST be the first parameter in any route function that also has `= Query(...)` parameters
- **Annotated deps:** Use `CurrentUser` (Annotated alias) for any-role routes; use `Depends(require_role("dentist"))` for dentist-only routes
- **DB session:** always use `db: AsyncSession = Depends(get_db)` — never create sessions manually
- **Response pattern:** Always use Pydantic `.model_validate(orm_obj)` to serialize ORM objects
- **Soft delete:** patients use `is_active = False`, never hard-delete
- **API prefix:** all endpoints are under `/api/v1`
- **Password hashing:** use `bcrypt` library directly (not passlib) — passlib is incompatible with bcrypt >= 4.x
- **Email sending:** use `app/core/email.py` `send_password_reset_email()`; it gracefully logs the URL when `SENDGRID_API_KEY` is not set (dev mode)
- **Appointment response pattern:** all appointment endpoints that return data use `AppointmentWithPatient` (includes patient_name, patient_phone, color). Use `_load_with_patient()` + `_build_with_patient()` helpers from `appointments.py`.
- **Relationship loading:** use `selectinload(Appointment.patient)` when loading appointments — never rely on lazy loading in async SQLAlchemy
- **Static routes before path params:** in FastAPI, define `/appointments/calendar`, `/appointments/stats/daily`, `/appointments/slots/available`, and `/users/dentists` BEFORE `/{id}` routes to prevent shadowing
- **Filter list pattern:** build ORM filters as a `list` and pass as `*filters` to both count and data queries — avoids cloning `select()` statements or using `.subquery()` with ORM loading options
- **Storage client:** `app/core/storage.py` exposes `upload_file`, `delete_files`, `get_signed_url` as async functions wrapping the sync boto3 S3 client (pointed at Cloudflare R2) via `asyncio.to_thread()`; import from `core.storage`, never instantiate the boto3 client directly in routes
- **Document response pattern:** always use `_build_response(doc)` from `documents.py` to attach `uploader_name` and signed URLs; requires `selectinload(Document.uploader)` on the query
- **MIME detection:** use `detect_mime(content)` from `core/storage.py` — reads magic bytes, never trusts client-supplied Content-Type or file extension

### Frontend
- **Clinical components:** `SOAPNoteForm` handles create/view/edit with per-field character counters using `watch()`; FDI validation is mirrored client-side in `TreatmentFormDialog` using a `Set` built the same way as the backend set
- **Patient profile tabs:** use Radix `Tabs` with `defaultValue`; each tab's data is fetched lazily in a `useEffect` inside the tab's inner component — data loads only when that tab component mounts (Radix unmounts inactive tabs by default)
- **Chart page access pattern:** dentist-vs-receptionist gating is done via `isDentist` boolean (from `useAuth()`); no redirect for receptionists — controls are hidden, view is read-only
- **shadcn/ui components:** all primitives live in `frontend/components/ui/`; write component files directly (do not use CLI installer — Windows environment)
- **Patient pages are Client Components:** access token is in localStorage (not available server-side), so patient pages use `"use client"` + `apiClient` for data fetching
- **Form pattern:** react-hook-form + zod + `@hookform/resolvers/zod`; mirror Pydantic validators in Zod schema
- **Axios client:** always import from `@/lib/api` (has token injection + silent refresh interceptor)
- **Server fetches:** use `@/lib/api-server` for Server Components (no auth token)
- **Token storage:** access token in `localStorage` via `@/lib/auth`; refresh token in HTTP-only cookie
- **Auth state:** use `useAuth()` from `@/context/AuthContext` for user/role/login/logout
- **Auth guard:** dashboard layout uses `ProtectedLayout` which redirects unauthenticated users to `/login`
- **Role guard:** dentist-only pages check `user.role !== "dentist"` in a `useEffect` and redirect to `/dashboard`
- **cn():** use `@/lib/utils` `cn()` for conditional Tailwind classes
- **Types:** all API types defined in `@/types/index.ts`
- **Document upload:** use `FormData` + `apiClient.post` with `{ headers: { "Content-Type": "multipart/form-data" }, onUploadProgress }` — the Axios interceptor handles token injection automatically
- **Document viewer:** `DocumentViewerModal` fetches a fresh signed URL via `GET /documents/{id}` on open (avoids showing a stale/expired URL from the list load)
- **File type detection (frontend):** check `doc.mime_type` against `"image/jpeg"` / `"image/png"` / `"application/pdf"` / `"image/dicom"` — do not rely on file extension for rendering decisions
- **Dashboard pattern:** `DashboardClient` is a self-contained client component that fetches its own data via `apiClient` on mount; `page.tsx` is a thin shell (`export const dynamic = "force-dynamic"`, returns `<DashboardClient />`). Do not try to SSR authenticated dashboard data — the access token is in localStorage only.
- **Dashboard refresh pattern:** auto-refresh uses `setInterval(() => fetchData(true), 60_000)` where `isRefresh=true` shows a "Refreshing…" indicator without blanking the page. Manual refresh button calls the same `fetchData(true)` directly (not `router.refresh()`).
- **Dashboard error isolation:** stats and appointments are fetched with `Promise.allSettled` so a failure in one widget shows its own error state without blocking the other.

### API Response Shape
```json
// Paginated list
{ "data": [...], "pagination": { "page": 1, "per_page": 20, "total": 100, "total_pages": 5 } }

// Error
{ "detail": "Human-readable error message" }

// Success message
{ "message": "Action completed successfully" }
```

### Status Workflows
- **Appointments:** `scheduled` → `confirmed` → `checked_in` → `in_progress` → `completed` (terminal)
- **Treatments:** `planned` → `in_progress` → `completed`
- **Communications:** `sent` → `delivered` (via webhook) | `failed`
