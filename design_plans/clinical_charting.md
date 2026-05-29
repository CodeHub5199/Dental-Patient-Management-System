# Design Plan: Clinical Charting

**Document Version:** 1.0
**Feature:** Clinical Charting (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Implement the clinical documentation core of the DPMS: a SOAP note editor and a treatment/procedure recorder, both appointment-linked and patient-scoped. The design must enforce that only the dentist can write or modify clinical records, support multiple procedures per appointment, validate FDI tooth notation server-side, and present a unified clinical view per appointment (notes + treatments together). The data must be structured for future Phase 2 features — the visual odontogram and procedure analytics — without over-engineering the MVP schema.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | SOAP CRUD, treatment CRUD, ownership enforcement |
| **ORM** | SQLAlchemy 2.x async | Async queries, joined loads for appointment context |
| **Validation** | Pydantic v2 + custom validators | FDI notation, date constraints, field length limits |
| **Database** | Supabase PostgreSQL | `clinical_notes` and `treatments` tables |
| **Frontend** | Next.js 14 App Router | Charting workspace page within appointment detail |
| **Text Editor** | `shadcn/ui Textarea` + auto-resize | Four SOAP fields; character counter on each |
| **Procedure UI** | React dynamic form (array of procedure rows) | Add/remove procedures per appointment |
| **Tooth Selector** | Custom `ToothSelector` component (text input with FDI validation) | Tooth number input with validation feedback |
| **State Management** | React Hook Form + Zod | Form state, schema-driven validation matching backend rules |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                                                                  │
│  /appointments/[id]/chart (Client Component — dentist only)      │
│  ├─ SOAPNoteForm                                                  │
│  │   ├─ SubjectiveField (textarea + counter)                     │
│  │   ├─ ObjectiveField                                           │
│  │   ├─ AssessmentField                                          │
│  │   └─ PlanField                                                │
│  └─ TreatmentRecorder                                            │
│      ├─ TreatmentRow[] (tooth, procedure, amount, status, date)  │
│      ├─ AddTreatmentButton                                       │
│      └─ ProcedureSelector (from /settings/procedures)            │
│                                                                  │
│  /patients/[id]/clinical-notes (Server Component)                │
│  └─ SOAPNoteHistory (read-only list, reverse chronological)      │
│                                                                  │
│  /patients/[id]/treatments (Server Component)                    │
│  └─ TreatmentHistory (filterable by status, tooth number)        │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                            │
│                                                                  │
│  Clinical Notes:                                                 │
│  GET    /clinical-notes                ── filtered list          │
│  POST   /clinical-notes                ── create (dentist only)  │
│  GET    /clinical-notes/{id}           ── single note detail     │
│  PUT    /clinical-notes/{id}           ── update (owner only)    │
│  DELETE /clinical-notes/{id}           ── delete (owner only)    │
│                                                                  │
│  Treatments:                                                     │
│  GET    /treatments                    ── filtered list          │
│  POST   /treatments                    ── record (dentist only)  │
│  GET    /treatments/{id}               ── single treatment       │
│  PUT    /treatments/{id}               ── update (dentist only)  │
│  DELETE /treatments/{id}               ── delete (dentist only)  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ asyncpg
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL                            │
│                                                                  │
│  clinical_notes ──── patients (FK), appointments (FK), users(FK) │
│  treatments     ──── patients (FK), appointments (FK), users(FK) │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Table: `clinical_notes`

```sql
CREATE TABLE clinical_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id     UUID NOT NULL REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),   -- nullable
    subjective     TEXT NOT NULL CHECK (length(subjective) >= 10),
    objective      TEXT NOT NULL CHECK (length(objective)  >= 10),
    assessment     TEXT NOT NULL CHECK (length(assessment) >= 10),
    plan           TEXT NOT NULL CHECK (length(plan)       >= 10),
    created_by     UUID NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cn_patient     ON clinical_notes(patient_id);
CREATE INDEX idx_cn_appointment ON clinical_notes(appointment_id);
CREATE INDEX idx_cn_created_at  ON clinical_notes(patient_id, created_at DESC);
```

### Table: `treatments`

```sql
CREATE TABLE treatments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    appointment_id  UUID REFERENCES appointments(id),  -- nullable
    tooth_number    TEXT NOT NULL,                     -- FDI or 'general'
    procedure_code  TEXT,                              -- optional ADA D-code
    procedure_name  TEXT NOT NULL,
    description     TEXT,
    amount          NUMERIC(10, 2) CHECK (amount >= 0),
    status          TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('planned','in_progress','completed')),
    performed_by    UUID NOT NULL REFERENCES users(id),
    performed_date  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_performed_not_future CHECK (performed_date <= CURRENT_DATE)
);

CREATE INDEX idx_tx_patient     ON treatments(patient_id);
CREATE INDEX idx_tx_appointment ON treatments(appointment_id);
CREATE INDEX idx_tx_tooth       ON treatments(patient_id, tooth_number);
CREATE INDEX idx_tx_status      ON treatments(patient_id, status);
```

### FDI Validation (Backend Utility)

```python
# All valid FDI tooth numbers as a set
VALID_FDI_TEETH = frozenset(
    f"{quadrant}{position}"
    for quadrant in range(1, 5)           # 1, 2, 3, 4
    for position in range(1, 9)           # 1-8
) | {"general"}                           # 11-18, 21-28, 31-38, 41-48 + "general"

def validate_fdi(tooth: str) -> str:
    if tooth.lower() == "general":
        return "general"
    if tooth not in VALID_FDI_TEETH:
        raise ValueError(
            f"Invalid tooth number '{tooth}'. "
            f"Use FDI notation (11-18, 21-28, 31-38, 41-48) or 'general'."
        )
    return tooth
```

### Pydantic Schemas (Backend)

```python
class ClinicalNoteCreate(BaseModel):
    patient_id:     UUID
    appointment_id: Optional[UUID] = None
    subjective:     str = Field(min_length=10, max_length=5000)
    objective:      str = Field(min_length=10, max_length=5000)
    assessment:     str = Field(min_length=10, max_length=5000)
    plan:           str = Field(min_length=10, max_length=5000)

class TreatmentCreate(BaseModel):
    patient_id:     UUID
    appointment_id: Optional[UUID] = None
    tooth_number:   str
    procedure_code: Optional[str] = None
    procedure_name: str = Field(min_length=1, max_length=200)
    description:    Optional[str] = Field(default=None, max_length=1000)
    amount:         Optional[Decimal] = Field(default=None, ge=0)
    status:         Literal["planned", "in_progress", "completed"]
    performed_date: date

    @field_validator("tooth_number")
    def validate_tooth(cls, v):
        return validate_fdi(v)

    @field_validator("performed_date")
    def not_in_future(cls, v):
        if v > date.today():
            raise ValueError("Performed date cannot be in the future")
        return v
```

---

## 5. Core Design Decisions

### 5.1 Ownership Check on Note Edit/Delete

**Decision:** When a dentist attempts to edit or delete a clinical note, the backend verifies that `clinical_notes.created_by == current_user.id`. This is checked in the service layer, not just the route decorator.

**Rationale:** In a single-dentist MVP this check is trivially satisfied, but it is architecturally correct to enforce it now. If a second dentist is ever added (Phase 2), their notes remain their own records and cannot be altered by a colleague — which is a core medicolegal requirement.

```python
async def update_note(note_id: UUID, body: NoteUpdate, user: User, db: AsyncSession):
    note = await db.get(ClinicalNote, note_id)
    if not note:
        raise HTTPException(404)
    if note.created_by != user.id:
        raise HTTPException(403, "You can only edit your own clinical notes")
    # apply updates...
```

### 5.2 Appointment Ownership Validation on Create

**Decision:** When a note or treatment is created with an `appointment_id`, the backend verifies that the appointment belongs to the same patient as the note.

**Rationale:** Prevents a data integrity bug where a note for Patient A accidentally references an appointment belonging to Patient B. This is a cross-entity consistency check that the database FK alone does not enforce.

### 5.3 Both SOAP and Treatments Are Optional Siblings

**Decision:** A SOAP note and treatment records are separate entities. An appointment can have a note without treatments, treatments without a note, or both. They share the same `appointment_id` but are not parent-child in the schema.

**Rationale:** Clinical reality varies — a consultation may produce only a note with no procedures; an extraction may have a procedure record but minimal SOAP detail. Forcing one to depend on the other would break valid workflows.

### 5.4 `amount` is Optional on Treatment Records

**Decision:** The `amount` field on `treatments` is nullable. Records without an amount are valid.

**Rationale:** Not all procedures have a defined fee at the time of recording (e.g., a procedure pending lab costing). The amount is for analytics, not billing — forcing it would create friction in the charting workflow.

### 5.5 Character Counter UI Pattern

**Decision:** Each SOAP textarea displays a live character counter (e.g., "1,247 / 5,000") implemented client-side via `onChange` handler. The backend also enforces the limit via Pydantic.

**Rationale:** Dual enforcement — frontend gives immediate feedback; backend guards against bypass.

---

## 6. Core Functional Flows

### 6.1 Create SOAP Note

```
ChartingPage (dentist)               FastAPI                    PostgreSQL
  │                                     │                            │
  ├─ POST /clinical-notes ─────────────►│                            │
  │  {patient_id, appointment_id,       ├─ require_role("dentist")   │
  │   subjective, objective,            ├─ validate all 4 fields     │
  │   assessment, plan}                 ├─ verify appt belongs to    │
  │                                     │  patient (if provided)     │
  │                                     ├─ INSERT clinical_notes ───►│
  │                                     │◄──── new row ──────────────┤
  │◄─ 201 {note object} ────────────────┤                            │
  │  ── note appears in history ────────│                            │
```

### 6.2 Record Multiple Treatments per Appointment

```
TreatmentRecorder                    FastAPI                    PostgreSQL
  │                                     │                            │
  ├─ POST /treatments ─────────────────►│ {tooth: "36", proc: "Filling", amount: 250}
  │                                     ├─ validate_fdi("36") ✓      │
  │                                     ├─ INSERT treatments ────────►│
  │◄─ 201 {treatment: T1} ──────────────┤                            │
  │                                     │                            │
  ├─ POST /treatments ─────────────────►│ {tooth: "37", proc: "Extraction", amount: 180}
  │                                     ├─ INSERT treatments ────────►│
  │◄─ 201 {treatment: T2} ──────────────┤                            │
  │  ── both rows visible in list ──────│                            │
```

### 6.3 Attempt Note Edit by Non-Owner

```
Dentist B (future scenario)          FastAPI
  │                                     │
  ├─ PUT /clinical-notes/{note_A_id} ──►│
  │                                     ├─ fetch note_A
  │                                     ├─ note_A.created_by = dentist_A_id
  │                                     ├─ current_user.id  = dentist_B_id
  │                                     ├─ mismatch ─► 403 Forbidden
  │◄─ 403 "You can only edit your own  ─┤
  │       clinical notes"               │
```

### 6.4 View Unified Appointment Clinical View

```
AppointmentDetail page               FastAPI                    PostgreSQL
  │                                     │                            │
  ├─ GET /appointments/{id} ───────────►│                            │
  │                                     ├─ fetch appointment ────────►│
  │◄─ appointment data ─────────────────┤                            │
  │                                     │                            │
  ├─ GET /clinical-notes?appt_id={id} ─►│                            │
  │                                     ├─ SELECT * WHERE appt_id ──►│
  │◄─ [note list] ──────────────────────┤                            │
  │                                     │                            │
  ├─ GET /treatments?appt_id={id} ─────►│                            │
  │                                     ├─ SELECT * WHERE appt_id ──►│
  │◄─ [treatment list] ─────────────────┤                            │
  │  ── render unified charting view ───│                            │
```

---

## 7. Development Plan

### Sprint 5 — Week 1: Backend

| Task | Detail | Est. |
|---|---|---|
| Alembic migration: `clinical_notes` table | With indexes | 0.5d |
| Alembic migration: `treatments` table | With FDI constraint, indexes | 0.5d |
| FDI validation utility | `VALID_FDI_TEETH` set, `validate_fdi()` function, unit tests | 0.5d |
| `POST /clinical-notes` | Dentist-only, appointment-patient cross-check, 4-field validation | 1d |
| `GET /clinical-notes` | Filter by `patient_id`, `appointment_id`, date range, pagination | 0.5d |
| `GET /clinical-notes/{id}` | Single note detail | 0.25d |
| `PUT /clinical-notes/{id}` | Owner check, partial update | 0.5d |
| `DELETE /clinical-notes/{id}` | Owner check, delete | 0.25d |
| `POST /treatments` | FDI validation, date not-future check, amount nullable | 1d |
| `GET /treatments` | Multi-filter: patient, appt, status, tooth, date range, pagination | 0.5d |
| `GET/PUT/DELETE /treatments/{id}` | Detail, update, dentist-only delete | 0.5d |
| Unit tests | Ownership checks, FDI validation, cross-entity validation | 1d |

### Sprint 5 — Week 2: Frontend

| Task | Detail | Est. |
|---|---|---|
| Charting workspace page (`/appointments/[id]/chart`) | Dentist-only route guard, two-panel layout | 0.5d |
| `SOAPNoteForm` component | 4 auto-resize textareas, live character counters, React Hook Form + Zod | 1.5d |
| `TreatmentRecorder` component | Dynamic treatment rows, add/remove, procedure selector dropdown | 2d |
| `ToothSelector` component | Text input with FDI hint text and inline validation | 1d |
| SOAP note history view (`/patients/[id]/clinical-notes`) | Read-only accordion list, reverse chronological | 1d |
| Treatment history view (`/patients/[id]/treatments`) | Filter by status and tooth number, sortable table | 1d |
| Integration tests | Create note, create multi-treatment, edit note, delete note | 0.5d |

### Definition of Done

- [ ] All four SOAP fields are required; saving with any empty field is blocked at both frontend and backend.
- [ ] An invalid FDI tooth number returns a 422 with a clear description of valid notation.
- [ ] A receptionist cannot see the "New Clinical Note" or "Add Treatment" buttons.
- [ ] A note created by dentist A cannot be edited via `PUT` by dentist B (HTTP 403).
- [ ] Multiple treatments can be saved for the same appointment and are all visible in the appointment's clinical view.
- [ ] Treatment history correctly filters by tooth number, showing only records for that tooth.
- [ ] SOAP note history is sorted newest-first and each entry shows the correct appointment date and type.
