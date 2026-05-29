"""
Unit tests for appointment scheduling business logic.

These tests do NOT require a database — they exercise pure Python functions
and Pydantic schema validators in isolation.
"""

import pytest
from datetime import date, time, timedelta

# ── FSM transition table (copied from the router so we can test it here) ──────

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "scheduled":   {"confirmed", "cancelled"},
    "confirmed":   {"checked_in", "cancelled", "no_show"},
    "checked_in":  {"in_progress", "cancelled"},
    "in_progress": {"completed"},
    "completed":   set(),
    "cancelled":   {"scheduled"},
    "no_show":     {"scheduled"},
}


def is_valid_transition(current: str, next_status: str) -> bool:
    return next_status in ALLOWED_TRANSITIONS.get(current, set())


# ── FSM transition tests ──────────────────────────────────────────────────────

class TestFSMTransitions:
    def test_scheduled_can_confirm(self):
        assert is_valid_transition("scheduled", "confirmed")

    def test_scheduled_can_cancel(self):
        assert is_valid_transition("scheduled", "cancelled")

    def test_scheduled_cannot_skip_to_in_progress(self):
        assert not is_valid_transition("scheduled", "in_progress")

    def test_scheduled_cannot_skip_to_completed(self):
        assert not is_valid_transition("scheduled", "completed")

    def test_confirmed_can_check_in(self):
        assert is_valid_transition("confirmed", "checked_in")

    def test_confirmed_can_no_show(self):
        assert is_valid_transition("confirmed", "no_show")

    def test_confirmed_can_cancel(self):
        assert is_valid_transition("confirmed", "cancelled")

    def test_confirmed_cannot_skip_to_in_progress(self):
        assert not is_valid_transition("confirmed", "in_progress")

    def test_checked_in_can_start_treatment(self):
        assert is_valid_transition("checked_in", "in_progress")

    def test_checked_in_can_cancel(self):
        assert is_valid_transition("checked_in", "cancelled")

    def test_in_progress_can_complete(self):
        assert is_valid_transition("in_progress", "completed")

    def test_in_progress_cannot_go_back(self):
        assert not is_valid_transition("in_progress", "confirmed")
        assert not is_valid_transition("in_progress", "checked_in")
        assert not is_valid_transition("in_progress", "scheduled")

    def test_completed_is_terminal(self):
        for s in ("scheduled", "confirmed", "checked_in", "in_progress", "cancelled", "no_show"):
            assert not is_valid_transition("completed", s)

    def test_cancelled_can_reopen(self):
        assert is_valid_transition("cancelled", "scheduled")

    def test_no_show_can_reopen(self):
        assert is_valid_transition("no_show", "scheduled")

    def test_all_non_terminal_cannot_transition_backwards_to_scheduled_except_reopen(self):
        forward_statuses = ["confirmed", "checked_in", "in_progress"]
        for s in forward_statuses:
            assert not is_valid_transition(s, "scheduled")


# ── Pydantic schema validation tests ─────────────────────────────────────────

class TestAppointmentCreateSchema:
    def _build(self, **overrides):
        from app.schemas.appointment import AppointmentCreate
        from uuid import uuid4

        defaults = {
            "patient_id":       uuid4(),
            "dentist_id":       uuid4(),
            "appointment_date": date.today() + timedelta(days=1),
            "start_time":       time(9, 0),
            "end_time":         time(9, 30),
            "appointment_type": "cleaning",
        }
        defaults.update(overrides)
        return AppointmentCreate(**defaults)

    def test_valid_appointment(self):
        appt = self._build()
        assert appt.appointment_type == "cleaning"

    def test_past_date_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="cannot be in the past"):
            self._build(appointment_date=date.today() - timedelta(days=1))

    def test_today_date_is_allowed(self):
        appt = self._build(appointment_date=date.today())
        assert appt.appointment_date == date.today()

    def test_end_before_start_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="end_time must be after start_time"):
            self._build(start_time=time(10, 0), end_time=time(9, 30))

    def test_equal_start_end_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="end_time must be after start_time"):
            self._build(start_time=time(10, 0), end_time=time(10, 0))

    def test_empty_appointment_type_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            self._build(appointment_type="")

    def test_notes_optional(self):
        appt = self._build(notes=None)
        assert appt.notes is None

        appt_with_notes = self._build(notes="Patient is allergic to latex")
        assert appt_with_notes.notes == "Patient is allergic to latex"


# ── Conflict detection logic tests ────────────────────────────────────────────

class TestConflictDetection:
    """Tests for the time-overlap logic used in create/update endpoints."""

    def _overlaps(self, req_start: time, req_end: time, booked_start: time, booked_end: time) -> bool:
        """Replicates the WHERE clause: start_time < req_end AND end_time > req_start."""
        return booked_start < req_end and booked_end > req_start

    def test_identical_slots_conflict(self):
        assert self._overlaps(time(9, 0), time(9, 30), time(9, 0), time(9, 30))

    def test_contained_slot_conflicts(self):
        # Request 09:00-10:00 vs booked 09:15-09:45
        assert self._overlaps(time(9, 0), time(10, 0), time(9, 15), time(9, 45))

    def test_partial_overlap_start_conflicts(self):
        # Request 09:00-09:30 vs booked 09:15-10:00
        assert self._overlaps(time(9, 0), time(9, 30), time(9, 15), time(10, 0))

    def test_partial_overlap_end_conflicts(self):
        # Request 09:30-10:00 vs booked 09:00-09:45
        assert self._overlaps(time(9, 30), time(10, 0), time(9, 0), time(9, 45))

    def test_adjacent_slots_do_not_conflict(self):
        # Request 09:30-10:00 vs booked 09:00-09:30 (edge-adjacent, no overlap)
        assert not self._overlaps(time(9, 30), time(10, 0), time(9, 0), time(9, 30))

    def test_completely_before_no_conflict(self):
        assert not self._overlaps(time(8, 0), time(8, 30), time(9, 0), time(9, 30))

    def test_completely_after_no_conflict(self):
        assert not self._overlaps(time(10, 0), time(10, 30), time(9, 0), time(9, 30))

    def test_one_minute_overlap_conflicts(self):
        # Request 09:29-10:00 vs booked 09:00-09:30 → 1-minute overlap
        assert self._overlaps(time(9, 29), time(10, 0), time(9, 0), time(9, 30))


# ── Available slot calculation tests ─────────────────────────────────────────

class TestAvailableSlotCalculation:
    """Tests for compute_available_slots logic."""

    def _compute(
        self,
        working_start: time,
        working_end: time,
        slot_minutes: int,
        booked: list[tuple[time, time]],
    ) -> list[dict]:
        from datetime import datetime, timedelta

        slots: list[dict] = []
        cursor = working_start
        ref_date = date.today()
        while cursor < working_end:
            slot_end = (
                datetime.combine(ref_date, cursor) + timedelta(minutes=slot_minutes)
            ).time()
            if slot_end > working_end:
                break
            overlaps = any(cursor < b_end and slot_end > b_start for b_start, b_end in booked)
            if not overlaps:
                slots.append({"start_time": cursor, "end_time": slot_end})
            cursor = slot_end
        return slots

    def test_empty_day_returns_all_slots(self):
        slots = self._compute(time(9, 0), time(17, 0), 30, [])
        assert len(slots) == 16  # 8 hours × 2 slots/hour

    def test_booked_slot_is_excluded(self):
        booked = [(time(9, 0), time(9, 30))]
        slots = self._compute(time(9, 0), time(17, 0), 30, booked)
        start_times = [s["start_time"] for s in slots]
        assert time(9, 0) not in start_times
        assert time(9, 30) in start_times  # next slot is free

    def test_no_slots_when_fully_booked(self):
        booked = [(time(9, 0), time(17, 0))]
        slots = self._compute(time(9, 0), time(17, 0), 30, booked)
        assert slots == []

    def test_partial_day_booked(self):
        booked = [(time(12, 0), time(14, 0))]  # 2-hour lunch block
        slots = self._compute(time(9, 0), time(17, 0), 30, booked)
        free_start_times = [s["start_time"] for s in slots]
        assert time(12, 0) not in free_start_times
        assert time(12, 30) not in free_start_times
        assert time(13, 0) not in free_start_times
        assert time(13, 30) not in free_start_times
        assert time(14, 0) in free_start_times  # resumes after block

    def test_slot_partially_overlapping_is_excluded(self):
        # Book 09:15-09:45 — the 09:00-09:30 and 09:30-10:00 slots both overlap
        booked = [(time(9, 15), time(9, 45))]
        slots = self._compute(time(9, 0), time(17, 0), 30, booked)
        free_start_times = [s["start_time"] for s in slots]
        assert time(9, 0) not in free_start_times
        assert time(9, 30) not in free_start_times
        assert time(10, 0) in free_start_times  # first free slot

    def test_friday_short_day(self):
        # Friday: 09:00-14:00 (5 hours = 10 slots)
        slots = self._compute(time(9, 0), time(14, 0), 30, [])
        assert len(slots) == 10

    def test_60_minute_slots(self):
        slots = self._compute(time(9, 0), time(17, 0), 60, [])
        assert len(slots) == 8
