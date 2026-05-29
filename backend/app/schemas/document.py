from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentUpdate(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class DocumentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID]
    treatment_id: Optional[UUID]
    document_type: str
    file_name: str
    file_size: int
    mime_type: str
    notes: Optional[str]
    has_thumbnail: bool
    uploaded_by: UUID
    uploader_name: str = ""
    uploaded_at: datetime
    download_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    data: list[DocumentResponse]
    pagination: dict
