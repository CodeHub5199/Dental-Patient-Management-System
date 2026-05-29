"""
Unit tests for document storage utilities.
No database or Supabase connection required.
"""
import io
import pytest
from PIL import Image

from app.core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    detect_mime,
    generate_thumbnail,
)


# ── detect_mime ───────────────────────────────────────────────────────────────

class TestDetectMime:
    def test_jpeg_magic_bytes(self):
        content = b"\xff\xd8\xff\xe0" + b"\x00" * 100
        assert detect_mime(content) == "image/jpeg"

    def test_jpeg_alternate_marker(self):
        content = b"\xff\xd8\xff\xe1" + b"\x00" * 100
        assert detect_mime(content) == "image/jpeg"

    def test_png_magic_bytes(self):
        content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        assert detect_mime(content) == "image/png"

    def test_pdf_magic_bytes(self):
        content = b"%PDF-1.4\n" + b"\x00" * 100
        assert detect_mime(content) == "application/pdf"

    def test_dicom_magic_bytes(self):
        content = b"\x00" * 128 + b"DICM" + b"\x00" * 200
        assert detect_mime(content) == "image/dicom"

    def test_unknown_returns_octet_stream(self):
        assert detect_mime(b"\x00\x01\x02\x03\x04") == "application/octet-stream"

    def test_empty_bytes_returns_octet_stream(self):
        assert detect_mime(b"") == "application/octet-stream"

    def test_exe_not_in_allowed(self):
        # MZ (Windows PE) header
        exe = b"MZ" + b"\x00" * 200
        assert detect_mime(exe) not in ALLOWED_MIME_TYPES

    def test_zip_docx_not_in_allowed(self):
        # PK header (ZIP / Office Open XML)
        docx = b"PK\x03\x04" + b"\x00" * 200
        assert detect_mime(docx) not in ALLOWED_MIME_TYPES

    def test_short_dicom_no_magic(self):
        # DICOM preamble too short — should not match
        content = b"\x00" * 50 + b"DICM" + b"\x00" * 50
        assert detect_mime(content) != "image/dicom"

    def test_all_allowed_types_detectable(self):
        samples = {
            "image/jpeg": b"\xff\xd8\xff\xe0" + b"\x00" * 100,
            "image/png": b"\x89PNG\r\n\x1a\n" + b"\x00" * 100,
            "application/pdf": b"%PDF-1.7\n" + b"\x00" * 100,
            "image/dicom": b"\x00" * 128 + b"DICM" + b"\x00" * 200,
        }
        for mime, content in samples.items():
            assert detect_mime(content) == mime


# ── generate_thumbnail ────────────────────────────────────────────────────────

def _make_jpeg(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png(width: int, height: int, mode: str = "RGB") -> bytes:
    color = (0, 200, 100, 128) if "A" in mode else (0, 200, 100)
    img = Image.new(mode, (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestGenerateThumbnail:
    def test_pdf_returns_none(self):
        assert generate_thumbnail(b"%PDF-1.4", "application/pdf") is None

    def test_dicom_returns_none(self):
        content = b"\x00" * 128 + b"DICM" + b"\x00" * 200
        assert generate_thumbnail(content, "image/dicom") is None

    def test_octet_stream_returns_none(self):
        assert generate_thumbnail(b"\x00" * 100, "application/octet-stream") is None

    def test_invalid_image_bytes_returns_none(self):
        assert generate_thumbnail(b"\xff\xd8\xff\x00" * 5, "image/jpeg") is None

    def test_jpeg_thumbnail_max_400px(self):
        content = _make_jpeg(1200, 900)
        thumb = generate_thumbnail(content, "image/jpeg")
        assert thumb is not None
        img = Image.open(io.BytesIO(thumb))
        assert max(img.size) <= 400

    def test_jpeg_already_small_not_upscaled(self):
        content = _make_jpeg(100, 80)
        thumb = generate_thumbnail(content, "image/jpeg")
        assert thumb is not None
        img = Image.open(io.BytesIO(thumb))
        # Should not be larger than original
        assert img.width <= 100 and img.height <= 80

    def test_png_rgba_converted_to_jpeg(self):
        content = _make_png(600, 800, "RGBA")
        thumb = generate_thumbnail(content, "image/png")
        assert thumb is not None
        img = Image.open(io.BytesIO(thumb))
        assert img.format == "JPEG"
        assert img.mode == "RGB"

    def test_png_thumbnail_max_400px(self):
        content = _make_png(800, 1600)
        thumb = generate_thumbnail(content, "image/png")
        assert thumb is not None
        img = Image.open(io.BytesIO(thumb))
        assert max(img.size) <= 400

    def test_thumbnail_is_jpeg_bytes(self):
        content = _make_jpeg(500, 500)
        thumb = generate_thumbnail(content, "image/jpeg")
        assert thumb is not None
        # JPEG starts with FF D8 FF
        assert thumb[:3] == b"\xff\xd8\xff"


# ── constants ─────────────────────────────────────────────────────────────────

class TestConstants:
    def test_max_file_size_is_50mb(self):
        assert MAX_FILE_SIZE_BYTES == 50 * 1024 * 1024

    def test_allowed_mime_types(self):
        assert "image/jpeg" in ALLOWED_MIME_TYPES
        assert "image/png" in ALLOWED_MIME_TYPES
        assert "application/pdf" in ALLOWED_MIME_TYPES
        assert "image/dicom" in ALLOWED_MIME_TYPES

    def test_disallowed_mime_types(self):
        assert "application/octet-stream" not in ALLOWED_MIME_TYPES
        assert "text/html" not in ALLOWED_MIME_TYPES
        assert "application/zip" not in ALLOWED_MIME_TYPES
        assert "application/x-msdownload" not in ALLOWED_MIME_TYPES

    def test_allowed_document_types(self):
        expected = {"xray", "photo", "consent_form", "prescription", "lab_report", "other"}
        assert ALLOWED_DOCUMENT_TYPES == expected
