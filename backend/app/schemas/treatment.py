from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

VALID_FDI_TEETH = frozenset(
    f"{quadrant}{position}"
    for quadrant in range(1, 5)
    for position in range(1, 9)
) | {"general"}


def validate_fdi(tooth: str) -> str:
    if tooth.lower() == "general":
        return "general"
    if tooth not in VALID_FDI_TEETH:
        raise ValueError(
            f"Invalid tooth number '{tooth}'. "
            f"Use FDI notation (11-18, 21-28, 31-38, 41-48) or 'general'."
        )
    return tooth


class TreatmentCreate(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    tooth_number: str
    procedure_code: Optional[str] = None
    procedure_name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    amount: Optional[Decimal] = Field(default=None, ge=0)
    status: Literal["planned", "in_progress", "completed"]
    performed_date: date

    @field_validator("tooth_number")
    @classmethod
    def validate_tooth(cls, v: str) -> str:
        return validate_fdi(v)

    @field_validator("performed_date")
    @classmethod
    def not_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Performed date cannot be in the future")
        return v


class TreatmentUpdate(BaseModel):
    tooth_number: Optional[str] = None
    procedure_code: Optional[str] = None
    procedure_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, ge=0)
    status: Optional[Literal["planned", "in_progress", "completed"]] = None
    performed_date: Optional[date] = None

    @field_validator("tooth_number")
    @classmethod
    def validate_tooth(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_fdi(v)
        return v


class TreatmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID]
    tooth_number: str
    procedure_code: Optional[str]
    procedure_name: str
    description: Optional[str]
    amount: Optional[Decimal]
    status: str
    performed_by: UUID
    performed_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTreatments(BaseModel):
    data: list[TreatmentResponse]
    pagination: dict
