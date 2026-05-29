from datetime import date, datetime as dt, time as time_type, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.models.appointment import Appointment
from app.models.clinic_settings import ClinicSettings
from app.models.patient import Patient
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    AppointmentWithPatient,
    CancelAppointment,
    PaginatedAppointments,
    StatusTransition,
    StatusTransitionResponse,
)
from app.schemas.auth import MessageResponse

router = APIRouter(prefix="/appointments", tags=["Appointments"])

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "scheduled":   {"confirmed", "cancelled"},
    "confirmed":   {"checked_in", "cancelled", "no_show"},
    "checked_in":  {"in_progress", "cancelled"},
    "in_progress": {"completed"},
    "completed":   set(),
    "cancelled":   {"scheduled"},
    "no_show":     {"scheduled"},
}

TYPE_COLOURS: dict[str, str] = {
    "consultation": "#6B7280",
    "checkup":      "#3B82F6",
    "exam":         "#3B82F6",
    "cleaning":     "#10B981",
    "filling":      "#F59E0B",
    "extraction":   "#EF4444",
    "root_canal":   "#8B5CF6",
    "crown":        "#D97706",
    "bridge":       "#D97706",
    "x-ray":        "#7C3AED",
    "whitening":    "#0EA5E9",
    "denture":      "#059669",
}
DEFAULT_COLOUR = "#6B7280"


def _appointment_colour(appointment_type: str) -> str:
    key = appointment_type.lower().replace(" ", "_").replace("-", "_")
    return TYPE_COLOURS.get(key, DEFAULT_COLOUR)


def _build_with_patient(appt: Appointment) -> AppointmentWithPatient:
    base = AppointmentResponse.model_validate(appt)
    return AppointmentWithPatient(
        **base.model_dump(),
        patient_name=f"{appt.patient.first_name} {appt.patient.last_name}",
        patient_phone=appt.patient.phone,
        color=_appointment_colour(appt.appointment_type),
    )


async def _load_with_patient(db: AsyncSession, appointment_id: UUID) -> Appointment | None:
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient))
        .where(Appointment.id == appointment_id)
    )
    return result.scalar_one_or_none()


# ── Static path routes MUST come before /{appointment_id} ────────────────────

@router.get("/calendar")
async def get_calendar(
    current_user: CurrentUser,
    start_date: date = Query(...),
    end_date: date = Query(...),
    dentist_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Appointment)
        .options(selectinload(Appointment.patient))
        .where(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date,
        )
    )
    if dentist_id:
        query = query.where(Appointment.dentist_id == dentist_id)
    query = query.order_by(Appointment.appointment_date, Appointment.start_time)

    result = await db.execute(query)
    appointments = result.scalars().all()
    return {"appointments": [_build_with_patient(a) for a in appointments]}


@router.get("/stats/daily")
async def daily_stats(
    current_user: CurrentUser,
    date_param: date = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db),
):
    target_date = date_param or date.today()
    result = await db.execute(
        select(Appointment.status, func.count().label("count"))
        .where(Appointment.appointment_date == target_date)
        .group_by(Appointment.status)
    )
    counts = {row.status: row.count for row in result}
    return {"date": target_date, "counts": counts}


@router.get("/slots/available")
async def available_slots(
    current_user: CurrentUser,
    date_param: date = Query(..., alias="date"),
    dentist_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    day_name = date_param.strftime("%A").lower()

    settings_result = await db.execute(select(ClinicSettings).limit(1))
    settings = settings_result.scalar_one_or_none()

    if settings:
        day_hours = settings.working_hours.get(day_name)
        if day_hours is None:
            return {"date": date_param, "available_slots": [], "note": "Clinic is closed on this day"}
        working_start = time_type.fromisoformat(day_hours["start"])
        working_end = time_type.fromisoformat(day_hours["end"])
        slot_minutes = settings.slot_duration_minutes
    else:
        working_start = time_type(9, 0)
        working_end = time_type(17, 0)
        slot_minutes = 30

    result = await db.execute(
        select(Appointment.start_time, Appointment.end_time)
        .where(
            Appointment.appointment_date == date_param,
            Appointment.dentist_id == dentist_id,
            Appointment.status.not_in(["cancelled", "no_show"]),
        )
    )
    booked = [(row.start_time, row.end_time) for row in result]

    slots: list[dict] = []
    cursor = working_start
    while cursor < working_end:
        slot_end = (dt.combine(date_param, cursor) + timedelta(minutes=slot_minutes)).time()
        if slot_end > working_end:
            break
        overlaps = any(cursor < b_end and slot_end > b_start for b_start, b_end in booked)
        if not overlaps:
            slots.append({
                "start_time": cursor.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
            })
        cursor = slot_end

    return {"date": date_param, "available_slots": slots}


@router.get("", response_model=PaginatedAppointments)
async def list_appointments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    date_param: date | None = Query(None, alias="date"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    dentist_id: UUID | None = Query(None),
    patient_id: UUID | None = Query(None),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    # Build filters as a list so we can reuse them for count + data queries
    filters = []
    if date_param:
        filters.append(Appointment.appointment_date == date_param)
    if date_from:
        filters.append(Appointment.appointment_date >= date_from)
    if date_to:
        filters.append(Appointment.appointment_date <= date_to)
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",")]
        filters.append(Appointment.status.in_(statuses))
    if dentist_id:
        filters.append(Appointment.dentist_id == dentist_id)
    if patient_id:
        filters.append(Appointment.patient_id == patient_id)

    order = Appointment.start_time.asc() if sort_order == "asc" else Appointment.start_time.desc()

    total_result = await db.execute(select(func.count(Appointment.id)).where(*filters))
    total = total_result.scalar() or 0

    data_query = (
        select(Appointment)
        .options(selectinload(Appointment.patient))
        .where(*filters)
        .order_by(Appointment.appointment_date, order)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(data_query)
    appointments = result.scalars().all()

    summary_result = await db.execute(
        select(Appointment.status, func.count().label("count")).group_by(Appointment.status)
    )
    summary = {row.status: row.count for row in summary_result}

    return PaginatedAppointments(
        data=[_build_with_patient(a) for a in appointments],
        summary=summary,
        pagination={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, -(-total // per_page)),
        },
    )


@router.post("", response_model=AppointmentWithPatient, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    current_user: CurrentUser,
    body: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
):
    patient_result = await db.execute(
        select(Patient).where(Patient.id == body.patient_id, Patient.is_active == True)
    )
    if not patient_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active patient not found")

    conflicts = await db.execute(
        select(Appointment).where(
            Appointment.dentist_id == body.dentist_id,
            Appointment.appointment_date == body.appointment_date,
            Appointment.status.not_in(["cancelled", "no_show"]),
            Appointment.start_time < body.end_time,
            Appointment.end_time > body.start_time,
        )
    )
    conflicting = conflicts.scalar_one_or_none()
    if conflicting:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time slot conflict. Dentist has an existing appointment from "
                   f"{conflicting.start_time.strftime('%H:%M')} to {conflicting.end_time.strftime('%H:%M')}.",
        )

    appt = Appointment(
        patient_id=body.patient_id,
        dentist_id=body.dentist_id,
        appointment_date=body.appointment_date,
        start_time=body.start_time,
        end_time=body.end_time,
        appointment_type=body.appointment_type,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(appt)
    await db.flush()
    await db.refresh(appt)

    loaded = await _load_with_patient(db, appt.id)
    return _build_with_patient(loaded)


@router.get("/{appointment_id}", response_model=AppointmentWithPatient)
async def get_appointment(
    current_user: CurrentUser,
    appointment_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    appt = await _load_with_patient(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return _build_with_patient(appt)


@router.put("/{appointment_id}", response_model=AppointmentWithPatient)
async def update_appointment(
    current_user: CurrentUser,
    appointment_id: UUID,
    body: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appt.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot update a {appt.status} appointment",
        )

    update_data = body.model_dump(exclude_none=True)

    if any(k in update_data for k in ("appointment_date", "start_time", "end_time")):
        new_date = update_data.get("appointment_date", appt.appointment_date)
        new_start = update_data.get("start_time", appt.start_time)
        new_end = update_data.get("end_time", appt.end_time)
        conflicts = await db.execute(
            select(Appointment).where(
                Appointment.dentist_id == appt.dentist_id,
                Appointment.appointment_date == new_date,
                Appointment.status.not_in(["cancelled", "no_show"]),
                Appointment.start_time < new_end,
                Appointment.end_time > new_start,
                Appointment.id != appointment_id,
            )
        )
        conflicting = conflicts.scalar_one_or_none()
        if conflicting:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Time slot conflict. Dentist has an existing appointment from "
                       f"{conflicting.start_time.strftime('%H:%M')} to {conflicting.end_time.strftime('%H:%M')}.",
            )

    for key, value in update_data.items():
        setattr(appt, key, value)

    await db.flush()
    loaded = await _load_with_patient(db, appointment_id)
    return _build_with_patient(loaded)


@router.delete("/{appointment_id}", response_model=MessageResponse)
async def cancel_appointment(
    current_user: CurrentUser,
    appointment_id: UUID,
    body: CancelAppointment,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appt.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A completed appointment cannot be cancelled",
        )

    appt.status = "cancelled"
    appt.cancellation_reason = body.cancellation_reason
    await db.flush()
    return MessageResponse(message="Appointment cancelled successfully")


@router.patch("/{appointment_id}/status", response_model=StatusTransitionResponse)
async def update_status(
    current_user: CurrentUser,
    appointment_id: UUID,
    body: StatusTransition,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    current_status = appt.status
    if body.status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status transition from '{current_status}' to '{body.status}'",
        )

    if body.status == "cancelled" and not body.cancellation_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cancellation reason is required",
        )

    appt.status = body.status
    if body.cancellation_reason:
        appt.cancellation_reason = body.cancellation_reason

    await db.flush()
    await db.refresh(appt)
    return StatusTransitionResponse(
        id=appt.id,
        status=appt.status,
        previous_status=current_status,
        updated_at=appt.updated_at,
    )
