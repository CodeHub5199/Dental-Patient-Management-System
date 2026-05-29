import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Communication(Base):
    __tablename__ = "communications"
    __table_args__ = (
        CheckConstraint(
            "communication_type IN ('sms','email')", name="chk_comm_type"
        ),
        CheckConstraint(
            "status IN ('sent','delivered','failed')", name="chk_comm_status"
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
    communication_type: Mapped[str] = mapped_column(String(10), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="outbound")
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="sent")
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    is_automated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    patient = relationship("Patient", back_populates="communications")
    appointment = relationship("Appointment", back_populates="communications")
    sender = relationship("User", back_populates="communications")


class ReminderConfig(Base):
    __tablename__ = "reminder_configs"
    __table_args__ = (
        CheckConstraint(
            "communication_type IN ('sms','email')", name="chk_rc_type"
        ),
        CheckConstraint("hours_before_appointment > 0", name="chk_rc_hours"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hours_before_appointment: Mapped[int] = mapped_column(nullable=False)
    communication_type: Mapped[str] = mapped_column(String(10), nullable=False)
    template: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )

    dispatch_logs = relationship("ReminderDispatchLog", back_populates="config")


class ReminderDispatchLog(Base):
    __tablename__ = "reminder_dispatch_log"
    __table_args__ = (
        UniqueConstraint("appointment_id", "config_id", name="uq_dispatch_appt_config"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False
    )
    config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reminder_configs.id"), nullable=False
    )
    dispatched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )

    config = relationship("ReminderConfig", back_populates="dispatch_logs")
