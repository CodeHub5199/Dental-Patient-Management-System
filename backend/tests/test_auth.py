"""Unit tests for auth security utilities — no DB required."""

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)


def test_hash_password_is_not_plaintext():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"


def test_verify_correct_password():
    hashed = hash_password("correct-password")
    assert verify_password("correct-password", hashed) is True


def test_verify_wrong_password():
    hashed = hash_password("correct-password")
    assert verify_password("wrong-password", hashed) is False


def test_access_token_payload():
    token = create_access_token("user-uuid-123", "dentist")
    payload = decode_token(token)
    assert payload["sub"] == "user-uuid-123"
    assert payload["role"] == "dentist"
    assert payload["type"] == "access"


def test_refresh_token_payload():
    token = create_refresh_token("user-uuid-456", "receptionist")
    payload = decode_token(token)
    assert payload["sub"] == "user-uuid-456"
    assert payload["role"] == "receptionist"
    assert payload["type"] == "refresh"


def test_access_and_refresh_tokens_differ():
    access = create_access_token("uid", "dentist")
    refresh = create_refresh_token("uid", "dentist")
    assert access != refresh


def test_decode_invalid_token_raises():
    with pytest.raises(ValueError):
        decode_token("not.a.valid.token")


def test_decode_tampered_token_raises():
    token = create_access_token("uid", "dentist")
    tampered = token[:-4] + "xxxx"
    with pytest.raises(ValueError):
        decode_token(tampered)


def test_generate_reset_token_returns_raw_and_hash():
    raw, token_hash = generate_reset_token()
    assert len(raw) > 0
    assert len(token_hash) == 64  # SHA-256 hex digest


def test_hash_reset_token_is_deterministic():
    raw, first_hash = generate_reset_token()
    second_hash = hash_reset_token(raw)
    assert first_hash == second_hash


def test_different_raws_produce_different_hashes():
    _, hash1 = generate_reset_token()
    _, hash2 = generate_reset_token()
    assert hash1 != hash2


def test_rbac_token_type_distinction():
    """Access token type must differ from refresh token type."""
    access = create_access_token("uid", "dentist")
    refresh = create_refresh_token("uid", "dentist")
    access_payload = decode_token(access)
    refresh_payload = decode_token(refresh)
    assert access_payload["type"] != refresh_payload["type"]
