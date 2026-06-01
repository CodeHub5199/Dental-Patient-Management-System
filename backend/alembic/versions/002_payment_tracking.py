"""Add payments table

Revision ID: 002
Revises: 001
Create Date: 2026-06-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.Text(), nullable=False, server_default="cash"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "recorded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("amount > 0", name="chk_payment_amount_positive"),
        sa.CheckConstraint(
            "payment_method IN ('cash','card','bank_transfer','insurance','other')",
            name="chk_payment_method",
        ),
    )
    op.create_index("idx_payments_patient", "payments", ["patient_id"])
    op.create_index("idx_payments_date", "payments", ["payment_date"])
    op.create_index("idx_payments_patient_date", "payments", ["patient_id", "payment_date"])


def downgrade() -> None:
    op.drop_index("idx_payments_patient_date", "payments")
    op.drop_index("idx_payments_date", "payments")
    op.drop_index("idx_payments_patient", "payments")
    op.drop_table("payments")
