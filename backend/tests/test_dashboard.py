"""Unit tests for dashboard schemas — no DB required."""

from datetime import date
from decimal import Decimal

import pytest

from app.schemas.dashboard import AppointmentCounts, DashboardSummary


# ─── AppointmentCounts ────────────────────────────────────────────────────────

def test_appointment_counts_all_fields():
    counts = AppointmentCounts(
        total=10,
        scheduled=2,
        confirmed=3,
        checked_in=1,
        in_progress=1,
        completed=2,
        cancelled=1,
        no_show=0,
    )
    assert counts.total == 10
    assert counts.no_show == 0


def test_appointment_counts_all_zero():
    counts = AppointmentCounts(
        total=0,
        scheduled=0,
        confirmed=0,
        checked_in=0,
        in_progress=0,
        completed=0,
        cancelled=0,
        no_show=0,
    )
    assert counts.total == 0


def test_appointment_counts_rejects_missing_field():
    with pytest.raises(Exception):
        AppointmentCounts(
            total=1,
            scheduled=1,
            # missing: confirmed, checked_in, in_progress, completed, cancelled, no_show
        )


# ─── DashboardSummary ─────────────────────────────────────────────────────────

def test_dashboard_summary_full():
    summary = DashboardSummary(
        date=date(2026, 5, 29),
        appointments=AppointmentCounts(
            total=18,
            scheduled=6,
            confirmed=4,
            checked_in=2,
            in_progress=1,
            completed=5,
            cancelled=0,
            no_show=0,
        ),
        total_active_patients=1050,
        new_patients_this_month=12,
        revenue_today=Decimal("2450.00"),
    )
    assert summary.total_active_patients == 1050
    assert summary.revenue_today == Decimal("2450.00")
    assert summary.appointments.total == 18


def test_dashboard_summary_zero_revenue():
    """Revenue of 0 is valid — means no treatments logged today."""
    summary = DashboardSummary(
        date=date(2026, 5, 29),
        appointments=AppointmentCounts(
            total=0, scheduled=0, confirmed=0, checked_in=0,
            in_progress=0, completed=0, cancelled=0, no_show=0,
        ),
        total_active_patients=500,
        new_patients_this_month=3,
        revenue_today=Decimal("0.00"),
    )
    assert summary.revenue_today == Decimal("0.00")
    assert summary.appointments.total == 0


def test_dashboard_summary_large_revenue():
    """Large revenue values must be accepted without truncation."""
    summary = DashboardSummary(
        date=date(2026, 5, 29),
        appointments=AppointmentCounts(
            total=5, scheduled=0, confirmed=0, checked_in=0,
            in_progress=0, completed=5, cancelled=0, no_show=0,
        ),
        total_active_patients=200,
        new_patients_this_month=1,
        revenue_today=Decimal("125000.00"),
    )
    assert summary.revenue_today == Decimal("125000.00")


def test_dashboard_summary_date_field():
    """Date field must be a date instance."""
    today = date.today()
    summary = DashboardSummary(
        date=today,
        appointments=AppointmentCounts(
            total=0, scheduled=0, confirmed=0, checked_in=0,
            in_progress=0, completed=0, cancelled=0, no_show=0,
        ),
        total_active_patients=0,
        new_patients_this_month=0,
        revenue_today=Decimal("0"),
    )
    assert summary.date == today


def test_dashboard_summary_new_patients_zero():
    """New patients this month can be 0 at the start of a month."""
    summary = DashboardSummary(
        date=date(2026, 6, 1),
        appointments=AppointmentCounts(
            total=3, scheduled=3, confirmed=0, checked_in=0,
            in_progress=0, completed=0, cancelled=0, no_show=0,
        ),
        total_active_patients=800,
        new_patients_this_month=0,
        revenue_today=Decimal("0"),
    )
    assert summary.new_patients_this_month == 0


def test_dashboard_summary_rejects_missing_appointments():
    with pytest.raises(Exception):
        DashboardSummary(
            date=date.today(),
            # missing appointments field
            total_active_patients=100,
            new_patients_this_month=5,
            revenue_today=Decimal("500"),
        )
