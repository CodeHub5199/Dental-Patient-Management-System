from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.models.patient import Patient
from app.models.payment import Payment
from app.schemas.auth import MessageResponse
from app.schemas.payment import PaginatedPayments, PaymentCreate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=PaginatedPayments)
async def list_payments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(None),
    payment_method: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Payment).options(selectinload(Payment.recorder))

    if patient_id:
        query = query.where(Payment.patient_id == patient_id)
    if payment_method:
        query = query.where(Payment.payment_method == payment_method)
    if date_from:
        query = query.where(Payment.payment_date >= date_from)
    if date_to:
        query = query.where(Payment.payment_date <= date_to)

    query = query.order_by(Payment.payment_date.desc(), Payment.created_at.desc())

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    payments = result.scalars().all()

    return PaginatedPayments(
        data=[PaymentResponse.model_validate(p) for p in payments],
        pagination={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": -(-total // per_page),
        },
    )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    current_user: CurrentUser,
    body: PaymentCreate,
    db: AsyncSession = Depends(get_db),
):
    patient_result = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    if not patient_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    payment = Payment(**body.model_dump(), recorded_by=current_user.id)
    db.add(payment)
    await db.flush()

    result = await db.execute(
        select(Payment).options(selectinload(Payment.recorder)).where(Payment.id == payment.id)
    )
    return PaymentResponse.model_validate(result.scalar_one())


@router.delete("/{payment_id}", response_model=MessageResponse)
async def delete_payment(
    payment_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    await db.delete(payment)
    await db.flush()
    return MessageResponse(message="Payment deleted successfully")
