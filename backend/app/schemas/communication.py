from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
import re

SUPPORTED_PLACEHOLDERS = frozenset([
    "patient_name", "appointment_type",
    "appointment_time", "appointment_date", "clinic_name"
])


class ReminderConfigCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    hours_before_appointment: int = Field(gt=0)
    communication_type: Literal["sms", "email"]
    template: str = Field(min_length=1)
    is_active: bool = True

    @field_validator("template")
    @classmethod
    def validate_placeholders(cls, v: str) -> str:
        found = set(re.findall(r"\{\{(\w+)\}\}", v))
        invalid = found - SUPPORTED_PLACEHOLDERS
        if invalid:
            raise ValueError(
                f"Unknown placeholders: {invalid}. "
                f"Supported: {SUPPORTED_PLACEHOLDERS}"
            )
        return v


class ReminderConfigUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    template: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("template")
    @classmethod
    def validate_placeholders(cls, v: str | None) -> str | None:
        if v is None:
            return v
        found = set(re.findall(r"\{\{(\w+)\}\}", v))
        invalid = found - SUPPORTED_PLACEHOLDERS
        if invalid:
            raise ValueError(
                f"Unknown placeholders: {invalid}. "
                f"Supported: {SUPPORTED_PLACEHOLDERS}"
            )
        return v


class ReminderConfigResponse(BaseModel):
    id: UUID
    name: str
    hours_before_appointment: int
    communication_type: str
    template: str
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ManualSendRequest(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    communication_type: Literal["sms", "email"]
    message_content: str

    @field_validator("message_content")
    @classmethod
    def validate_length(cls, v: str, info) -> str:
        comm_type = info.data.get("communication_type")
        if comm_type == "sms" and len(v) > 160:
            raise ValueError("SMS messages cannot exceed 160 characters")
        if len(v) > 2000:
            raise ValueError("Message content cannot exceed 2000 characters")
        if len(v) == 0:
            raise ValueError("Message cannot be empty")
        return v


class TriggerReminderRequest(BaseModel):
    appointment_id: UUID
    reminder_config_id: UUID


class CommunicationResponse(BaseModel):
    id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID]
    communication_type: str
    direction: str
    message_content: str
    status: str
    failure_reason: Optional[str]
    provider_message_id: Optional[str]
    sent_at: datetime
    delivered_at: Optional[datetime]
    created_by: Optional[UUID]
    is_automated: bool

    model_config = {"from_attributes": True}


class BulkReminderResponse(BaseModel):
    message: str
    total_appointments: int
    reminders_sent: int
    reminders_failed: int
    failures: list[dict]


class PaginatedCommunications(BaseModel):
    data: list[CommunicationResponse]
    pagination: dict
