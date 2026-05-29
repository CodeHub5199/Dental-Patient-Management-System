# Design Plan: Scheduling

**Document Version:** 1.0
**Feature:** Scheduling (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Implement a double-booking-proof appointment scheduling system with a visual calendar interface, a structured 7-state status workflow, conflict detection enforced at the database level, and real-time status updates visible to all logged-in staff. The system must handle 15–20 appointments per day reliably, surface available slots on demand, and expose a calendar-optimised read endpoint that minimises frontend data processing.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Appointment CRUD, conflict detection, status FSM, calendar aggregation |
| **ORM** | SQLAlchemy 2.x async | Async queries, optimistic locking on status transitions |
| **Database** | Supabase PostgreSQL | Appointments table with exclusion constraint for conflict prevention |
| **Conflict Guard** | PostgreSQL `btree_gist` exclusion constraint | DB-level double-booking prevention (last line of defence) |
| **Frontend** | Next.js 14 App Router | Calendar page, booking form, status controls |
| **Calendar UI** | Custom React component (shadcn/ui + Tailwind) | Day/Week grid rendering from appointment data |
| **Date/Time** | `date-fns` (frontend), Python `datetime` + `zoneinfo` (backend) | Timezone-safe time handling |
| **Real-time Updates** | Next.js `router.refresh()` + polling (60s interval) | Status updates visible without page reload |
| **State Management** | React `useState` + `useOptimistic` | Optimistic status updates; revert on error |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                                                                  │
│  /appointments (Server Component — default: today)               │
│  ├─ DayViewCalendar (Client Component)                           │
│  │   ├─ AppointmentBlock (draggable/clickable time slots)        │
│  │   └─ StatusBadge (colour-coded by status)                     │
│  ├─ WeekViewCalendar (Client Component)                          │
│  ├─ DailySummaryBar (counts per status)                          │
│  └─ NewAppointmentDialog ──► AppointmentForm                     │
│                                                                  │
│  /appointments/[id] (Server Component)                           │
│  ├─ AppointmentDetail                                            │
│  └─ StatusWorkflowPanel (PATCH /status)                          │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                            │
│                                                                  │
│  GET    /appointments                  ── filtered list          │
│  POST   /appointments                  ── create + conflict check│
│  GET    /appointments/calendar         ── calendar-optimised read│
│  GET    /appointments/stats/daily      ── status count summary   │
│  GET    /appointments/slots/available  ── free slots for date    │
│  GET    /appointments/{id}             ── full appointment detail│
│  PUT    /appointments/{id}             ── reschedule + conflict  │
│  DELETE /appointments/{id}             ── cancel with reason     │
│  PATCH  /appointments/{id}/status      ── FSM status transition  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ asyncpg
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL                            │
│                                                                  │
│  appointments table                                              │
│  ├─ tstzrange (start_time, end_time) exclusion constraint        │
│  └─ partial index on dentist_id + date for availability queries  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Table: `appointments`

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE appointments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id           UUID NOT NULL REFERENCES patients(id),
    dentist_id           UUID NOT NULL REFERENCES users(id),
    appointment_date     DATE NOT NULL,
    start_time           TIME NOT NULL,
    end_time             TIME NOT NULL,
    duration_minutes     INT GENERATED ALWAYS AS
                           (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
    status               TEXT NOT NULL DEFAULT 'scheduled'
                           CHECK (status IN (
                             'scheduled','confirmed','checked_in',
                             'in_progress','completed','cancelled','no_show'
                           )),
    appointment_type     TEXT NOT NULL,
    notes                TEXT,
    cancellation_reason  TEXT,
    created_by           UUID NOT NULL REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Semantic constraint: end must be after start
    CONSTRAINT chk_end_after_start CHECK (end_time > start_time),

    -- Exclusion constraint: no overlapping time ranges for the same dentist
    -- Only applies to non-cancelled appointments
    EXCLUDE USING gist (
        dentist_id WITH =,
        tstzrange(
            (appointment_date + start_time) AT TIME ZONE 'UTC',
            (appointment_date + end_time)   AT TIME ZONE 'UTC'
        ) WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

-- Performance indexes
CREATE INDEX idx_appts_date          ON appointments(appointment_date);
CREATE INDEX idx_appts_patient       ON appointments(patient_id);
CREATE INDEX idx_appts_dentist_date  ON appointments(dentist_id, appointment_date);
CREATE INDEX idx_appts_status        ON appointments(status);
```

### Table: `clinic_settings` (working hours used by slot availability)

```sql
CREATE TABLE clinic_settings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name      TEXT NOT NULL,
    working_hours    JSONB NOT NULL DEFAULT '{
        "monday":    {"start":"09:00","end":"17:00"},
        "tuesday":   {"start":"09:00","end":"17:00"},
        "wednesday": {"start":"09:00","end":"17:00"},
        "thursday":  {"start":"09:00","end":"17:00"},
        "friday":    {"start":"09:00","end":"14:00"},
        "saturday":  null,
        "sunday":    null
    }',
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Pydantic Schemas (Backend)

```python
class AppointmentCreate(BaseModel):
    patient_id:       UUID
    dentist_id:       UUID
    appointment_date: date
    start_time:       time
    end_time:         time
    appointment_type: str
    notes:            Optional[str]

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

    @field_validator("appointment_date")
    def not_in_past(cls, v):
        if v < date.today():
            raise ValueError("Appointment date cannot be in the past")
        return v

class StatusTransition(BaseModel):
    status: Literal[
        "scheduled","confirmed","checked_in",
        "in_progress","completed","cancelled","no_show"
    ]
    cancellation_reason: Optional[str] = None  # required when status == "cancelled"

class CancelAppointment(BaseModel):
    cancellation_reason: str = Field(min_length=1)
```

---

## 5. Core Design Decisions

### 5.1 PostgreSQL Exclusion Constraint as the Double-Booking Guard

**Decision:** Use a `btree_gist` exclusion constraint on `tstzrange(start, end)` with `&&` (overlaps) operator as the final, database-level double-booking prevention.

**Rationale:** Application-level checks (check then insert) have a race condition window — two concurrent requests could both pass the check and then both insert, producing a double-booking. The exclusion constraint is atomic and enforces the invariant at the data layer regardless of concurrency.

**Implementation:** Application code catches `asyncpg.ExclusionViolationError` and maps it to a user-friendly HTTP 409 response showing the conflicting appointment's time.

**Note:** The constraint uses `WHERE (status NOT IN ('cancelled', 'no_show'))` so that cancelled slots are freed for re-booking.

### 5.2 Finite State Machine (FSM) for Status Transitions

**Decision:** Status transitions are enforced via an explicit allowed-transitions map in a service function. No direct `status` write is accepted without going through the FSM.

**Rationale:** Prevents illogical state jumps (e.g., `scheduled → completed`) that would pollute reporting data and create inconsistencies in the clinical record.

```python
ALLOWED_TRANSITIONS = {
    "scheduled":  {"confirmed", "cancelled"},
    "confirmed":  {"checked_in", "cancelled", "no_show"},
    "checked_in": {"in_progress", "cancelled"},
    "in_progress":{"completed"},
    "completed":  set(),          # terminal
    "cancelled":  {"scheduled"},  # reopen
    "no_show":    {"scheduled"},  # reopen
}

def validate_transition(current: str, next: str) -> None:
    if next not in ALLOWED_TRANSITIONS.get(current, set()):
        raise InvalidTransitionError(
            f"Cannot transition from '{current}' to '{next}'"
        )
```

### 5.3 Available Slot Calculation Server-Side

**Decision:** The `/slots/available` endpoint computes free slots on the server by comparing the clinic's working hours against existing bookings for that date, rather than sending raw bookings to the frontend and computing there.

**Rationale:** Keeps business logic (working hours, slot granularity) centralised. The frontend receives a ready-to-render list of open slots — no calculation required.

```python
def compute_available_slots(
    working_start: time,
    working_end:   time,
    slot_minutes:  int,
    booked:        list[tuple[time, time]]
) -> list[dict]:
    slots = []
    cursor = working_start
    while cursor < working_end:
        slot_end = (datetime.combine(date.today(), cursor)
                    + timedelta(minutes=slot_minutes)).time()
        if slot_end > working_end:
            break
        overlaps = any(
            cursor < b_end and slot_end > b_start
            for b_start, b_end in booked
        )
        if not overlaps:
            slots.append({"start_time": cursor, "end_time": slot_end})
        cursor = slot_end
    return slots
```

### 5.4 Calendar Endpoint Returns Colour Codes

**Decision:** `GET /appointments/calendar` includes a `color` hex string per appointment derived from the appointment type, computed server-side.

**Rationale:** Colour mapping is a display concern but is consistent across all clients. Computing it server-side ensures consistency and simplifies frontend code.

```python
TYPE_COLOURS = {
    "checkup":      "#3B82F6",  # blue
    "cleaning":     "#10B981",  # green
    "filling":      "#F59E0B",  # amber
    "extraction":   "#EF4444",  # red
    "root_canal":   "#8B5CF6",  # purple
    "consultation": "#6B7280",  # grey
}
```

### 5.5 Timezone Strategy

**Decision:** All times are stored and transmitted as UTC. The frontend converts to the clinic's local time using `date-fns-tz` with the timezone configured in clinic settings.

**Rationale:** Prevents DST bugs and ensures consistent sorting/querying. The clinic's timezone is stored in `clinic_settings` as an IANA timezone string (e.g., `"America/New_York"`).

---

## 6. Core Functional Flows

### 6.1 Create Appointment (with Conflict Check)

```
AppointmentForm (Client)            FastAPI Service              PostgreSQL
  │                                     │                             │
  ├─ POST /appointments ───────────────►│                             │
  │  {patient_id, date, start, end,     ├─ Pydantic validate         │
  │   dentist_id, type}                 ├─ date not in past?         │
  │                                     ├─ within working hours?     │
  │                                     │                             │
  │                                     ├─ INSERT INTO appointments ─►│
  │                                     │                             ├─ ExclusionViolation?
  │                                     │◄────────── violation ───────┤
  │◄─ 409 "Conflict: John Doe 10:00-10:30"                           │
  │                                     │                             │
  │                                     │◄──── new row ───────────────┤  (success)
  │◄─ 201 {appointment} ────────────────┤                             │
  │  ── calendar block appears ─────────│                             │
```

### 6.2 Status Transition Flow

```
StatusWorkflowPanel                  FastAPI                     PostgreSQL
  │                                     │                             │
  ├─ PATCH /appointments/{id}/status ──►│                             │
  │  {status: "checked_in"}             ├─ fetch current status ─────►│
  │                                     │◄─── "confirmed" ────────────┤
  │                                     ├─ FSM: confirmed→checked_in? ✓
  │                                     ├─ UPDATE status = checked_in►│
  │◄─ 200 {id, status, previous_status} ┤                             │
  │  ── optimistic UI already updated   │                             │
  │                                     │                             │
  ├─ PATCH … {status: "completed"} ────►│                             │
  │                                     ├─ fetch current: "confirmed" │
  │                                     ├─ FSM: confirmed→completed? ✗
  │◄─ 422 "Cannot transition from 'confirmed' to 'completed'"        │
  │  ── revert optimistic UI ───────────│                             │
```

### 6.3 Available Slots Calculation

```
NewAppointmentDialog                 FastAPI                     PostgreSQL
  │                                     │                             │
  ├─ date picker: user picks 2026-06-15 │                             │
  ├─ GET /appointments/slots/available  │                             │
  │    ?date=2026-06-15                 │                             │
  │    &dentist_id=uuid ───────────────►│                             │
  │                                     ├─ fetch working hours        │
  │                                     ├─ SELECT start_time,end_time │
  │                                     │  FROM appointments          │
  │                                     │  WHERE date=? AND active ──►│
  │                                     │◄─── booked slots ───────────┤
  │                                     ├─ compute_available_slots()  │
  │◄─ 200 {available_slots: [...]} ─────┤                             │
  │  ── render slot picker ─────────────│                             │
```

---

## 7. Development Plan

### Sprint 3 — Week 2: Backend

| Task | Detail | Est. |
|---|---|---|
| Alembic migration: `appointments` table | Including `btree_gist` extension, exclusion constraint, indexes | 1d |
| `POST /appointments` | Validation, exclusion constraint error handling, 409 response with conflict detail | 1d |
| `GET /appointments` | Multi-filter (date, status, patient, search), pagination, status summary | 1d |
| `GET /appointments/calendar` | Calendar-optimised response with colour codes | 0.5d |
| `GET /appointments/stats/daily` | Status count aggregation for a date | 0.5d |
| `GET /appointments/slots/available` | Working hours fetch + `compute_available_slots()` | 0.5d |
| `GET /appointments/{id}` | Full detail with patient medical notes | 0.5d |
| `PUT /appointments/{id}` | Reschedule with conflict re-check | 0.5d |
| `DELETE /appointments/{id}` | Cancel with mandatory reason | 0.5d |
| `PATCH /appointments/{id}/status` | FSM validation, optimistic locking | 1d |
| Unit tests | FSM transitions, conflict detection, slot calculation | 1d |

### Sprint 4 — Week 1: Frontend

| Task | Detail | Est. |
|---|---|---|
| `DayViewCalendar` component | Vertical timeline, appointment blocks, click-to-open | 2d |
| `WeekViewCalendar` component | 7-column grid, appointment chips, navigation | 1.5d |
| `DailySummaryBar` component | Status count badges, derived from `/stats/daily` | 0.5d |
| `NewAppointmentDialog` | Patient selector, slot picker (from `/slots/available`), type select | 1.5d |
| `StatusWorkflowPanel` | Allowed-actions buttons (derived from current status), `useOptimistic` | 1d |
| Cancellation dialog | Mandatory reason input using `AlertDialog` | 0.5d |
| Auto-refresh (60s polling) | `router.refresh()` on interval | 0.5d |
| Integration tests | Create → status flow → cancel, conflict rejection | 1d |

### Definition of Done

- [ ] Double-booking is rejected even under concurrent simultaneous requests (tested with `pytest-asyncio` parallel tasks).
- [ ] All 7 status transitions work correctly; invalid transitions return 422.
- [ ] Calendar renders today's appointments on load within 1 second.
- [ ] Available slot endpoint returns correct open windows given existing bookings.
- [ ] Cancellation without a reason is blocked at both frontend and backend.
- [ ] Completed appointments cannot be cancelled (FSM terminal state enforced).
- [ ] Status changes made in one browser tab are visible in another within 60 seconds.
