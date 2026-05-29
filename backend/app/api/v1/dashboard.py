from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.schemas.dashboard import AppointmentCounts, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    target_date: date | None = None,
):
    today = target_date or date.today()

    result = await db.execute(
        text("""
            WITH
            appointment_counts AS (
                SELECT
                    COUNT(*) FILTER (WHERE status = 'scheduled')   AS scheduled,
                    COUNT(*) FILTER (WHERE status = 'confirmed')   AS confirmed,
                    COUNT(*) FILTER (WHERE status = 'checked_in')  AS checked_in,
                    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
                    COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
                    COUNT(*) FILTER (WHERE status = 'cancelled')   AS cancelled,
                    COUNT(*) FILTER (WHERE status = 'no_show')     AS no_show,
                    COUNT(*)                                        AS total
                FROM appointments
                WHERE appointment_date = :today
            ),
            patient_stats AS (
                SELECT
                    COUNT(*) FILTER (WHERE is_active = TRUE) AS total_active,
                    COUNT(*) FILTER (WHERE registration_date >= date_trunc('month', NOW())::date AND is_active = TRUE) AS new_this_month
                FROM patients
            ),
            revenue AS (
                SELECT COALESCE(SUM(amount), 0) AS total_amount_today
                FROM treatments
                WHERE performed_date = :today AND status = 'completed'
            )
            SELECT
                ac.*,
                ps.total_active,
                ps.new_this_month,
                rv.total_amount_today
            FROM appointment_counts ac, patient_stats ps, revenue rv
        """),
        {"today": today},
    )
    row = result.one()

    return DashboardSummary(
        date=today,
        appointments=AppointmentCounts(
            total=row.total,
            scheduled=row.scheduled,
            confirmed=row.confirmed,
            checked_in=row.checked_in,
            in_progress=row.in_progress,
            completed=row.completed,
            cancelled=row.cancelled,
            no_show=row.no_show,
        ),
        total_active_patients=row.total_active,
        new_patients_this_month=row.new_this_month,
        revenue_today=row.total_amount_today,
    )
