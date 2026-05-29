"""Initial schema — all core tables

Revision ID: 001
Revises:
Create Date: 2026-05-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extensions ────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("role IN ('dentist','receptionist')", name="chk_users_role"),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_role", "users", ["role"])

    # ── password_reset_tokens ─────────────────────────────────────────────────
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_prt_token_hash", "password_reset_tokens", ["token_hash"])
    op.create_index("idx_prt_user_id", "password_reset_tokens", ["user_id"])

    # ── patients ──────────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("emergency_contact", postgresql.JSONB(), nullable=True),
        sa.Column("medical_notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("registration_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("gender IN ('male','female','other','prefer_not_to_say')", name="chk_patient_gender"),
    )
    op.create_index("idx_patients_phone", "patients", ["phone"], unique=True)
    op.execute("CREATE UNIQUE INDEX idx_patients_email ON patients(email) WHERE email IS NOT NULL")
    op.execute("CREATE INDEX idx_patients_first_name_trgm ON patients USING gin(first_name gin_trgm_ops)")
    op.execute("CREATE INDEX idx_patients_last_name_trgm ON patients USING gin(last_name gin_trgm_ops)")
    op.execute("CREATE INDEX idx_patients_phone_trgm ON patients USING gin(phone gin_trgm_ops)")
    op.create_index("idx_patients_active_created", "patients", ["is_active", sa.text("created_at DESC")])

    # ── clinic_settings ───────────────────────────────────────────────────────
    op.create_table(
        "clinic_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("clinic_name", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False, server_default="'America/New_York'"),
        sa.Column("working_hours", postgresql.JSONB(), nullable=False),
        sa.Column("slot_duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # ── appointments ──────────────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("dentist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="'scheduled'"),
        sa.Column("appointment_type", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("end_time > start_time", name="chk_end_after_start"),
        sa.CheckConstraint(
            "status IN ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show')",
            name="chk_appointment_status",
        ),
    )
    op.create_index("idx_appts_date", "appointments", ["appointment_date"])
    op.create_index("idx_appts_patient", "appointments", ["patient_id"])
    op.create_index("idx_appts_dentist_date", "appointments", ["dentist_id", "appointment_date"])
    op.create_index("idx_appts_status", "appointments", ["status"])

    # ── clinical_notes ────────────────────────────────────────────────────────
    op.create_table(
        "clinical_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("subjective", sa.Text(), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("assessment", sa.Text(), nullable=False),
        sa.Column("plan", sa.Text(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_cn_patient", "clinical_notes", ["patient_id"])
    op.create_index("idx_cn_appointment", "clinical_notes", ["appointment_id"])
    op.create_index("idx_cn_created_at", "clinical_notes", ["patient_id", sa.text("created_at DESC")])

    # ── treatments ────────────────────────────────────────────────────────────
    op.create_table(
        "treatments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("tooth_number", sa.Text(), nullable=False),
        sa.Column("procedure_code", sa.Text(), nullable=True),
        sa.Column("procedure_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="'completed'"),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("performed_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("amount >= 0", name="chk_amount_non_negative"),
        sa.CheckConstraint("status IN ('planned','in_progress','completed')", name="chk_treatment_status"),
    )
    op.create_index("idx_tx_patient", "treatments", ["patient_id"])
    op.create_index("idx_tx_appointment", "treatments", ["appointment_id"])
    op.create_index("idx_tx_tooth", "treatments", ["patient_id", "tooth_number"])
    op.create_index("idx_tx_status", "treatments", ["patient_id", "status"])

    # ── documents ─────────────────────────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("treatment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("treatments.id"), nullable=True),
        sa.Column("document_type", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False, unique=True),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("has_thumbnail", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("thumbnail_path", sa.Text(), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "document_type IN ('xray','photo','consent_form','prescription','lab_report','other')",
            name="chk_document_type",
        ),
    )
    op.create_index("idx_docs_patient", "documents", ["patient_id"])
    op.create_index("idx_docs_appointment", "documents", ["appointment_id"])
    op.create_index("idx_docs_type", "documents", ["patient_id", "document_type"])
    op.create_index("idx_docs_uploaded_at", "documents", ["patient_id", sa.text("uploaded_at DESC")])

    # ── communications ────────────────────────────────────────────────────────
    op.create_table(
        "communications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("communication_type", sa.Text(), nullable=False),
        sa.Column("direction", sa.Text(), nullable=False, server_default="'outbound'"),
        sa.Column("message_content", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="'sent'"),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("provider_message_id", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_automated", sa.Boolean(), nullable=False, server_default="false"),
        sa.CheckConstraint("communication_type IN ('sms','email')", name="chk_comm_type"),
        sa.CheckConstraint("status IN ('sent','delivered','failed')", name="chk_comm_status"),
    )
    op.create_index("idx_comm_patient", "communications", ["patient_id"])
    op.create_index("idx_comm_appt", "communications", ["appointment_id"])
    op.create_index("idx_comm_sent_at", "communications", [sa.text("sent_at DESC")])
    op.create_index("idx_comm_status", "communications", ["status"])

    # ── reminder_configs ──────────────────────────────────────────────────────
    op.create_table(
        "reminder_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("hours_before_appointment", sa.Integer(), nullable=False),
        sa.Column("communication_type", sa.Text(), nullable=False),
        sa.Column("template", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("communication_type IN ('sms','email')", name="chk_rc_type"),
        sa.CheckConstraint("hours_before_appointment > 0", name="chk_rc_hours"),
    )

    # ── reminder_dispatch_log ─────────────────────────────────────────────────
    op.create_table(
        "reminder_dispatch_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), nullable=False),
        sa.Column("config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reminder_configs.id"), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("appointment_id", "config_id", name="uq_dispatch_appt_config"),
    )

    # ── procedures ────────────────────────────────────────────────────────────
    op.create_table(
        "procedures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.Text(), nullable=True, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("default_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("default_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("procedures")
    op.drop_table("reminder_dispatch_log")
    op.drop_table("reminder_configs")
    op.drop_table("communications")
    op.drop_table("documents")
    op.drop_table("treatments")
    op.drop_table("clinical_notes")
    op.drop_table("appointments")
    op.drop_table("clinic_settings")
    op.drop_table("patients")
    op.drop_table("password_reset_tokens")
    op.drop_table("users")
