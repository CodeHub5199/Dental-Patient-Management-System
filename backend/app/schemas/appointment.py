from datetime import date, datetime, time
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AppointmentCreate(BaseModel):
    patient_id: UUID
    dentist_id: UUID
    appointment_date: date
    start_time: time
    end_time: time
    appointment_type: str = Field(min_length=1, max_length=100)
    notes: Optional[str] = None

    @field_validator("appointment_date")
    @classmethod
    def not_in_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Appointment date cannot be in the past")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "AppointmentCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    appointment_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    notes: Optional[str] = None


class StatusTransition(BaseModel):
    status: Literal[
        "scheduled", "confirmed", "checked_in",
        "in_progress", "completed", "cancelled", "no_show"
    ]
    cancellation_reason: Optional[str] = None


class CancelAppointment(BaseModel):
    cancellation_reason: str = Field(min_length=1)


class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    dentist_id: UUID
    appointment_date: date
    start_time: time
    end_time: time
    duration_minutes: Optional[int]
    status: str
    appointment_type: str
    notes: Optional[str]
    cancellation_reason: Optional[str]
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppointmentWithPatient(AppointmentResponse):
    """Appointment response that includes joined patient display fields."""
    patient_name: str
    patient_phone: str
    color: Optional[str] = None


class StatusTransitionResponse(BaseModel):
    id: UUID
    status: str
    previous_status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAppointments(BaseModel):
    data: list[AppointmentWithPatient]
    summary: dict
    pagination: dict
