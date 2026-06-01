from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PaymentCreate(BaseModel):
    patient_id: UUID
    amount: Decimal = Field(gt=0)
    payment_date: date
    payment_method: Literal["cash", "card", "bank_transfer", "insurance", "other"] = "cash"
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("payment_date")
    @classmethod
    def not_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Payment date cannot be in the future")
        return v


class RecorderInfo(BaseModel):
    id: UUID
    full_name: str

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    notes: Optional[str]
    recorded_by: UUID
    recorder: Optional[RecorderInfo] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPayments(BaseModel):
    data: list[PaymentResponse]
    pagination: dict
