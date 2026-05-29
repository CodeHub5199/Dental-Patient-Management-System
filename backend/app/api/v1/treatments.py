from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.treatment import Treatment
from app.schemas.auth import MessageResponse
from app.schemas.treatment import (
    PaginatedTreatments,
    TreatmentCreate,
    TreatmentResponse,
    TreatmentUpdate,
)

router = APIRouter(prefix="/treatments", tags=["Treatments"])


@router.get("", response_model=PaginatedTreatments)
async def list_treatments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(None),
    appointment_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    tooth_number: str | None = Query(None),
    performed_by: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Treatment)
    if patient_id:
        query = query.where(Treatment.patient_id == patient_id)
    if appointment_id:
        query = query.where(Treatment.appointment_id == appointment_id)
    if status_filter:
        query = query.where(Treatment.status == status_filter)
    if tooth_number:
        query = query.where(Treatment.tooth_number == tooth_number)
    if performed_by:
        query = query.where(Treatment.performed_by == performed_by)
    if date_from:
        query = query.where(Treatment.performed_date >= date_from)
    if date_to:
        query = query.where(Treatment.performed_date <= date_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Treatment.performed_date.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    treatments = result.scalars().all()

    return PaginatedTreatments(
        data=[TreatmentResponse.model_validate(t) for t in treatments],
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
async def create_treatment(
    body: TreatmentCreate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    treatment = Treatment(
        patient_id=body.patient_id,
        appointment_id=body.appointment_id,
        tooth_number=body.tooth_number,
        procedure_code=body.procedure_code,
        procedure_name=body.procedure_name,
        description=body.description,
        amount=body.amount,
        status=body.status,
        performed_by=current_user.id,
        performed_date=body.performed_date,
    )
    db.add(treatment)
    await db.flush()
    await db.refresh(treatment)
    return TreatmentResponse.model_validate(treatment)


@router.get("/{treatment_id}", response_model=TreatmentResponse)
async def get_treatment(
    treatment_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Treatment).where(Treatment.id == treatment_id))
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")
    return TreatmentResponse.model_validate(treatment)


@router.put("/{treatment_id}", response_model=TreatmentResponse)
async def update_treatment(
    treatment_id: UUID,
    body: TreatmentUpdate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Treatment).where(Treatment.id == treatment_id))
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")

    update_data = body.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(treatment, key, value)

    await db.flush()
    await db.refresh(treatment)
    return TreatmentResponse.model_validate(treatment)


@router.delete("/{treatment_id}", response_model=MessageResponse)
async def delete_treatment(
    treatment_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Treatment).where(Treatment.id == treatment_id))
    treatment = result.scalar_one_or_none()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")

    await db.delete(treatment)
    await db.flush()
    return MessageResponse(message="Treatment deleted successfully")
