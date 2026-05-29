# Design Plan: Patient Management

**Document Version:** 1.0
**Feature:** Patient Management (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Build the authoritative patient registry — a full CRUD system supporting registration, profile viewing, search, update, and soft-deletion of patient records. The design must handle a database of 1,000+ active records with sub-second search response, enforce uniqueness on phone number across active and inactive records, surface a per-patient activity summary (visit count, last visit, upcoming appointment), and make all data accessible to both staff roles while restricting destructive operations (reactivation) to the dentist.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Patient CRUD endpoints, search logic, activity summary aggregation |
| **ORM** | SQLAlchemy 2.x (async) | Async DB queries, relationship loading |
| **Validation** | Pydantic v2 | Request/response schema validation, phone format checking |
| **Database** | Supabase PostgreSQL | Primary data store; full-text search via `pg_trgm` extension |
| **Search** | PostgreSQL `pg_trgm` (trigram index) | Fast fuzzy name, phone, and email search without a separate search engine |
| **Frontend** | Next.js 14 App Router | Patient list page, profile page, registration form, search bar |
| **UI Components** | shadcn/ui | `DataTable`, `Form`, `Input`, `Badge`, `Dialog` (for deactivation confirmation) |
| **Frontend Data Fetching** | Next.js Server Components + `fetch` | Server-rendered patient list for fast initial load |
| **Client Interactivity** | React Client Components + `useState` | Autocomplete search, inline form validation |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                                                                  │
│  /patients (Server Component)                                    │
│  ├─ PatientTable (RSC): renders paginated list (SSR)             │
│  ├─ SearchBar (Client Component): calls /patients/search/quick   │
│  └─ NewPatientButton ──► PatientFormDialog (Client Component)    │
│                                                                  │
│  /patients/[id] (Server Component)                               │
│  ├─ PatientHeader: name, DOB, medical alert badge                │
│  ├─ PatientStats: visit count, last visit, next appt             │
│  └─ TabNavigation: Appointments | Treatments | Notes | Documents │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                            │
│                                                                  │
│  GET    /patients               ── list with filters + pagination│
│  POST   /patients               ── register new patient          │
│  GET    /patients/search/quick  ── autocomplete (debounced)      │
│  GET    /patients/{id}          ── profile + stats               │
│  PUT    /patients/{id}          ── update demographics           │
│  DELETE /patients/{id}          ── soft-delete (is_active=false) │
│  POST   /patients/{id}/reactivate ── dentist only               │
│                                                                  │
│  Sub-resource read endpoints (pass-through to their own modules):│
│  GET /patients/{id}/appointments                                 │
│  GET /patients/{id}/treatments                                   │
│  GET /patients/{id}/clinical-notes                               │
│  GET /patients/{id}/documents                                    │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ asyncpg
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL                            │
│                                                                  │
│  patients table  ──── appointments (FK)                          │
│       │          ──── treatments   (FK)                          │
│       │          ──── clinical_notes (FK)                        │
│       └────────────── documents    (FK)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Table: `patients`

```sql
CREATE TABLE patients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    date_of_birth     DATE NOT NULL,
    gender            TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    phone             TEXT NOT NULL,
    email             TEXT,
    address           TEXT,
    emergency_contact JSONB,           -- {"name": "", "phone": "", "relationship": ""}
    medical_notes     TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness on phone across ALL records (active and inactive)
CREATE UNIQUE INDEX idx_patients_phone ON patients(phone);

-- Uniqueness on email only when provided (partial unique index)
CREATE UNIQUE INDEX idx_patients_email ON patients(email) WHERE email IS NOT NULL;

-- Trigram indexes for fast fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_first_name_trgm ON patients USING gin(first_name gin_trgm_ops);
CREATE INDEX idx_patients_last_name_trgm  ON patients USING gin(last_name  gin_trgm_ops);
CREATE INDEX idx_patients_phone_trgm      ON patients USING gin(phone      gin_trgm_ops);

-- Composite index for active patient list ordering
CREATE INDEX idx_patients_active_created ON patients(is_active, created_at DESC);
```

### Pydantic Schemas (Backend)

```python
class EmergencyContact(BaseModel):
    name:         str
    phone:        str
    relationship: str

class PatientCreate(BaseModel):
    first_name:        str = Field(min_length=1, max_length=100)
    last_name:         str = Field(min_length=1, max_length=100)
    date_of_birth:     date
    gender:            Optional[Literal["male","female","other","prefer_not_to_say"]]
    phone:             str                        # validated by custom validator
    email:             Optional[EmailStr]
    address:           Optional[str]
    emergency_contact: Optional[EmergencyContact]
    medical_notes:     Optional[str] = Field(max_length=5000)

    @field_validator("date_of_birth")
    def dob_not_in_future(cls, v):
        if v >= date.today():
            raise ValueError("Date of birth cannot be today or in the future")
        return v

class PatientUpdate(PatientCreate):
    # All fields optional for PATCH-style updates via PUT
    first_name:    Optional[str] = None
    last_name:     Optional[str] = None
    date_of_birth: Optional[date] = None
    phone:         Optional[str] = None

class PatientStats(BaseModel):
    total_appointments: int
    total_treatments:   int
    total_amount:       Decimal
    last_visit_date:    Optional[date]
    upcoming_appointment: Optional[UpcomingAppointment]

class PatientDetail(PatientBase):
    stats: PatientStats
```

---

## 5. Core Design Decisions

### 5.1 Soft Delete Over Hard Delete

**Decision:** `is_active = false` marks a patient as inactive. No `DELETE FROM patients` is ever issued.

**Rationale:** Patient records are medicolegal documents. Deleting them would destroy appointment history, clinical notes, and treatment records — potentially exposing the practice to liability. Soft deletion preserves all linked records while removing the patient from active workflows.

**Implementation:** Every query in normal operation includes an implicit `WHERE is_active = TRUE` filter. The deactivation endpoint sets `is_active = false`. Reactivation (dentist-only) sets it back to `true`.

### 5.2 PostgreSQL `pg_trgm` for Search

**Decision:** Use PostgreSQL trigram indexes for patient search rather than introducing Elasticsearch or similar.

**Rationale:** At 1,000–5,000 patient records, a full-text search engine is overengineering. Trigram similarity search in PostgreSQL handles fuzzy matching (e.g., "Srah" matching "Sarah") with sub-50ms query times at this scale, requires no additional infrastructure, and is available on Supabase out of the box.

**Query pattern for autocomplete:**
```sql
SELECT id, first_name, last_name, phone, registration_date
FROM patients
WHERE is_active = TRUE
  AND (
    first_name ILIKE '%' || $1 || '%'
    OR last_name  ILIKE '%' || $1 || '%'
    OR phone      ILIKE '%' || $1 || '%'
    OR email      ILIKE '%' || $1 || '%'
  )
ORDER BY similarity(last_name, $1) DESC
LIMIT 10;
```

### 5.3 Stats Aggregation via Correlated Subqueries

**Decision:** The `PatientStats` block on the profile page is computed with a single SQL query using subqueries rather than multiple round trips or an ORM `.count()` call per relationship.

**Rationale:** Avoids the N+1 query problem. The profile endpoint fetches the patient row and all stats in one query execution.

```sql
SELECT
    p.*,
    (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id)   AS total_appointments,
    (SELECT COUNT(*) FROM treatments   t WHERE t.patient_id = p.id)   AS total_treatments,
    (SELECT COALESCE(SUM(amount), 0) FROM treatments WHERE patient_id = p.id AND status = 'completed') AS total_amount,
    (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = p.id AND status = 'completed')  AS last_visit_date
FROM patients p
WHERE p.id = $1;
```

### 5.4 Phone Number Uniqueness Across Active and Inactive Records

**Decision:** The unique index on `phone` covers all rows, including inactive patients.

**Rationale:** A patient who was deactivated and later re-registers should be reactivated, not given a duplicate record. If a new registration uses a phone number belonging to an inactive record, the system shows: *"A deactivated record with this phone number exists. Would you like to reactivate it?"*

### 5.5 Emergency Contact as JSONB

**Decision:** Emergency contact is stored as a JSONB column rather than a separate `emergency_contacts` table.

**Rationale:** In a single-dentist MVP with one emergency contact per patient, a separate table adds join complexity with no benefit. JSONB provides the flexibility to store the structured object while keeping the schema simple. If multi-contact support is needed in Phase 2, migration to a separate table is straightforward.

---

## 6. Core Functional Flows

### 6.1 Patient Registration Flow

```
Frontend (PatientForm)              FastAPI                   PostgreSQL
  │                                     │                         │
  ├─ POST /patients ───────────────────►│                         │
  │  {first_name, last_name, phone,     │                         │
  │   dob, medical_notes, ...}          ├─ Pydantic validation    │
  │                                     ├─ dob not in future?     │
  │                                     ├─ phone format valid?    │
  │                                     │                         │
  │                                     ├─ INSERT INTO patients ─►│
  │                                     │◄─── UniqueViolation ────┤  (phone already exists)
  │◄─ 409 "Phone number already exists"─┤                         │
  │                                     │                         │
  │                                     │◄─── new row ────────────┤  (success)
  │◄─ 201 {patient object} ─────────────┤                         │
  │  ── navigate to /patients/{id} ─────│                         │
```

### 6.2 Autocomplete Search Flow

```
SearchBar (Client Component)        FastAPI                   PostgreSQL
  │                                     │                         │
  ├─ user types "sar" (debounce 300ms)  │                         │
  ├─ GET /patients/search/quick?q=sar ─►│                         │
  │                                     ├─ trigram ILIKE query ──►│
  │                                     │◄── top 10 matches ──────┤
  │◄─ [{id, name, phone, last_visit}] ──┤                         │
  │  ── render dropdown list ───────────│                         │
  │                                     │                         │
  ├─ user selects a result              │                         │
  ├─ navigate to /patients/{id} ────────│                         │
```

### 6.3 Patient Profile Load with Stats

```
/patients/[id] (Server Component)   FastAPI                   PostgreSQL
  │                                     │                         │
  ├─ GET /patients/{id} ───────────────►│                         │
  │                                     ├─ single query: patient  │
  │                                     │  + aggregated stats ───►│
  │                                     │◄── patient + stats ─────┤
  │◄─ 200 {patient, stats} ─────────────┤                         │
  │  ── render profile + medical alert  │                         │
  │  ── render stats widget             │                         │
  │  ── render tab links                │                         │
```

### 6.4 Soft-Delete and Reactivation Flow

```
Frontend                            FastAPI                   PostgreSQL
  │                                     │                         │
  ├─ DELETE /patients/{id} ────────────►│                         │
  │                                     ├─ role: any staff        │
  │                                     ├─ UPDATE is_active=false─►│
  │◄─ 200 {message: "deactivated"} ─────┤                         │
  │                                     │                         │
  ├─ POST /patients/{id}/reactivate ───►│                         │
  │                                     ├─ require_role("dentist")│
  │                                     ├─ UPDATE is_active=true ►│
  │◄─ 200 {patient object} ─────────────┤                         │
```

---

## 7. Development Plan

### Sprint 3 — Week 1: Backend

| Task | Detail | Est. |
|---|---|---|
| Alembic migration: `patients` table | Including `pg_trgm` extension and all indexes | 0.5d |
| Pydantic schemas | `PatientCreate`, `PatientUpdate`, `PatientDetail`, `PatientStats`, `EmergencyContact` | 0.5d |
| `POST /patients` | Validation, duplicate phone detection (catch `UniqueViolation`), `created_by` injection | 1d |
| `GET /patients` | Pagination, `is_active` filter, sort_by, date range filters | 1d |
| `GET /patients/search/quick` | Trigram query, 10-result limit, active-only | 0.5d |
| `GET /patients/{id}` | Single query with correlated subqueries for stats | 1d |
| `PUT /patients/{id}` | Partial update, phone uniqueness re-check on change | 0.5d |
| `DELETE /patients/{id}` (soft) | Set `is_active = false` | 0.25d |
| `POST /patients/{id}/reactivate` | Dentist-only, set `is_active = true` | 0.25d |
| Unit tests | Registration, duplicate phone, search, stats aggregation, deactivation | 1d |

### Sprint 3 — Week 2: Frontend

| Task | Detail | Est. |
|---|---|---|
| Patient list page (`/patients`) | Server Component, `PatientTable`, pagination controls, sort headers | 1.5d |
| `SearchBar` (client component) | Debounced input → `/search/quick` → dropdown overlay | 1d |
| `PatientFormDialog` | New patient form with all fields, inline validation, submission | 1.5d |
| Patient profile page (`/patients/[id]`) | Header, medical alert badge, stats widget, tab navigation | 1.5d |
| Deactivation confirmation dialog | `AlertDialog` from shadcn/ui, dentist-only "Reactivate" button | 0.5d |
| Edit patient form | Pre-fill from profile, submit `PUT /patients/{id}` | 1d |
| Integration tests | Registration, search, profile load, deactivation, reactivation | 0.5d |

### Definition of Done

- [ ] 1,000 patient records inserted via seed script; list paginates correctly and loads in < 500ms.
- [ ] Autocomplete returns results within 300ms of debounce trigger.
- [ ] Duplicate phone registration is rejected; duplicate phone belonging to an inactive record shows reactivation prompt.
- [ ] Patient profile stats match raw counts verifiable by direct DB query.
- [ ] Medical alert badge appears when `medical_notes` is non-empty; absent when null.
- [ ] Receptionist cannot see the "Reactivate" button on an inactive patient profile.
- [ ] All patient routes return 404 for non-existent UUIDs (not 500).
