"""
Unit tests for clinical charting business logic.

Tests cover:
- FDI tooth notation validation
- SOAP note field validation (min/max length)
- Treatment field validation (amount, date, status)
- Appointment-patient cross-validation logic
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.schemas.treatment import TreatmentCreate, TreatmentUpdate, validate_fdi, VALID_FDI_TEETH
from app.schemas.clinical_note import ClinicalNoteCreate, ClinicalNoteUpdate


# ── FDI Validation ────────────────────────────────────────────────────────────

class TestFDIValidation:
    def test_all_valid_quadrant1(self):
        for pos in range(1, 9):
            assert validate_fdi(f"1{pos}") == f"1{pos}"

    def test_all_valid_quadrant2(self):
        for pos in range(1, 9):
            assert validate_fdi(f"2{pos}") == f"2{pos}"

    def test_all_valid_quadrant3(self):
        for pos in range(1, 9):
            assert validate_fdi(f"3{pos}") == f"3{pos}"

    def test_all_valid_quadrant4(self):
        for pos in range(1, 9):
            assert validate_fdi(f"4{pos}") == f"4{pos}"

    def test_general_lowercase(self):
        assert validate_fdi("general") == "general"

    def test_general_uppercase_normalised(self):
        assert validate_fdi("GENERAL") == "general"

    def test_invalid_quadrant_5(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("51")

    def test_invalid_position_0(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("10")

    def test_invalid_position_9(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("19")

    def test_invalid_three_digits(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("123")

    def test_invalid_letter(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("X")

    def test_empty_string(self):
        with pytest.raises(ValueError, match="Invalid tooth number"):
            validate_fdi("")

    def test_valid_fdi_teeth_set_size(self):
        # 4 quadrants × 8 positions = 32 teeth + "general" = 33
        assert len(VALID_FDI_TEETH) == 33

    def test_boundary_tooth_11(self):
        assert validate_fdi("11") == "11"

    def test_boundary_tooth_48(self):
        assert validate_fdi("48") == "48"


# ── SOAP Note Schema Validation ───────────────────────────────────────────────

import uuid

VALID_UUID = uuid.uuid4()
LONG_TEXT = "A" * 5001
MIN_TEXT = "A" * 10
SHORT_TEXT = "A" * 9


class TestClinicalNoteCreate:
    def _valid_data(self):
        return {
            "patient_id": VALID_UUID,
            "subjective": MIN_TEXT,
            "objective":  MIN_TEXT,
            "assessment": MIN_TEXT,
            "plan":       MIN_TEXT,
        }

    def test_valid_note_creates_successfully(self):
        note = ClinicalNoteCreate(**self._valid_data())
        assert note.subjective == MIN_TEXT

    def test_subjective_too_short(self):
        data = {**self._valid_data(), "subjective": SHORT_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_objective_too_short(self):
        data = {**self._valid_data(), "objective": SHORT_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_assessment_too_short(self):
        data = {**self._valid_data(), "assessment": SHORT_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_plan_too_short(self):
        data = {**self._valid_data(), "plan": SHORT_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_subjective_too_long(self):
        data = {**self._valid_data(), "subjective": LONG_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_plan_too_long(self):
        data = {**self._valid_data(), "plan": LONG_TEXT}
        with pytest.raises(Exception):
            ClinicalNoteCreate(**data)

    def test_appointment_id_optional(self):
        note = ClinicalNoteCreate(**self._valid_data())
        assert note.appointment_id is None

    def test_appointment_id_accepted(self):
        data = {**self._valid_data(), "appointment_id": VALID_UUID}
        note = ClinicalNoteCreate(**data)
        assert note.appointment_id == VALID_UUID

    def test_exactly_10_chars_accepted(self):
        data = {**self._valid_data(), "subjective": "X" * 10}
        note = ClinicalNoteCreate(**data)
        assert len(note.subjective) == 10

    def test_exactly_5000_chars_accepted(self):
        data = {**self._valid_data(), "plan": "X" * 5000}
        note = ClinicalNoteCreate(**data)
        assert len(note.plan) == 5000


class TestClinicalNoteUpdate:
    def test_all_fields_optional(self):
        update = ClinicalNoteUpdate()
        assert update.subjective is None

    def test_partial_update_subjective_only(self):
        update = ClinicalNoteUpdate(subjective="X" * 10)
        assert update.subjective is not None
        assert update.objective is None

    def test_update_field_too_short(self):
        with pytest.raises(Exception):
            ClinicalNoteUpdate(subjective="short")

    def test_update_field_too_long(self):
        with pytest.raises(Exception):
            ClinicalNoteUpdate(objective=LONG_TEXT)


# ── Treatment Schema Validation ───────────────────────────────────────────────

class TestTreatmentCreate:
    def _valid_data(self):
        return {
            "patient_id":     VALID_UUID,
            "tooth_number":   "36",
            "procedure_name": "Composite filling",
            "status":         "completed",
            "performed_date": date.today(),
        }

    def test_valid_treatment(self):
        t = TreatmentCreate(**self._valid_data())
        assert t.tooth_number == "36"

    def test_general_tooth_number(self):
        data = {**self._valid_data(), "tooth_number": "general"}
        t = TreatmentCreate(**data)
        assert t.tooth_number == "general"

    def test_invalid_tooth_number(self):
        data = {**self._valid_data(), "tooth_number": "99"}
        with pytest.raises(Exception):
            TreatmentCreate(**data)

    def test_performed_date_today_accepted(self):
        data = {**self._valid_data(), "performed_date": date.today()}
        t = TreatmentCreate(**data)
        assert t.performed_date == date.today()

    def test_performed_date_future_rejected(self):
        data = {**self._valid_data(), "performed_date": date.today() + timedelta(days=1)}
        with pytest.raises(Exception, match="Performed date cannot be in the future"):
            TreatmentCreate(**data)

    def test_performed_date_past_accepted(self):
        data = {**self._valid_data(), "performed_date": date.today() - timedelta(days=30)}
        t = TreatmentCreate(**data)
        assert t.performed_date < date.today()

    def test_amount_optional(self):
        t = TreatmentCreate(**self._valid_data())
        assert t.amount is None

    def test_amount_zero_accepted(self):
        data = {**self._valid_data(), "amount": Decimal("0.00")}
        t = TreatmentCreate(**data)
        assert t.amount == Decimal("0.00")

    def test_amount_positive_accepted(self):
        data = {**self._valid_data(), "amount": Decimal("150.50")}
        t = TreatmentCreate(**data)
        assert t.amount == Decimal("150.50")

    def test_amount_negative_rejected(self):
        data = {**self._valid_data(), "amount": Decimal("-1.00")}
        with pytest.raises(Exception):
            TreatmentCreate(**data)

    def test_status_planned(self):
        data = {**self._valid_data(), "status": "planned"}
        t = TreatmentCreate(**data)
        assert t.status == "planned"

    def test_status_in_progress(self):
        data = {**self._valid_data(), "status": "in_progress"}
        t = TreatmentCreate(**data)
        assert t.status == "in_progress"

    def test_status_completed(self):
        data = {**self._valid_data(), "status": "completed"}
        t = TreatmentCreate(**data)
        assert t.status == "completed"

    def test_invalid_status(self):
        data = {**self._valid_data(), "status": "deleted"}
        with pytest.raises(Exception):
            TreatmentCreate(**data)

    def test_procedure_name_required(self):
        data = {**self._valid_data(), "procedure_name": ""}
        with pytest.raises(Exception):
            TreatmentCreate(**data)

    def test_procedure_name_max_length(self):
        data = {**self._valid_data(), "procedure_name": "X" * 201}
        with pytest.raises(Exception):
            TreatmentCreate(**data)

    def test_procedure_code_optional(self):
        t = TreatmentCreate(**self._valid_data())
        assert t.procedure_code is None

    def test_appointment_id_optional(self):
        t = TreatmentCreate(**self._valid_data())
        assert t.appointment_id is None

    def test_description_optional(self):
        t = TreatmentCreate(**self._valid_data())
        assert t.description is None


class TestTreatmentUpdate:
    def test_all_fields_optional(self):
        update = TreatmentUpdate()
        assert update.tooth_number is None
        assert update.status is None

    def test_update_tooth_number_invalid(self):
        with pytest.raises(Exception):
            TreatmentUpdate(tooth_number="99")

    def test_update_tooth_number_valid(self):
        update = TreatmentUpdate(tooth_number="21")
        assert update.tooth_number == "21"

    def test_update_tooth_number_general(self):
        update = TreatmentUpdate(tooth_number="general")
        assert update.tooth_number == "general"

    def test_update_status_valid(self):
        update = TreatmentUpdate(status="completed")
        assert update.status == "completed"

    def test_update_amount_negative_rejected(self):
        with pytest.raises(Exception):
            TreatmentUpdate(amount=Decimal("-5"))
