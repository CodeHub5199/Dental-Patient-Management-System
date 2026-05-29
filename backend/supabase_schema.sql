-- ============================================================
-- DPMS — Full Schema for Supabase SQL Editor
-- Run this entire script once in Supabase > SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('dentist', 'receptionist')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ── password_reset_tokens ──────────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX idx_prt_user_id    ON password_reset_tokens (user_id);

-- ── patients ───────────────────────────────────────────────────────────────────
CREATE TABLE patients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    date_of_birth     DATE NOT NULL,
    gender            TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    phone             TEXT NOT NULL,
    email             TEXT,
    address           TEXT,
    emergency_contact JSONB,
    medical_notes     TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by        UUID NOT NULL REFERENCES users (id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_patients_phone       ON patients (phone);
CREATE UNIQUE INDEX idx_patients_email       ON patients (email) WHERE email IS NOT NULL;
CREATE INDEX idx_patients_first_name_trgm    ON patients USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_patients_last_name_trgm     ON patients USING gin (last_name  gin_trgm_ops);
CREATE INDEX idx_patients_phone_trgm         ON patients USING gin (phone      gin_trgm_ops);
CREATE INDEX idx_patients_active_created     ON patients (is_active, created_at DESC);

-- ── clinic_settings ────────────────────────────────────────────────────────────
CREATE TABLE clinic_settings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name           TEXT NOT NULL,
    timezone              TEXT NOT NULL DEFAULT 'America/New_York',
    working_hours         JSONB NOT NULL DEFAULT '{
        "monday":    {"start":"09:00","end":"17:00"},
        "tuesday":   {"start":"09:00","end":"17:00"},
        "wednesday": {"start":"09:00","end":"17:00"},
        "thursday":  {"start":"09:00","end":"17:00"},
        "friday":    {"start":"09:00","end":"14:00"},
        "saturday":  null,
        "sunday":    null
    }',
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    phone                 TEXT,
    email                 TEXT,
    address               TEXT,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── appointments ───────────────────────────────────────────────────────────────
CREATE TABLE appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patients (id),
    dentist_id          UUID NOT NULL REFERENCES users (id),
    appointment_date    DATE NOT NULL,
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    duration_minutes    INT,
    status              TEXT NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN (
                                'scheduled', 'confirmed', 'checked_in',
                                'in_progress', 'completed', 'cancelled', 'no_show'
                            )),
    appointment_type    TEXT NOT NULL,
    notes               TEXT,
    cancellation_reason TEXT,
    created_by          UUID NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_end_after_start CHECK (end_time > start_time),

    EXCLUDE USING gist (
        dentist_id WITH =,
        tstzrange(
            (appointment_date + start_time) AT TIME ZONE 'UTC',
            (appointment_date + end_time)   AT TIME ZONE 'UTC'
        ) WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

CREATE INDEX idx_appts_date         ON appointments (appointment_date);
CREATE INDEX idx_appts_patient      ON appointments (patient_id);
CREATE INDEX idx_appts_dentist_date ON appointments (dentist_id, appointment_date);
CREATE INDEX idx_appts_status       ON appointments (status);

-- ── clinical_notes ─────────────────────────────────────────────────────────────
CREATE TABLE clinical_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id     UUID NOT NULL REFERENCES patients (id),
    appointment_id UUID REFERENCES appointments (id),
    subjective     TEXT NOT NULL,
    objective      TEXT NOT NULL,
    assessment     TEXT NOT NULL,
    plan           TEXT NOT NULL,
    created_by     UUID NOT NULL REFERENCES users (id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cn_patient     ON clinical_notes (patient_id);
CREATE INDEX idx_cn_appointment ON clinical_notes (appointment_id);
CREATE INDEX idx_cn_created_at  ON clinical_notes (patient_id, created_at DESC);

-- ── treatments ─────────────────────────────────────────────────────────────────
CREATE TABLE treatments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id     UUID NOT NULL REFERENCES patients (id),
    appointment_id UUID REFERENCES appointments (id),
    tooth_number   TEXT NOT NULL,
    procedure_code TEXT,
    procedure_name TEXT NOT NULL,
    description    TEXT,
    amount         NUMERIC(10, 2) CHECK (amount >= 0),
    status         TEXT NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('planned', 'in_progress', 'completed')),
    performed_by   UUID NOT NULL REFERENCES users (id),
    performed_date DATE NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_performed_not_future CHECK (performed_date <= CURRENT_DATE)
);

CREATE INDEX idx_tx_patient     ON treatments (patient_id);
CREATE INDEX idx_tx_appointment ON treatments (appointment_id);
CREATE INDEX idx_tx_tooth       ON treatments (patient_id, tooth_number);
CREATE INDEX idx_tx_status      ON treatments (patient_id, status);

-- ── documents ──────────────────────────────────────────────────────────────────
CREATE TABLE documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id     UUID NOT NULL REFERENCES patients (id),
    appointment_id UUID REFERENCES appointments (id),
    treatment_id   UUID REFERENCES treatments (id),
    document_type  TEXT NOT NULL
                       CHECK (document_type IN (
                           'xray', 'photo', 'consent_form',
                           'prescription', 'lab_report', 'other'
                       )),
    file_name      TEXT NOT NULL,
    storage_path   TEXT NOT NULL UNIQUE,
    file_size      BIGINT NOT NULL,
    mime_type      TEXT NOT NULL,
    notes          TEXT,
    has_thumbnail  BOOLEAN NOT NULL DEFAULT FALSE,
    thumbnail_path TEXT,
    uploaded_by    UUID NOT NULL REFERENCES users (id),
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_patient     ON documents (patient_id);
CREATE INDEX idx_docs_appointment ON documents (appointment_id);
CREATE INDEX idx_docs_type        ON documents (patient_id, document_type);
CREATE INDEX idx_docs_uploaded_at ON documents (patient_id, uploaded_at DESC);

-- ── communications ─────────────────────────────────────────────────────────────
CREATE TABLE communications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patients (id),
    appointment_id      UUID REFERENCES appointments (id),
    communication_type  TEXT NOT NULL CHECK (communication_type IN ('sms', 'email')),
    direction           TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound')),
    message_content     TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent', 'delivered', 'failed')),
    failure_reason      TEXT,
    provider_message_id TEXT,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at        TIMESTAMPTZ,
    created_by          UUID REFERENCES users (id),
    is_automated        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_comm_patient  ON communications (patient_id);
CREATE INDEX idx_comm_appt     ON communications (appointment_id);
CREATE INDEX idx_comm_sent_at  ON communications (sent_at DESC);
CREATE INDEX idx_comm_status   ON communications (status);

-- ── reminder_configs ───────────────────────────────────────────────────────────
CREATE TABLE reminder_configs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     TEXT NOT NULL,
    hours_before_appointment INT NOT NULL CHECK (hours_before_appointment > 0),
    communication_type       TEXT NOT NULL CHECK (communication_type IN ('sms', 'email')),
    template                 TEXT NOT NULL,
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    created_by               UUID NOT NULL REFERENCES users (id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── reminder_dispatch_log ──────────────────────────────────────────────────────
CREATE TABLE reminder_dispatch_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments (id),
    config_id      UUID NOT NULL REFERENCES reminder_configs (id),
    dispatched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (appointment_id, config_id)
);

-- ── procedures ─────────────────────────────────────────────────────────────────
CREATE TABLE procedures (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                     TEXT UNIQUE,
    name                     TEXT NOT NULL,
    default_amount           NUMERIC(10, 2),
    default_duration_minutes INT,
    category                 TEXT,
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
