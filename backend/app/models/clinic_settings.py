import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ClinicSettings(Base):
    __tablename__ = "clinic_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clinic_name: Mapped[str] = mapped_column(String(200), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="America/New_York")
    working_hours: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("""'{
            "monday":    {"start":"09:00","end":"17:00"},
            "tuesday":   {"start":"09:00","end":"17:00"},
            "wednesday": {"start":"09:00","end":"17:00"},
            "thursday":  {"start":"09:00","end":"17:00"},
            "friday":    {"start":"09:00","end":"14:00"},
            "saturday":  null,
            "sunday":    null
        }'::jsonb"""),
    )
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )
