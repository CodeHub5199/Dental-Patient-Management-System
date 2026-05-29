from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=200)
    role: Literal["dentist", "receptionist"]


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    role: Optional[Literal["dentist", "receptionist"]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class PaginatedUsers(BaseModel):
    data: list[UserResponse]
    pagination: dict
