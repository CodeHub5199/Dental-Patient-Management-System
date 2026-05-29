from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ClinicalNoteCreate(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    subjective: str = Field(min_length=10, max_length=5000)
    objective: str = Field(min_length=10, max_length=5000)
    assessment: str = Field(min_length=10, max_length=5000)
    plan: str = Field(min_length=10, max_length=5000)


class ClinicalNoteUpdate(BaseModel):
    subjective: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    objective: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    assessment: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    plan: Optional[str] = Field(default=None, min_length=10, max_length=5000)


class ClinicalNoteResponse(BaseModel):
    id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID]
    subjective: str
    objective: str
    assessment: str
    plan: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedClinicalNotes(BaseModel):
    data: list[ClinicalNoteResponse]
    pagination: dict
