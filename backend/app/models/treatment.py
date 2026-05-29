import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Treatment(Base):
    __tablename__ = "treatments"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_amount_non_negative"),
        CheckConstraint("performed_date <= CURRENT_DATE", name="chk_performed_not_future"),
        CheckConstraint(
            "status IN ('planned','in_progress','completed')",
            name="chk_treatment_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False
    )
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=True
    )
    tooth_number: Mapped[str] = mapped_column(String(10), nullable=False)
    procedure_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    procedure_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    performed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    performed_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )

    # Relationships
    patient = relationship("Patient", back_populates="treatments")
    appointment = relationship("Appointment", back_populates="treatments")
    performer = relationship("User", back_populates="treatments")
    documents = relationship("Document", back_populates="treatment")
