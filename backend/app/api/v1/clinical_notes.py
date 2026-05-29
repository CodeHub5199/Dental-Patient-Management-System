from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.appointment import Appointment
from app.models.clinical_note import ClinicalNote
from app.schemas.auth import MessageResponse
from app.schemas.clinical_note import (
    ClinicalNoteCreate,
    ClinicalNoteResponse,
    ClinicalNoteUpdate,
    PaginatedClinicalNotes,
)

router = APIRouter(prefix="/clinical-notes", tags=["Clinical Notes"])


@router.get("", response_model=PaginatedClinicalNotes)
async def list_notes(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(None),
    appointment_id: UUID | None = Query(None),
    created_by: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(ClinicalNote)
    if patient_id:
        query = query.where(ClinicalNote.patient_id == patient_id)
    if appointment_id:
        query = query.where(ClinicalNote.appointment_id == appointment_id)
    if created_by:
        query = query.where(ClinicalNote.created_by == created_by)
    if date_from:
        query = query.where(ClinicalNote.created_at >= date_from)
    if date_to:
        query = query.where(ClinicalNote.created_at <= date_to)

    query = query.order_by(ClinicalNote.created_at.desc())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    notes = result.scalars().all()

    return PaginatedClinicalNotes(
        data=[ClinicalNoteResponse.model_validate(n) for n in notes],
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("", response_model=ClinicalNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: ClinicalNoteCreate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    # Validate appointment belongs to patient if provided
    if body.appointment_id:
        appt_result = await db.execute(
            select(Appointment).where(
                Appointment.id == body.appointment_id,
                Appointment.patient_id == body.patient_id,
            )
        )
        if not appt_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This appointment does not belong to this patient",
            )

    note = ClinicalNote(
        patient_id=body.patient_id,
        appointment_id=body.appointment_id,
        subjective=body.subjective,
        objective=body.objective,
        assessment=body.assessment,
        plan=body.plan,
        created_by=current_user.id,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return ClinicalNoteResponse.model_validate(note)


@router.get("/{note_id}", response_model=ClinicalNoteResponse)
async def get_note(
    note_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClinicalNote).where(ClinicalNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical note not found")
    return ClinicalNoteResponse.model_validate(note)


@router.put("/{note_id}", response_model=ClinicalNoteResponse)
async def update_note(
    note_id: UUID,
    body: ClinicalNoteUpdate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClinicalNote).where(ClinicalNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical note not found")

    if note.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own clinical notes",
        )

    update_data = body.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(note, key, value)

    await db.flush()
    await db.refresh(note)
    return ClinicalNoteResponse.model_validate(note)


@router.delete("/{note_id}", response_model=MessageResponse)
async def delete_note(
    note_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClinicalNote).where(ClinicalNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical note not found")

    if note.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own clinical notes",
        )

    await db.delete(note)
    await db.flush()
    return MessageResponse(message="Clinical note deleted successfully")
