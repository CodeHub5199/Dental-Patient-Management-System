from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.clinic_settings import ClinicSettings
from app.models.procedure import Procedure

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/clinic")
async def get_clinic_settings(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClinicSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        return {"clinic_name": "Dental Clinic", "working_hours": {}, "slot_duration_minutes": 30}
    return {
        "id": settings.id,
        "clinic_name": settings.clinic_name,
        "timezone": settings.timezone,
        "working_hours": settings.working_hours,
        "slot_duration_minutes": settings.slot_duration_minutes,
        "phone": settings.phone,
        "email": settings.email,
        "address": settings.address,
    }


@router.put("/clinic")
async def update_clinic_settings(
    body: dict,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClinicSettings).limit(1))
    settings_obj = result.scalar_one_or_none()

    if not settings_obj:
        settings_obj = ClinicSettings(clinic_name=body.get("clinic_name", "Dental Clinic"))
        db.add(settings_obj)

    for key, value in body.items():
        if hasattr(settings_obj, key):
            setattr(settings_obj, key, value)

    await db.flush()
    return {"message": "Clinic settings updated successfully"}


@router.get("/procedures")
async def list_procedures(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Procedure).where(Procedure.is_active == True))
    procedures = result.scalars().all()
    return {
        "data": [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "default_amount": p.default_amount,
                "default_duration_minutes": p.default_duration_minutes,
                "category": p.category,
                "is_active": p.is_active,
            }
            for p in procedures
        ]
    }


@router.post("/procedures", status_code=status.HTTP_201_CREATED)
async def create_procedure(
    body: dict,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    procedure = Procedure(
        code=body.get("code"),
        name=body["name"],
        default_amount=body.get("default_amount"),
        default_duration_minutes=body.get("default_duration_minutes"),
        category=body.get("category"),
    )
    db.add(procedure)
    await db.flush()
    await db.refresh(procedure)
    return {"id": procedure.id, "name": procedure.name, "code": procedure.code}


@router.put("/procedures/{procedure_id}")
async def update_procedure(
    procedure_id: UUID,
    body: dict,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Procedure).where(Procedure.id == procedure_id))
    procedure = result.scalar_one_or_none()
    if not procedure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procedure not found")

    for key, value in body.items():
        if hasattr(procedure, key):
            setattr(procedure, key, value)

    await db.flush()
    return {"message": "Procedure updated successfully"}
