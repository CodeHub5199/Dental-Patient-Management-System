from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class AppointmentCounts(BaseModel):
    total: int
    scheduled: int
    confirmed: int
    checked_in: int
    in_progress: int
    completed: int
    cancelled: int
    no_show: int


class DashboardSummary(BaseModel):
    date: date
    appointments: AppointmentCounts
    total_active_patients: int
    new_patients_this_month: int
    revenue_today: Decimal
    collected_today: Decimal
    total_outstanding: Decimal
