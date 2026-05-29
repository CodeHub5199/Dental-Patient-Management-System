# Dental Patient Management System (DPMS)
## Product Requirements, Architecture & API Specification

| Field | Details |
|---|---|
| **Document Version** | 1.0 |
| **Date** | 2026-05-28 |
| **Author** | Senior Solution Architect |
| **Status** | Final Draft for MVP Development |

---

## Table of Contents

1. [Executive Summary & Context](#1-executive-summary--context)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack & Justification](#3-technology-stack--justification)
4. [Database Design (Core Schema)](#4-database-design-core-schema)
5. [User Flows & Role-Based Access](#5-user-flows--role-based-access)
6. [Feature Modules & MVP Prioritization](#6-feature-modules--mvp-prioritization)
7. [Technical & Compliance Guardrails](#7-technical--compliance-guardrails)
8. [Recommended Project Scaffold](#8-recommended-project-scaffold)
9. [Development Phasing Strategy](#9-development-phasing-strategy)
10. [API Reference](#10-api-reference)

---

## 1. Executive Summary & Context

### 1.1 Project Vision

To build a modern, cloud-based Dental Patient Management System that streamlines daily operations for a single-dentist practice. The system will replace manual or legacy tracking with an integrated digital solution for patient records, scheduling, clinical charting, and document management.

### 1.2 Target Environment

| Parameter | Value |
|---|---|
| **Clinic Model** | Single Dental Practice |
| **Provider Count** | 1 Dentist |
| **Patient Volume** | 1,000+ active records |
| **Appointment Volume** | 15–20 appointments per day |
| **Geographic Scope** | Single country (compliance baseline non-specific, best practices applied) |
| **Users** | Dentist (Full Access) & Receptionist (Operational Access) |

---

## 2. System Architecture

### 2.1 High-Level Architecture Overview

The system follows a decoupled, API-driven architecture with a server-rendered frontend for performance and a Python-based backend for business logic.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Next.js 14 (App Router) + TypeScript                     │  │
│  │  ├─ Server Components (RSC) for data fetching             │  │
│  │  ├─ Client Components for interactivity                   │  │
│  │  ├─ Styling: Tailwind CSS                                 │  │
│  │  └─ UI Kit: shadcn/ui (Radix Primitives)                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS (Vercel Edge Network)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  FastAPI (Python 3.11+)                                   │  │
│  │  ├─ JWT Authentication Middleware                         │  │
│  │  ├─ RBAC (Dentist / Receptionist)                         │  │
│  │  ├─ Pydantic v2 Request Validation                        │  │
│  │  ├─ Rate Limiting (SlowAPI)                               │  │
│  │  └─ Auto-generated OpenAPI Docs (Swagger/ReDoc)           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Internal Network
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌───────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Supabase         │  │  Supabase     │  │  External APIs   │  │
│  │  PostgreSQL       │  │  Storage      │  │  (Twilio/SendGrid│  │
│  │  (Primary DB)     │  │  (Files/Xrays)│  │   Email)         │  │
│  └───────────────────┘  └───────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Deployment Architecture

To optimize for a solo developer and free-tier infrastructure, the system is deployed across three managed services:

- **Vercel (Free Tier):** Hosts the Next.js frontend. Handles edge caching, HTTPS, and server-side rendering.
- **Railway / Render (Hobby Tier):** Hosts the FastAPI container. Stable public endpoint for API requests.
- **Supabase (Free Tier):** Managed PostgreSQL database, authentication provider, and object storage (S3-compatible).

---

## 3. Technology Stack & Justification

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 14 + TypeScript | Server components reduce client bundle; excellent DX; SSR for fast initial loads. |
| **UI Kit** | shadcn/ui + Tailwind | Unstyled, accessible primitives (Calendar, Dialog, Table) that perfectly match the dental workflow UI needs. |
| **Backend** | Python FastAPI | Async-first; automatic OpenAPI/Swagger docs (useful for testing); Pydantic ensures strict type safety for medical data. |
| **Database** | Supabase (PostgreSQL) | Relational integrity is mandatory for medical records. Supabase simplifies auth (Row Level Security) and storage. |
| **Communication** | Twilio / SendGrid | Reliable APIs for SMS and Email delivery with delivery status webhooks. |

---

## 4. Database Design (Core Schema)

The schema is normalized to ensure consistency between patients, appointments, and clinical records.

### 4.1 Tables Definition

#### `users`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Unique identifier |
| `email` | TEXT UNIQUE | Login email |
| `password_hash` | TEXT | Hashed password |
| `full_name` | TEXT | Display name |
| `role` | ENUM | `dentist`, `receptionist` |
| `is_active` | BOOLEAN | Soft disable |
| `created_at` | TIMESTAMP | Auto-generated |

#### `patients`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Unique identifier |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `date_of_birth` | DATE | |
| `phone` | TEXT | Primary contact |
| `email` | TEXT | Optional |
| `medical_notes` | TEXT | Allergies, medications, systemic conditions |
| `emergency_contact` | JSONB | `{"name": "...", "phone": "..."}` |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_by` | UUID FK | Link to `users` |

#### `appointments`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK | Link to `patients` |
| `dentist_id` | UUID FK | Link to `users` (role: dentist) |
| `start_time` | TIMESTAMPTZ | Start of appointment |
| `end_time` | TIMESTAMPTZ | End of appointment |
| `status` | ENUM | `scheduled`, `confirmed`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show` |
| `type` | TEXT | `consultation`, `cleaning`, `filling`, etc. |
| `notes` | TEXT | Reason for visit or special instructions |

#### `treatments`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK | |
| `appointment_id` | UUID FK (nullable) | Context of visit |
| `tooth_number` | TEXT | FDI Notation (11–48) or `'general'` |
| `procedure_name` | TEXT | e.g., `"Composite Filling"` |
| `amount` | DECIMAL | Fee charged (for analytics, not billing) |
| `status` | ENUM | `planned`, `in_progress`, `completed` |
| `performed_by` | UUID FK | Link to `users` |

#### `clinical_notes`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK | |
| `appointment_id` | UUID FK | |
| `subjective` | TEXT | Patient complaints |
| `objective` | TEXT | Clinical findings |
| `assessment` | TEXT | Diagnosis |
| `plan` | TEXT | Next steps |

#### `documents`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `patient_id` | UUID FK | |
| `appointment_id` | UUID FK (nullable) | |
| `file_name` | TEXT | Original filename |
| `file_path` | TEXT | Supabase Storage path |
| `document_type` | ENUM | `xray`, `photo`, `consent`, `prescription` |
| `uploaded_by` | UUID FK | Link to `users` |

---

## 5. User Flows & Role-Based Access

### 5.1 Dentist Workflow (Clinical Focus)

1. **Login** → Dashboard displays today's schedule.
2. **Select Patient** (from list or search) → View Patient Profile (medical history, previous SOAP notes, X-rays).
3. **Start Appointment** → Status changes to `in_progress`.
4. **Charting Mode:**
   - **SOAP Note:** Fill Subjective / Objective / Assessment / Plan.
   - **Treatment Recording:** Select tooth, select procedure, enter amount.
   - **Documents:** Upload X-rays or photos directly into the visit.
5. **Complete** → Status set to `completed`.

### 5.2 Receptionist Workflow (Admin Focus)

1. **Login** → Dashboard shows pending check-ins and unconfirmed slots.
2. **Registration:** Enter new patient demographics, medical alerts, and emergency contact.
3. **Scheduling:** Assign patient to an open slot. System prevents double-booking.
4. **Check-in:** Mark status `checked_in` upon patient arrival.
5. **Communications:** Trigger reminder SMS/Email for upcoming appointments.

---

## 6. Feature Modules & MVP Prioritization

### 🔴 MVP (Core Launch Scope)

| Module | Features |
|---|---|
| **Auth & Security** | Email login, JWT token, Dentist/Receptionist role split. |
| **Patient Management** | CRUD operations, search by name/phone, medical notes field, soft delete. |
| **Scheduling** | Day/Week calendar view, drag-to-create slots, status workflow (`scheduled` → `completed`), cancellation reasons. |
| **Clinical Charting** | SOAP note editor (free text), procedure recording with amount, link treatment to tooth. |
| **Document Storage** | Multi-file upload per patient, document type tagging, inline image viewer. |
| **Communication** | Automated SMS/Email reminders (24h before), manual trigger, communication log. |
| **Dashboard** | "Today's Appointments" widget, quick stats (total patients, today's revenue sum). |

### 🟢 Phase 2 (Growth & Optimization)

| Module | Features |
|---|---|
| **Visual Odontogram** | Interactive 32-tooth chart, click to add treatment, visual history per tooth. |
| **Recall System** | Auto-detect patients due for checkup (>6 months), send bulk reminders. |
| **Analytics** | Charts (revenue trend, procedure frequency, demographics). |
| **Template Library** | Pre-saved SOAP templates for common procedures (e.g., "Adult Prophylaxis"). |
| **Audit Trail** | Full change log: who edited what record and when. |

---

## 7. Technical & Compliance Guardrails

Although formal HIPAA/GDPR compliance is not currently required, the architecture adheres to healthcare best practices to protect patient safety and data:

- **Data in Transit:** TLS 1.3 strictly enforced via Vercel and Supabase.
- **Data at Rest:** AES-256 encryption provided by Supabase.
- **API Security:**
  - JWT Access Tokens (15 min expiry) + Refresh Tokens.
  - Pydantic strict type coercion prevents mass assignment.
  - Parameterized queries prevent SQL Injection.
- **File Safety:**
  - Allow-list for MIME types (JPEG, PNG, PDF, DICOM).
  - Files stored private; accessed via signed URLs.
- **Audit Capability:** `created_by` and `updated_at` fields on all critical tables to ensure accountability.

---

## 8. Recommended Project Scaffold

```
dental-pms/
├── frontend/                  # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/            # Login page
│   │   └── (dashboard)/       # Protected layout
│   │       ├── patients/
│   │       ├── appointments/
│   │       └── settings/
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── patients/          # PatientTable, PatientForm
│   │   ├── scheduling/        # Calendar, SlotPicker
│   │   └── clinical/          # SOAPEditor, ToothChart
│   ├── lib/                   # API fetcher, utils
│   └── types/                 # TS interfaces mirroring Pydantic models
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── core/              # Config, Security, JWT logic
│   │   ├── models/            # SQLAlchemy Table definitions
│   │   ├── schemas/           # Pydantic v2 Models
│   │   ├── api/v1/            # Endpoints (patients.py, appointments.py)
│   │   └── services/          # Business logic (reminder service, doc handler)
│   ├── alembic/               # DB Migrations
│   └── requirements.txt
│
└── docker-compose.yml         # Optional local dev stack
```

---

## 9. Development Phasing Strategy

### Sprint 1–2: Foundation

- Infrastructure setup (Vercel, Supabase, Railway).
- Database schema migration.
- Auth module (Login, JWT issuance, Middleware).

### Sprint 3–4: Core Operations

- Patient registration & search.
- Appointment CRUD + Calendar UI.
- Status management workflow.

### Sprint 5–6: Clinical Execution

- Clinical notes editor (SOAP).
- Treatment logging against teeth.
- Document upload and retrieval logic.

### Sprint 7: Communication & Polish

- Twilio/SendGrid integration for reminders.
- Dashboard "Today's View" implementation.
- Production deployment and smoke testing.

---

## 10. API Reference

All endpoints are prefixed with `/api/v1`. All authenticated requests require the header `Authorization: Bearer <access_token>`.

### 10.1 Authentication

#### `POST /auth/login`
Authenticate user and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "dentist@clinic.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "dentist@clinic.com",
    "full_name": "Dr. Smith",
    "role": "dentist"
  }
}
```

**Error `401`:**
```json
{ "detail": "Invalid email or password" }
```

---

#### `POST /auth/refresh`
Exchange refresh token for new access token.

**Request Body:**
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIs..." }
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

#### `POST /auth/forgot-password`
Send password reset email.

**Request Body:**
```json
{ "email": "dentist@clinic.com" }
```

**Response `200`:**
```json
{ "message": "If the email exists, a reset link has been sent" }
```

---

#### `POST /auth/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newSecurePassword456"
}
```

**Response `200`:**
```json
{ "message": "Password reset successful" }
```

---

#### `GET /auth/me`
Get current authenticated user profile.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "dentist@clinic.com",
  "full_name": "Dr. Smith",
  "role": "dentist",
  "is_active": true,
  "created_at": "2026-01-15T09:30:00Z"
}
```

---

#### `PUT /auth/me`
Update current user profile.

**Request Body:**
```json
{
  "full_name": "Dr. John Smith",
  "email": "dr.smith@clinic.com"
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "dr.smith@clinic.com",
  "full_name": "Dr. John Smith",
  "role": "dentist",
  "is_active": true,
  "updated_at": "2026-05-28T14:00:00Z"
}
```

---

#### `PUT /auth/change-password`
Change password (requires current password).

**Request Body:**
```json
{
  "current_password": "oldPassword",
  "new_password": "newSecurePassword789"
}
```

**Response `200`:**
```json
{ "message": "Password changed successfully" }
```

**Error `400`:**
```json
{ "detail": "Current password is incorrect" }
```

---

### 10.2 Users Management *(Dentist Only)*

#### `GET /users`
List all system users.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `role` | string | optional | Filter by `dentist` or `receptionist` |
| `is_active` | boolean | optional | Filter by active status |
| `search` | string | optional | Search by name or email |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max 100) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "reception@clinic.com",
      "full_name": "Jane Doe",
      "role": "receptionist",
      "is_active": true,
      "created_at": "2026-01-15T09:30:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 2, "total_pages": 1 }
}
```

---

#### `POST /users`
Create new system user.

**Request Body:**
```json
{
  "email": "assistant@clinic.com",
  "password": "tempPassword123",
  "full_name": "Mike Wilson",
  "role": "receptionist"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "email": "assistant@clinic.com",
  "full_name": "Mike Wilson",
  "role": "receptionist",
  "is_active": true,
  "created_at": "2026-05-28T14:00:00Z"
}
```

---

#### `GET /users/{user_id}`
Get specific user details. **Response `200`** returns full user object including `updated_at`.

#### `PUT /users/{user_id}`
Update user details (name, email, role, active status).

#### `DELETE /users/{user_id}`
Deactivate user (soft delete). **Response `200`:** `{ "message": "User deactivated successfully" }`

#### `POST /users/{user_id}/reset-password`
Admin-forced password reset.

**Request Body:**
```json
{ "new_password": "forcedReset456" }
```

**Response `200`:** `{ "message": "Password reset by admin" }`

---

### 10.3 Patients

#### `GET /patients`
List/search patients with pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | optional | Search by name, phone, or email |
| `is_active` | boolean | true | Filter active/inactive |
| `registration_date_from` | date | optional | Range start |
| `registration_date_to` | date | optional | Range end |
| `sort_by` | string | `created_at` | `first_name`, `last_name`, `created_at` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max 100) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1985-03-15",
      "gender": "male",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St, City",
      "emergency_contact": { "name": "Jane Doe", "phone": "+0987654321", "relationship": "Spouse" },
      "medical_notes": "Allergic to penicillin. Type 2 diabetes.",
      "is_active": true,
      "registration_date": "2025-06-15",
      "created_by": { "id": "uuid", "full_name": "Jane Doe" },
      "created_at": "2025-06-15T10:30:00Z",
      "updated_at": "2026-05-20T14:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 1050, "total_pages": 53 }
}
```

---

#### `POST /patients`
Register new patient.

**Request Body:**
```json
{
  "first_name": "Sarah",
  "last_name": "Connor",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah@example.com",
  "address": "456 Oak Ave, City, State 12345",
  "emergency_contact": { "name": "Kyle Reese", "phone": "+5544332211", "relationship": "Partner" },
  "medical_notes": "Pregnant - 2nd trimester. Avoid NSAIDs."
}
```

**Validation Rules:**
- `first_name` / `last_name`: Required, 1–100 chars
- `date_of_birth`: Required, valid date, not in future
- `phone`: Required, unique, E.164 format recommended
- `email`: Optional, valid format, unique if provided
- `medical_notes`: Optional, max 5000 chars

**Response `201`:** Full patient object. **Error `409`:** `{ "detail": "A patient with this phone number already exists" }`

---

#### `GET /patients/{patient_id}`
Get detailed patient profile including a `stats` object:

```json
"stats": {
  "total_appointments": 5,
  "total_treatments": 8,
  "total_amount": 1500.00,
  "last_visit_date": "2026-05-20",
  "upcoming_appointment": { "id": "uuid", "date": "2026-06-15", "time": "10:00", "type": "checkup" }
}
```

**Error `404`:** `{ "detail": "Patient not found" }`

#### `PUT /patients/{patient_id}`
Update patient information. Returns updated patient object.

#### `DELETE /patients/{patient_id}`
Soft-delete patient. **Response `200`:** `{ "message": "Patient deactivated successfully" }`

---

#### `GET /patients/{patient_id}/appointments`
Get all appointments for a patient (supports `status`, `date_from`, `date_to`, pagination).

#### `GET /patients/{patient_id}/treatments`
Get treatment history (supports `status`, `tooth_number`, `sort_order`, pagination).

#### `GET /patients/{patient_id}/clinical-notes`
Get SOAP note history (supports `date_from`, `date_to`, pagination).

#### `GET /patients/{patient_id}/documents`
Get all documents (supports `document_type`, pagination).

#### `GET /patients/search/quick`
Autocomplete search.

**Query Parameters:** `q` (required, min 2 chars), `limit` (default 10).

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "first_name": "Sarah", "last_name": "Connor-Smith", "phone": "+1122334455", "date_of_birth": "1990-08-22", "last_visit_date": "2026-05-20" }
  ]
}
```

---

### 10.4 Appointments

#### `GET /appointments`
List appointments with filtering.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `date` | date | today | Specific date |
| `date_from` / `date_to` | date | optional | Range filter |
| `status` | string | optional | Comma-separated statuses |
| `dentist_id` | uuid | optional | Filter by dentist |
| `patient_id` | uuid | optional | Filter by patient |
| `search` | string | optional | Search by patient name |
| `sort_by` | string | `start_time` | `start_time` or `created_at` |
| `sort_order` | string | `asc` | `asc` or `desc` |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Items per page |

Response includes a `summary` object with counts per status.

---

#### `POST /appointments`
Create new appointment.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "dentist_id": "uuid",
  "appointment_date": "2026-06-15",
  "start_time": "14:00",
  "end_time": "14:45",
  "appointment_type": "cleaning",
  "notes": "Patient requested evening slot"
}
```

**Validation Rules:**
- `patient_id` / `dentist_id`: Must be active records
- `appointment_date`: Not in past
- `start_time`: Within configured working hours
- `end_time`: After `start_time`
- No overlapping appointments for the same dentist

**Error `409`:** `{ "detail": "Time slot conflict. Dentist has an existing appointment from 13:30 to 14:15." }`

---

#### `GET /appointments/{appointment_id}`
Get full appointment details including patient medical notes.

#### `PUT /appointments/{appointment_id}`
Update appointment date, time, type, or notes.

#### `DELETE /appointments/{appointment_id}`
Cancel appointment. Requires `cancellation_reason` in body.

---

#### `PATCH /appointments/{appointment_id}/status`
Advance appointment through the status workflow.

**Status Transition Rules:**

| Current Status | Allowed Transitions |
|---|---|
| `scheduled` | `confirmed`, `cancelled` |
| `confirmed` | `checked_in`, `cancelled`, `no_show` |
| `checked_in` | `in_progress`, `cancelled` |
| `in_progress` | `completed` |
| `completed` | *(terminal)* |
| `cancelled` | `scheduled` *(reopen)* |
| `no_show` | `scheduled` *(reopen)* |

**Response `200`:**
```json
{ "id": "uuid", "status": "checked_in", "previous_status": "confirmed", "updated_at": "2026-05-28T14:05:00Z" }
```

**Error `422`:** `{ "detail": "Invalid status transition from 'completed' to 'checked_in'" }`

---

#### `GET /appointments/calendar`
Optimized calendar view data.

**Query Parameters:** `start_date` (required), `end_date` (required), `dentist_id` (optional).

Response includes `appointments` array with color codes and `blocked_slots` array.

---

#### `GET /appointments/stats/daily`
Daily appointment statistics. **Query Parameter:** `date` (default: today).

#### `GET /appointments/slots/available`
Available time slots for a given date and dentist. Returns `available_slots` and `booked_slots` arrays.

---

### 10.5 Clinical Notes (SOAP)

#### `GET /clinical-notes`
List SOAP notes. Supports `patient_id`, `appointment_id`, `created_by`, `date_from`, `date_to`, pagination.

#### `POST /clinical-notes`
Create a SOAP note. **Role Required:** `dentist`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "subjective": "Patient reports severe pain in upper right quadrant for 3 days...",
  "objective": "Periapical radiograph of tooth #16 shows radiolucency at apex...",
  "assessment": "Acute apical periodontitis on tooth #16. Likely pulpal necrosis.",
  "plan": "1. Root canal treatment tooth #16. 2. Prescribe amoxicillin 500mg TID for 7 days..."
}
```

**Validation Rules:** All four SOAP fields are required, min 10 chars, max 5000 chars each.

---

#### `GET /clinical-notes/{note_id}`
Get a specific SOAP note with full patient and appointment context.

#### `PUT /clinical-notes/{note_id}`
Update a SOAP note. **Role Required:** `dentist`. Only the creator can edit.

**Error `403`:** `{ "detail": "You can only edit your own clinical notes" }`

#### `DELETE /clinical-notes/{note_id}`
Delete a SOAP note. **Role Required:** `dentist`. Only the creator can delete.

---

### 10.6 Treatments

#### `GET /treatments`
List treatments. Supports `patient_id`, `appointment_id`, `status`, `tooth_number`, `performed_by`, date range, pagination.

#### `POST /treatments`
Record a new treatment. **Role Required:** `dentist`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "tooth_number": "36",
  "procedure_code": "D2391",
  "procedure_name": "Composite Filling - 1 surface",
  "description": "Occlusal composite restoration on lower left first molar. Shade A2 used.",
  "amount": 250.00,
  "status": "completed",
  "performed_date": "2026-05-28"
}
```

**Validation Rules:**
- `tooth_number`: Valid FDI notation (11–18, 21–28, 31–38, 41–48) or `"general"`
- `amount`: Non-negative decimal with 2 decimal places
- `performed_date`: Not in future

---

#### `GET /treatments/{treatment_id}`
Get a specific treatment record.

#### `PUT /treatments/{treatment_id}`
Update treatment details. **Role Required:** `dentist`

#### `DELETE /treatments/{treatment_id}`
Delete a treatment record. **Role Required:** `dentist`

---

### 10.7 Documents

#### `GET /documents`
List documents. Supports `patient_id`, `appointment_id`, `document_type`, `uploaded_by`, date range, pagination.

---

#### `POST /documents/upload`
Upload a new document. **Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | Document file |
| `patient_id` | string | Yes | UUID of patient |
| `appointment_id` | string | No | UUID of appointment |
| `treatment_id` | string | No | UUID of treatment |
| `document_type` | string | Yes | `xray`, `photo`, `consent_form`, `prescription`, `lab_report`, `other` |
| `notes` | string | No | Additional notes |

**File Validation:**
- Max size: 50 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/dicom`, `application/pdf`
- Filename sanitized before storage

**Error `413`:** File exceeds 50 MB. **Error `415`:** MIME type not on allow-list.

---

#### `GET /documents/{document_id}`
Get document metadata including a signed `download_url`.

#### `GET /documents/{document_id}/download`
Stream the binary file with proper `Content-Type` and `Content-Disposition` headers.

#### `GET /documents/{document_id}/thumbnail`
Return a resized preview image (max 400 px). Only valid for image MIME types — returns `400` for non-images.

#### `DELETE /documents/{document_id}`
Delete document and remove from storage. **Role Required:** `dentist`

---

### 10.8 Communications & Reminders

#### `GET /communications`
List communication logs. Supports `patient_id`, `appointment_id`, `communication_type` (`sms`/`email`), `status`, date range, pagination.

---

#### `POST /communications/send`
Send a manual message to a patient.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "communication_type": "sms",
  "message_content": "Hi Sarah, your appointment has been rescheduled to June 16 at 3:00 PM. Please confirm."
}
```

**Validation Rules:**
- Patient must have a valid phone number (for SMS) or email (for email)
- `message_content`: max 160 chars for SMS, max 2000 chars for email

**Error `400`:** `{ "detail": "Patient does not have a phone number on file" }`

---

#### `POST /communications/reminders/trigger`
Manually trigger a configured reminder for a specific appointment.

**Request Body:**
```json
{ "appointment_id": "uuid", "reminder_config_id": "uuid" }
```

---

#### `POST /communications/reminders/bulk`
Bulk-trigger reminders for all of tomorrow's appointments.

**Response `200`:**
```json
{
  "message": "Bulk reminders triggered",
  "total_appointments": 18,
  "reminders_sent": 16,
  "reminders_failed": 2,
  "failures": [
    { "appointment_id": "uuid", "patient_name": "Mike Johnson", "reason": "No phone number on file" }
  ]
}
```

---

#### `GET /reminders/configs`
List all reminder configurations (name, hours before appointment, channel, template, active status).

#### `POST /reminders/configs`
Create a reminder configuration. **Role Required:** `dentist`

**Request Body:**
```json
{
  "name": "48hr_before_sms",
  "hours_before_appointment": 48,
  "communication_type": "sms",
  "template": "Hi {{patient_name}}, you have a {{appointment_type}} appointment in 2 days at {{appointment_time}}.",
  "is_active": true
}
```

#### `PUT /reminders/configs/{config_id}`
Update template or active status. **Role Required:** `dentist`

#### `DELETE /reminders/configs/{config_id}`
Delete a reminder configuration. **Role Required:** `dentist`

---

### 10.9 Analytics & Dashboard

#### `GET /dashboard/summary`
Dashboard snapshot for today.

**Response `200`:**
```json
{
  "date": "2026-05-28",
  "appointments": {
    "total": 18, "scheduled": 12, "confirmed": 3,
    "checked_in": 2, "in_progress": 1, "completed": 0,
    "cancelled": 0, "no_show": 0
  },
  "financial": {
    "total_amount_today": 2500.00,
    "total_amount_this_week": 12500.00,
    "total_amount_this_month": 45000.00
  },
  "patients": {
    "total_active": 1050,
    "new_this_month": 25,
    "total_appointments_this_month": 320
  }
}
```

---

#### `GET /analytics/revenue`
Revenue analytics over a period.

**Query Parameters:** `period` (`daily`/`weekly`/`monthly`/`yearly`), `date_from`, `date_to`, `group_by` (`procedure`/`tooth`/`month`).

---

#### `GET /analytics/procedures`
Top procedure frequency and revenue. Supports `date_from`, `date_to`, `limit` (default 10).

#### `GET /analytics/patients`
Patient demographics: total counts, age distribution, gender distribution, visit frequency.

---

### 10.10 Settings & Configuration

#### `GET /settings/clinic`
Get clinic settings including working hours and default appointment durations.

#### `PUT /settings/clinic`
Update clinic details, working hours, and appointment durations. **Role Required:** `dentist`

---

#### `GET /settings/procedures`
List configured procedure codes with default amounts, durations, and categories.

#### `POST /settings/procedures`
Add a new procedure code. **Role Required:** `dentist`

**Request Body:**
```json
{
  "code": "D2750",
  "name": "Crown - Porcelain/Ceramic",
  "default_amount": 1200.00,
  "default_duration_minutes": 90,
  "category": "restorative"
}
```

#### `PUT /settings/procedures/{procedure_id}`
Update a procedure's default amount or active status. **Role Required:** `dentist`

---

### 10.11 Common HTTP Responses

#### Authentication Errors
```json
// 401 Unauthorized
{ "detail": "Not authenticated" }

// 401 Token Expired
{ "detail": "Token has expired" }

// 403 Forbidden
{ "detail": "You do not have permission to perform this action" }
```

#### Validation Errors
```json
// 422 Unprocessable Entity
{
  "detail": [
    { "loc": ["body", "first_name"], "msg": "field required", "type": "value_error.missing" },
    { "loc": ["body", "phone"], "msg": "invalid phone format", "type": "value_error" }
  ]
}
```

#### Not Found / Rate Limit / Server Error
```json
// 404 Not Found
{ "detail": "Resource not found" }

// 429 Too Many Requests
{ "detail": "Rate limit exceeded. Try again in 60 seconds." }

// 500 Internal Server Error
{ "detail": "An unexpected error occurred" }
```

---

### 10.12 API-wide Headers

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

**Response Headers:**
```
Content-Type: application/json
X-Request-ID: <uuid>
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622200000
```

---

### 10.13 Endpoint Quick Reference

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| **Auth** | | | | |
| POST | `/auth/login` | No | — | Login |
| POST | `/auth/refresh` | No | — | Refresh token |
| POST | `/auth/forgot-password` | No | — | Request reset |
| POST | `/auth/reset-password` | No | — | Reset password |
| GET | `/auth/me` | Yes | Any | Current user |
| PUT | `/auth/me` | Yes | Any | Update profile |
| PUT | `/auth/change-password` | Yes | Any | Change password |
| **Users** | | | | |
| GET | `/users` | Yes | Dentist | List users |
| POST | `/users` | Yes | Dentist | Create user |
| GET | `/users/{id}` | Yes | Dentist | Get user |
| PUT | `/users/{id}` | Yes | Dentist | Update user |
| DELETE | `/users/{id}` | Yes | Dentist | Deactivate user |
| POST | `/users/{id}/reset-password` | Yes | Dentist | Admin reset password |
| **Patients** | | | | |
| GET | `/patients` | Yes | Any | List/search patients |
| POST | `/patients` | Yes | Any | Register patient |
| GET | `/patients/search/quick` | Yes | Any | Quick autocomplete |
| GET | `/patients/{id}` | Yes | Any | Get patient |
| PUT | `/patients/{id}` | Yes | Any | Update patient |
| DELETE | `/patients/{id}` | Yes | Any | Deactivate patient |
| GET | `/patients/{id}/appointments` | Yes | Any | Patient appointments |
| GET | `/patients/{id}/treatments` | Yes | Any | Patient treatments |
| GET | `/patients/{id}/clinical-notes` | Yes | Any | Patient SOAP notes |
| GET | `/patients/{id}/documents` | Yes | Any | Patient documents |
| **Appointments** | | | | |
| GET | `/appointments` | Yes | Any | List appointments |
| POST | `/appointments` | Yes | Any | Create appointment |
| GET | `/appointments/calendar` | Yes | Any | Calendar view |
| GET | `/appointments/stats/daily` | Yes | Any | Daily stats |
| GET | `/appointments/slots/available` | Yes | Any | Available slots |
| GET | `/appointments/{id}` | Yes | Any | Get appointment |
| PUT | `/appointments/{id}` | Yes | Any | Update appointment |
| DELETE | `/appointments/{id}` | Yes | Any | Cancel appointment |
| PATCH | `/appointments/{id}/status` | Yes | Any | Update status |
| **Clinical Notes** | | | | |
| GET | `/clinical-notes` | Yes | Any | List notes |
| POST | `/clinical-notes` | Yes | Dentist | Create note |
| GET | `/clinical-notes/{id}` | Yes | Any | Get note |
| PUT | `/clinical-notes/{id}` | Yes | Dentist | Update note |
| DELETE | `/clinical-notes/{id}` | Yes | Dentist | Delete note |
| **Treatments** | | | | |
| GET | `/treatments` | Yes | Any | List treatments |
| POST | `/treatments` | Yes | Dentist | Record treatment |
| GET | `/treatments/{id}` | Yes | Any | Get treatment |
| PUT | `/treatments/{id}` | Yes | Dentist | Update treatment |
| DELETE | `/treatments/{id}` | Yes | Dentist | Delete treatment |
| **Documents** | | | | |
| GET | `/documents` | Yes | Any | List documents |
| POST | `/documents/upload` | Yes | Any | Upload document |
| GET | `/documents/{id}` | Yes | Any | Get metadata |
| GET | `/documents/{id}/download` | Yes | Any | Download file |
| GET | `/documents/{id}/thumbnail` | Yes | Any | Get thumbnail |
| DELETE | `/documents/{id}` | Yes | Dentist | Delete document |
| **Communications** | | | | |
| GET | `/communications` | Yes | Any | List logs |
| POST | `/communications/send` | Yes | Any | Send message |
| POST | `/communications/reminders/trigger` | Yes | Any | Trigger reminder |
| POST | `/communications/reminders/bulk` | Yes | Any | Bulk reminders |
| GET | `/reminders/configs` | Yes | Any | List configs |
| POST | `/reminders/configs` | Yes | Dentist | Create config |
| PUT | `/reminders/configs/{id}` | Yes | Dentist | Update config |
| DELETE | `/reminders/configs/{id}` | Yes | Dentist | Delete config |
| **Dashboard & Analytics** | | | | |
| GET | `/dashboard/summary` | Yes | Any | Dashboard summary |
| GET | `/analytics/revenue` | Yes | Any | Revenue analytics |
| GET | `/analytics/procedures` | Yes | Any | Procedure analytics |
| GET | `/analytics/patients` | Yes | Any | Patient analytics |
| **Settings** | | | | |
| GET | `/settings/clinic` | Yes | Any | Get clinic settings |
| PUT | `/settings/clinic` | Yes | Dentist | Update settings |
| GET | `/settings/procedures` | Yes | Any | List procedures |
| POST | `/settings/procedures` | Yes | Dentist | Add procedure |
| PUT | `/settings/procedures/{id}` | Yes | Dentist | Update procedure |

---

*End of Specification — 65 API endpoints across 10 resource modules.*
