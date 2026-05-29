from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.patient import Patient
from app.schemas.auth import MessageResponse
from app.schemas.patient import (
    PaginatedPatients,
    PatientCreate,
    PatientDetailResponse,
    PatientQuickSearch,
    PatientResponse,
    PatientStats,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/search/quick")
async def quick_search(
    current_user: CurrentUser,
    q: str = Query(min_length=2),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient)
        .where(
            Patient.is_active == True,
            or_(
                Patient.first_name.ilike(f"%{q}%"),
                Patient.last_name.ilike(f"%{q}%"),
                Patient.phone.ilike(f"%{q}%"),
                Patient.email.ilike(f"%{q}%"),
            ),
        )
        .limit(limit)
    )
    patients = result.scalars().all()
    return {"data": [PatientQuickSearch.model_validate(p) for p in patients]}


@router.get("", response_model=PaginatedPatients)
async def list_patients(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    is_active: bool = Query(True),
    registration_date_from: date | None = Query(None),
    registration_date_to: date | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Patient).where(Patient.is_active == is_active)

    if search:
        query = query.where(
            or_(
                Patient.first_name.ilike(f"%{search}%"),
                Patient.last_name.ilike(f"%{search}%"),
                Patient.phone.ilike(f"%{search}%"),
                Patient.email.ilike(f"%{search}%"),
            )
        )
    if registration_date_from:
        query = query.where(Patient.registration_date >= registration_date_from)
    if registration_date_to:
        query = query.where(Patient.registration_date <= registration_date_to)

    sort_col = getattr(Patient, sort_by, Patient.created_at)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    patients = result.scalars().all()

    return PaginatedPatients(
        data=[PatientResponse.model_validate(p) for p in patients],
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    current_user: CurrentUser,
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
):
    existing_phone = await db.execute(select(Patient).where(Patient.phone == body.phone))
    if existing_phone.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this phone number already exists",
        )

    if body.email:
        existing_email = await db.execute(select(Patient).where(Patient.email == str(body.email)))
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A patient with this email already exists",
            )

    patient = Patient(
        **body.model_dump(exclude={"emergency_contact"}),
        emergency_contact=body.emergency_contact.model_dump() if body.emergency_contact else None,
        created_by=current_user.id,
    )
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(
    current_user: CurrentUser,
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    stats_result = await db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM appointments WHERE patient_id = :pid) AS total_appointments,
                (SELECT COUNT(*) FROM treatments WHERE patient_id = :pid) AS total_treatments,
                (SELECT COALESCE(SUM(amount), 0) FROM treatments WHERE patient_id = :pid AND status = 'completed') AS total_amount,
                (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = :pid AND status = 'completed') AS last_visit_date
        """),
        {"pid": str(patient_id)},
    )
    stats_row = stats_result.one()

    stats = PatientStats(
        total_appointments=stats_row.total_appointments,
        total_treatments=stats_row.total_treatments,
        total_amount=stats_row.total_amount or 0,
        last_visit_date=stats_row.last_visit_date,
        upcoming_appointment=None,
    )

    response = PatientDetailResponse.model_validate(patient)
    response.stats = stats
    return response


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    current_user: CurrentUser,
    patient_id: UUID,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    update_data = body.model_dump(exclude_none=True)
    if "emergency_contact" in update_data and body.emergency_contact:
        update_data["emergency_contact"] = body.emergency_contact.model_dump()

    for key, value in update_data.items():
        setattr(patient, key, value)

    await db.flush()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}", response_model=MessageResponse)
async def deactivate_patient(
    current_user: CurrentUser,
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient.is_active = False
    await db.flush()
    return MessageResponse(message="Patient deactivated successfully")


@router.post("/{patient_id}/reactivate", response_model=PatientResponse)
async def reactivate_patient(
    patient_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient.is_active = True
    await db.flush()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)
