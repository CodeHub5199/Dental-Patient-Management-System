from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str


class PatientCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date
    gender: Optional[Literal["male", "female", "other", "prefer_not_to_say"]] = None
    phone: str = Field(min_length=1, max_length=30)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    medical_notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("date_of_birth")
    @classmethod
    def dob_not_in_future(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError("Date of birth cannot be today or in the future")
        return v


class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[Literal["male", "female", "other", "prefer_not_to_say"]] = None
    phone: Optional[str] = Field(default=None, min_length=1, max_length=30)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    medical_notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("date_of_birth")
    @classmethod
    def dob_not_in_future(cls, v: date | None) -> date | None:
        if v is not None and v >= date.today():
            raise ValueError("Date of birth cannot be today or in the future")
        return v


class UpcomingAppointment(BaseModel):
    id: UUID
    date: date
    time: str
    type: str


class PatientStats(BaseModel):
    total_appointments: int
    total_treatments: int
    total_amount: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    last_visit_date: Optional[date]
    upcoming_appointment: Optional[UpcomingAppointment]


class CreatorInfo(BaseModel):
    id: UUID
    full_name: str

    model_config = {"from_attributes": True}


class PatientResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Optional[str]
    phone: str
    email: Optional[str]
    address: Optional[str]
    emergency_contact: Optional[dict]
    medical_notes: Optional[str]
    is_active: bool
    registration_date: date
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientDetailResponse(PatientResponse):
    stats: Optional[PatientStats] = None


class PatientQuickSearch(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date
    last_visit_date: Optional[date] = None

    model_config = {"from_attributes": True}


class PaginatedPatients(BaseModel):
    data: list[PatientResponse]
    pagination: dict
