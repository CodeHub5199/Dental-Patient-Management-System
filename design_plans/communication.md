# Design Plan: Communication

**Document Version:** 1.0
**Feature:** Communication — SMS & Email Reminders (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Implement an outbound communication system with two modes: (1) an automated reminder engine that dispatches SMS and email messages to patients ahead of their appointments based on configurable rules, and (2) a manual send capability for ad-hoc staff messages. Every outbound message — automated or manual — is logged with delivery status. The design leverages Twilio (SMS) and SendGrid (Email) as third-party delivery providers and uses a background job scheduler for timed triggers, without introducing a heavy task queue infrastructure.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Communication endpoints, template rendering, message logging |
| **SMS Provider** | Twilio REST API (`twilio` Python SDK) | SMS delivery + delivery status webhooks |
| **Email Provider** | SendGrid API (`sendgrid` Python SDK) | Email delivery + delivery status webhooks |
| **Background Scheduler** | `APScheduler` (AsyncIOScheduler) | Runs the reminder dispatch job at configured intervals |
| **Template Engine** | Python `string.Template` | `{{patient_name}}` placeholder substitution in reminder templates |
| **ORM** | SQLAlchemy 2.x async | `communications`, `reminder_configs` tables |
| **Database** | Supabase PostgreSQL | Message log, reminder configuration storage |
| **Frontend** | Next.js 14 App Router | Communication log page, manual send dialog, reminder config management |
| **UI Components** | shadcn/ui `Table`, `Dialog`, `Textarea`, `Select`, `Switch` | Log table, send form, config management |
| **Webhook Receiver** | FastAPI endpoint + Twilio/SendGrid signature verification | Status callbacks from providers |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                                                                  │
│  /communications (Server Component)                              │
│  ├─ CommunicationLogTable (filterable: patient/channel/status)   │
│  └─ SendMessageButton ──► ManualSendDialog (Client Component)    │
│                                                                  │
│  /reminders/configs (dentist-only, Client Component)             │
│  ├─ ReminderConfigList                                           │
│  ├─ CreateConfigDialog                                           │
│  └─ TemplateEditor (with placeholder hints)                      │
│                                                                  │
│  /appointments (existing) — "Send Reminder" button per appt      │
│  └─ BulkReminderButton ──► POST /communications/reminders/bulk   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                            │
│                                                                  │
│  Communication Endpoints:                                        │
│  GET  /communications                  ── log with filters       │
│  POST /communications/send             ── manual send            │
│  POST /communications/reminders/trigger── single appt trigger    │
│  POST /communications/reminders/bulk   ── all tomorrow's appts   │
│  POST /webhooks/twilio                 ── Twilio status callback  │
│  POST /webhooks/sendgrid               ── SendGrid event callback │
│                                                                  │
│  Reminder Config Endpoints:                                      │
│  GET/POST /reminders/configs                                     │
│  PUT/DELETE /reminders/configs/{id}                              │
│                                                                  │
│  Background Job (APScheduler):                                   │
│  └─ ReminderDispatchJob (runs every 15 min)                      │
│      └─ checks reminder_configs → finds appointments due         │
│         → sends messages → logs results                          │
└──────────────┬──────────────────────────────────┬───────────────┘
               │ asyncpg                           │ provider SDKs
               ▼                                  ▼
┌──────────────────────┐          ┌───────────────────────────────┐
│  SUPABASE POSTGRESQL │          │  Twilio REST API (SMS)        │
│  communications      │          │  SendGrid API (Email)         │
│  reminder_configs    │          │                               │
└──────────────────────┘          │  ← webhooks back to FastAPI   │
                                  └───────────────────────────────┘
```

---

## 4. Data Model

### Table: `communications`

```sql
CREATE TABLE communications (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id         UUID NOT NULL REFERENCES patients(id),
    appointment_id     UUID REFERENCES appointments(id),
    communication_type TEXT NOT NULL CHECK (communication_type IN ('sms', 'email')),
    direction          TEXT NOT NULL DEFAULT 'outbound'
                         CHECK (direction IN ('outbound')),  -- inbound out of scope MVP
    message_content    TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('sent', 'delivered', 'failed')),
    failure_reason     TEXT,                -- populated on failed sends
    provider_message_id TEXT,              -- Twilio MessageSid / SendGrid MessageId
    sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at       TIMESTAMPTZ,        -- updated by webhook
    created_by         UUID REFERENCES users(id),  -- NULL = system (automated)
    is_automated       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_comm_patient    ON communications(patient_id);
CREATE INDEX idx_comm_appt       ON communications(appointment_id);
CREATE INDEX idx_comm_sent_at    ON communications(sent_at DESC);
CREATE INDEX idx_comm_status     ON communications(status);
```

### Table: `reminder_configs`

```sql
CREATE TABLE reminder_configs (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      TEXT NOT NULL,
    hours_before_appointment  INT NOT NULL CHECK (hours_before_appointment > 0),
    communication_type        TEXT NOT NULL CHECK (communication_type IN ('sms', 'email')),
    template                  TEXT NOT NULL,
    is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
    created_by                UUID NOT NULL REFERENCES users(id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: `reminder_dispatch_log` (idempotency guard)

```sql
-- Prevents the same reminder config from sending twice to the same appointment
CREATE TABLE reminder_dispatch_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    config_id      UUID NOT NULL REFERENCES reminder_configs(id),
    dispatched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (appointment_id, config_id)   -- idempotency key
);
```

### Pydantic Schemas (Backend)

```python
SUPPORTED_PLACEHOLDERS = frozenset([
    "patient_name", "appointment_type",
    "appointment_time", "appointment_date", "clinic_name"
])

class ReminderConfigCreate(BaseModel):
    name:                      str = Field(min_length=1, max_length=100)
    hours_before_appointment:  int = Field(gt=0)
    communication_type:        Literal["sms", "email"]
    template:                  str = Field(min_length=1)
    is_active:                 bool = True

    @field_validator("template")
    def validate_placeholders(cls, v):
        import re
        found = set(re.findall(r"\{\{(\w+)\}\}", v))
        invalid = found - SUPPORTED_PLACEHOLDERS
        if invalid:
            raise ValueError(
                f"Unknown placeholders: {invalid}. "
                f"Supported: {SUPPORTED_PLACEHOLDERS}"
            )
        return v

class ManualSendRequest(BaseModel):
    patient_id:        UUID
    appointment_id:    Optional[UUID] = None
    communication_type: Literal["sms", "email"]
    message_content:   str

    @field_validator("message_content")
    def sms_length(cls, v, info):
        if info.data.get("communication_type") == "sms" and len(v) > 160:
            raise ValueError("SMS messages cannot exceed 160 characters")
        if len(v) > 2000:
            raise ValueError("Message content cannot exceed 2000 characters")
        return v
```

---

## 5. Core Design Decisions

### 5.1 APScheduler for Reminder Dispatch (No Redis/Celery)

**Decision:** Use `APScheduler`'s `AsyncIOScheduler` embedded in the FastAPI process to run the reminder dispatch job every 15 minutes.

**Rationale:** For a single-dentist practice with 15–20 appointments per day, a full Celery + Redis stack is massive over-engineering. APScheduler runs in-process, shares the FastAPI event loop, and requires no additional infrastructure. The 15-minute poll interval means a reminder configured for "24 hours before" will send within 15 minutes of its trigger window — acceptable accuracy for appointment reminders.

```python
# main.py (FastAPI lifespan)
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        dispatch_due_reminders,
        trigger="interval",
        minutes=15,
        id="reminder_dispatch"
    )
    scheduler.start()
    yield
    scheduler.shutdown()
```

### 5.2 Idempotency via `reminder_dispatch_log`

**Decision:** Before sending a reminder, the system inserts a `(appointment_id, config_id)` row into `reminder_dispatch_log` with a unique constraint. If the insert succeeds, the reminder is new and should be sent. If it violates the unique constraint, the reminder was already sent.

**Rationale:** The scheduler runs every 15 minutes. Without idempotency, a reminder for "24 hours before" would be attempted multiple times across polling cycles. The `reminder_dispatch_log` ensures each (appointment × config) pair is dispatched exactly once.

### 5.3 Template Rendering with `string.Template`

**Decision:** Use Python's standard `string.Template` (with `{{}}` delimiter remapped) for placeholder substitution, not Jinja2.

**Rationale:** Reminder templates contain a small, fixed set of substitutions. Jinja2 is powerful but introduces template injection risk if templates are user-defined. `string.Template` with safe substitution (`safe_substitute`) silently leaves unknown placeholders as-is, which is safer than raising a runtime error in a background job.

```python
import re

def render_template(template: str, context: dict) -> str:
    """Replace {{key}} placeholders with values from context."""
    def replacer(match):
        key = match.group(1)
        return str(context.get(key, f"{{{{{key}}}}}"))  # leave unknown as-is
    return re.sub(r"\{\{(\w+)\}\}", replacer, template)
```

### 5.4 Webhook-Based Delivery Status Updates

**Decision:** Register FastAPI webhook endpoints with Twilio and SendGrid to receive delivery status callbacks. These update the `status` and `delivered_at` columns in `communications`.

**Security:** Both providers sign their webhooks. Validate the signature before processing:
- **Twilio:** `twilio.request_validator.RequestValidator`
- **SendGrid:** HMAC-SHA256 verification against `X-Twilio-Email-Event-Webhook-Signature`

### 5.5 Graceful Skip for Missing Contact Information

**Decision:** The reminder dispatch job does not raise an exception when a patient has no phone (for SMS) or no email. It logs a `status='failed'` record with `failure_reason='No phone number on file'` and continues to the next appointment.

**Rationale:** Failing silently on a missing contact is correct business behaviour — it should not stop all other reminders from sending.

---

## 6. Core Functional Flows

### 6.1 Automated Reminder Dispatch (Background Job)

```
APScheduler (every 15 min)          FastAPI Service              DB / Providers
  │                                     │                               │
  ├─ dispatch_due_reminders() ─────────►│                               │
  │                                     ├─ SELECT active reminder_configs│
  │                                     ├─ for each config:             │
  │                                     │   find appointments where     │
  │                                     │   start_time BETWEEN          │
  │                                     │   NOW()+hours AND NOW()+hours+15min
  │                                     │   AND status NOT IN (cancelled, no_show)
  │                                     │   AND NOT IN dispatch_log ───►│
  │                                     │                               │
  │                                     │   for each appointment:       │
  │                                     │   ├─ render_template()        │
  │                                     │   ├─ INSERT dispatch_log ────►│
  │                                     │   ├─ send via Twilio/SendGrid │
  │                                     │   └─ INSERT communications ──►│
  │                                     │      (status='sent')          │
  │                                     │                               │
  │                                     │  ──────── Twilio webhook ─────┤
  │                                     │  PATCH communications         │
  │                                     │  status='delivered' ─────────►│
```

### 6.2 Manual Send Flow

```
ManualSendDialog                     FastAPI                  Twilio/SendGrid
  │                                     │                           │
  ├─ POST /communications/send ────────►│                           │
  │  {patient_id, type:"sms",           ├─ fetch patient.phone      │
  │   message_content}                  ├─ SMS length ≤ 160? ✓     │
  │                                     ├─ send via Twilio ─────────►│
  │                                     │◄─── MessageSid ─────────── │
  │                                     ├─ INSERT communications    │
  │                                     │   {status:'sent',         │
  │                                     │    provider_msg_id: sid,  │
  │                                     │    created_by: user.id}   │
  │◄─ 201 {comm object} ────────────────┤                           │
  │  ── appears in log immediately ─────│                           │
```

### 6.3 Bulk Reminder Trigger

```
BulkReminderButton                   FastAPI                  Providers
  │                                     │                         │
  ├─ POST /communications/reminders/bulk►│                         │
  │                                     ├─ find tomorrow's appts  │
  │                                     ├─ for each appt:         │
  │                                     │   apply active configs  │
  │                                     │   skip if in dispatch_log
  │                                     │   send + log            │
  │◄─ 200 {sent:16, failed:2,           │                         │
  │       failures:[...]} ──────────────┤                         │
```

---

## 7. Development Plan

### Sprint 7 — Week 1: Backend

| Task | Detail | Est. |
|---|---|---|
| Install dependencies | `twilio`, `sendgrid`, `apscheduler` | 0.25d |
| Alembic migration | `communications`, `reminder_configs`, `reminder_dispatch_log` | 0.5d |
| Twilio/SendGrid service wrappers | `send_sms(to, body)` → returns `(sid, status)` ; `send_email(to, subject, body)` | 1d |
| `render_template()` utility | Regex-based `{{}}` substitution, unit tests | 0.5d |
| `POST /communications/send` (manual) | Contact info check, length validation, send + log | 1d |
| `dispatch_due_reminders()` job | Query due appointments, idempotency check, render, send, log | 1.5d |
| APScheduler setup in FastAPI lifespan | 15-min interval, graceful shutdown | 0.5d |
| `POST /communications/reminders/trigger` | Single-appointment manual trigger | 0.5d |
| `POST /communications/reminders/bulk` | Tomorrow's appointments, summary response | 0.5d |
| Webhook endpoints (`/webhooks/twilio`, `/webhooks/sendgrid`) | Signature validation, status update in DB | 1d |
| `GET /communications` | Filtered log with pagination | 0.5d |
| Reminder config CRUD (`/reminders/configs`) | Dentist-only create/update/delete, placeholder validation | 1d |
| Unit tests | Template rendering, idempotency, missing contact skip | 1d |

### Sprint 7 — Week 2: Frontend

| Task | Detail | Est. |
|---|---|---|
| Communication log page (`/communications`) | Server Component, filterable table (patient, channel, status, date) | 1.5d |
| `ManualSendDialog` component | Channel selector, message textarea with counter, send button | 1.5d |
| `BulkReminderButton` component | Single click, result summary toast | 0.5d |
| "Send Reminder" per-appointment button | In appointment detail; calls `/trigger` | 0.5d |
| Reminder configs page (`/reminders/configs`) — dentist-only | Config list, create/edit dialog, active toggle (`Switch`), delete | 2d |
| Template editor | Textarea with placeholder chips/hints below | 1d |
| Integration tests | Manual send, bulk trigger, config create + validation, log display | 1d |

### Definition of Done

- [ ] Automated reminder sends correctly within 15 minutes of the trigger window.
- [ ] The `reminder_dispatch_log` unique constraint prevents duplicate sends (verified by running the job twice within the same window).
- [ ] An SMS over 160 characters is rejected at both frontend and backend.
- [ ] A patient with no phone number causes a log entry with `status='failed'` — no exception thrown.
- [ ] A reminder for a cancelled appointment is not sent (status check in dispatch query).
- [ ] Twilio webhook correctly updates `status` to `delivered` in the communications table.
- [ ] A template with an invalid placeholder is rejected on save with a description of supported placeholders.
- [ ] Bulk trigger summary correctly reports sent vs. failed counts.
- [ ] A receptionist cannot access the reminder configs management page.
