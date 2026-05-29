import asyncio
import io
import logging
import threading
from typing import Optional

from PIL import Image
from supabase import create_client, Client

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Client] = None
_client_lock = threading.Lock()

ALLOWED_MIME_TYPES = frozenset([
    "image/jpeg",
    "image/png",
    "image/dicom",
    "application/pdf",
])

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_DOCUMENT_TYPES = frozenset([
    "xray", "photo", "consent_form", "prescription", "lab_report", "other"
])

IMAGE_MIME_TYPES = frozenset(["image/jpeg", "image/png"])


def _get_client() -> Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = create_client(
                    settings.supabase_url,
                    settings.supabase_service_role_key,
                )
    return _client


def detect_mime(content: bytes) -> str:
    """Identify MIME type from file magic bytes for the 4 supported formats."""
    if len(content) >= 3 and content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(content) >= 8 and content[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(content) >= 4 and content[:4] == b"%PDF":
        return "application/pdf"
    # DICOM: 128-byte preamble then "DICM" magic
    if len(content) > 132 and content[128:132] == b"DICM":
        return "image/dicom"
    return "application/octet-stream"


def generate_thumbnail(content: bytes, mime_type: str) -> Optional[bytes]:
    """Resize JPEG/PNG to max 400 px longest side, JPEG quality 75. Returns None for other types."""
    if mime_type not in IMAGE_MIME_TYPES:
        return None
    try:
        img = Image.open(io.BytesIO(content))
        img.thumbnail((400, 400), Image.LANCZOS)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=75, optimize=True)
        return buf.getvalue()
    except Exception as exc:
        logger.warning("Thumbnail generation failed: %s", exc)
        return None


# ── Sync wrappers run in thread pool via asyncio.to_thread ────────────────────

def _do_upload(path: str, content: bytes, mime_type: str) -> None:
    _get_client().storage.from_(settings.supabase_storage_bucket).upload(
        path, content, {"content-type": mime_type}
    )


def _do_delete(paths: list[str]) -> None:
    _get_client().storage.from_(settings.supabase_storage_bucket).remove(paths)


def _do_signed_url(path: str, expires_in: int) -> str:
    resp = _get_client().storage.from_(settings.supabase_storage_bucket).create_signed_url(
        path, expires_in
    )
    if isinstance(resp, dict):
        return resp.get("signedURL") or resp.get("signed_url") or ""
    return getattr(resp, "signed_url", None) or getattr(resp, "signedURL", None) or ""


# ── Async public API ──────────────────────────────────────────────────────────

async def upload_file(path: str, content: bytes, mime_type: str) -> None:
    await asyncio.to_thread(_do_upload, path, content, mime_type)


async def delete_files(paths: list[str]) -> None:
    if paths:
        await asyncio.to_thread(_do_delete, paths)


async def get_signed_url(path: str, expires_in: int = 900) -> str:
    return await asyncio.to_thread(_do_signed_url, path, expires_in)
