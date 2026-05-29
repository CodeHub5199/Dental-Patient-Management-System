"""Unit tests for patient management schemas and validation logic.

These tests do not require a live database — they verify Pydantic schema
validation rules that mirror the business constraints.
"""
from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.patient import EmergencyContact, PatientCreate, PatientUpdate


# ─── PatientCreate validation ──────────────────────────────────────────────────

def _valid_payload(**overrides) -> dict:
    base = {
        "first_name": "Jane",
        "last_name": "Doe",
        "date_of_birth": date.today() - timedelta(days=365 * 30),
        "phone": "+61400000001",
    }
    base.update(overrides)
    return base


def test_create_valid_minimal():
    p = PatientCreate(**_valid_payload())
    assert p.first_name == "Jane"
    assert p.last_name == "Doe"
    assert p.email is None
    assert p.emergency_contact is None


def test_create_dob_today_rejected():
    with pytest.raises(ValidationError, match="cannot be today or in the future"):
        PatientCreate(**_valid_payload(date_of_birth=date.today()))


def test_create_dob_future_rejected():
    with pytest.raises(ValidationError, match="cannot be today or in the future"):
        PatientCreate(**_valid_payload(date_of_birth=date.today() + timedelta(days=1)))


def test_create_dob_past_accepted():
    p = PatientCreate(**_valid_payload(date_of_birth=date(1990, 5, 15)))
    assert p.date_of_birth == date(1990, 5, 15)


def test_create_first_name_required():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(first_name=""))


def test_create_last_name_required():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(last_name=""))


def test_create_first_name_too_long():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(first_name="A" * 101))


def test_create_phone_required():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(phone=""))


def test_create_valid_email_accepted():
    p = PatientCreate(**_valid_payload(email="jane@example.com"))
    assert str(p.email) == "jane@example.com"


def test_create_invalid_email_rejected():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(email="not-an-email"))


def test_create_medical_notes_too_long():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(medical_notes="x" * 5001))


def test_create_medical_notes_at_limit():
    p = PatientCreate(**_valid_payload(medical_notes="x" * 5000))
    assert len(p.medical_notes) == 5000  # type: ignore[arg-type]


def test_create_valid_gender_values():
    for gender in ("male", "female", "other", "prefer_not_to_say"):
        p = PatientCreate(**_valid_payload(gender=gender))
        assert p.gender == gender


def test_create_invalid_gender_rejected():
    with pytest.raises(ValidationError):
        PatientCreate(**_valid_payload(gender="unknown"))


# ─── EmergencyContact validation ───────────────────────────────────────────────

def test_emergency_contact_all_fields():
    ec = EmergencyContact(name="John Doe", phone="+61400000002", relationship="Spouse")
    assert ec.name == "John Doe"
    assert ec.relationship == "Spouse"


def test_emergency_contact_embedded_in_patient():
    p = PatientCreate(
        **_valid_payload(
            emergency_contact={
                "name": "John Doe",
                "phone": "+61400000002",
                "relationship": "Spouse",
            }
        )
    )
    assert p.emergency_contact is not None
    assert p.emergency_contact.name == "John Doe"


# ─── PatientUpdate validation ──────────────────────────────────────────────────

def test_update_all_fields_optional():
    # Empty update is valid — no required fields
    u = PatientUpdate()
    assert u.first_name is None
    assert u.phone is None


def test_update_partial_allowed():
    u = PatientUpdate(first_name="Janet")
    assert u.first_name == "Janet"
    assert u.last_name is None


def test_update_dob_future_rejected():
    with pytest.raises(ValidationError, match="cannot be today or in the future"):
        PatientUpdate(date_of_birth=date.today() + timedelta(days=1))


def test_update_dob_today_rejected():
    with pytest.raises(ValidationError, match="cannot be today or in the future"):
        PatientUpdate(date_of_birth=date.today())


def test_update_invalid_email_rejected():
    with pytest.raises(ValidationError):
        PatientUpdate(email="bad-email")


def test_update_medical_notes_too_long():
    with pytest.raises(ValidationError):
        PatientUpdate(medical_notes="x" * 5001)
