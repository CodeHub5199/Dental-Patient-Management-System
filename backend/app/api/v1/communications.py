from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.communication import Communication, ReminderConfig
from app.schemas.auth import MessageResponse
from app.schemas.communication import (
    BulkReminderResponse,
    CommunicationResponse,
    ManualSendRequest,
    PaginatedCommunications,
    ReminderConfigCreate,
    ReminderConfigResponse,
    ReminderConfigUpdate,
    TriggerReminderRequest,
)

router = APIRouter(tags=["Communications"])


@router.get("/communications", response_model=PaginatedCommunications)
async def list_communications(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(None),
    appointment_id: UUID | None = Query(None),
    communication_type: str | None = Query(None),
    comm_status: str | None = Query(None, alias="status"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Communication)
    if patient_id:
        query = query.where(Communication.patient_id == patient_id)
    if appointment_id:
        query = query.where(Communication.appointment_id == appointment_id)
    if communication_type:
        query = query.where(Communication.communication_type == communication_type)
    if comm_status:
        query = query.where(Communication.status == comm_status)
    if date_from:
        query = query.where(Communication.sent_at >= date_from)
    if date_to:
        query = query.where(Communication.sent_at <= date_to)

    query = query.order_by(Communication.sent_at.desc())
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    comms = result.scalars().all()

    return PaginatedCommunications(
        data=[CommunicationResponse.model_validate(c) for c in comms],
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("/communications/send", response_model=CommunicationResponse, status_code=status.HTTP_201_CREATED)
async def send_manual_message(
    body: ManualSendRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    from app.models.patient import Patient
    patient_result = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if body.communication_type == "sms" and not patient.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient does not have a phone number on file")
    if body.communication_type == "email" and not patient.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient does not have an email address on file")

    # TODO: Send via Twilio/SendGrid
    comm = Communication(
        patient_id=body.patient_id,
        appointment_id=body.appointment_id,
        communication_type=body.communication_type,
        message_content=body.message_content,
        status="sent",
        created_by=current_user.id,
        is_automated=False,
    )
    db.add(comm)
    await db.flush()
    await db.refresh(comm)
    return CommunicationResponse.model_validate(comm)


@router.post("/communications/reminders/trigger", response_model=MessageResponse)
async def trigger_reminder(
    body: TriggerReminderRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    # TODO: Implement single reminder trigger
    return MessageResponse(message="Reminder triggered successfully")


@router.post("/communications/reminders/bulk", response_model=BulkReminderResponse)
async def bulk_reminders(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    # TODO: Implement bulk reminder dispatch
    return BulkReminderResponse(
        message="Bulk reminders triggered",
        total_appointments=0,
        reminders_sent=0,
        reminders_failed=0,
        failures=[],
    )


@router.get("/reminders/configs", response_model=list[ReminderConfigResponse])
async def list_reminder_configs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReminderConfig).order_by(ReminderConfig.created_at))
    configs = result.scalars().all()
    return [ReminderConfigResponse.model_validate(c) for c in configs]


@router.post("/reminders/configs", response_model=ReminderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder_config(
    body: ReminderConfigCreate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    config = ReminderConfig(
        name=body.name,
        hours_before_appointment=body.hours_before_appointment,
        communication_type=body.communication_type,
        template=body.template,
        is_active=body.is_active,
        created_by=current_user.id,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return ReminderConfigResponse.model_validate(config)


@router.put("/reminders/configs/{config_id}", response_model=ReminderConfigResponse)
async def update_reminder_config(
    config_id: UUID,
    body: ReminderConfigUpdate,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReminderConfig).where(ReminderConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder config not found")

    update_data = body.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    await db.flush()
    await db.refresh(config)
    return ReminderConfigResponse.model_validate(config)


@router.delete("/reminders/configs/{config_id}", response_model=MessageResponse)
async def delete_reminder_config(
    config_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReminderConfig).where(ReminderConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder config not found")

    await db.delete(config)
    await db.flush()
    return MessageResponse(message="Reminder configuration deleted successfully")
