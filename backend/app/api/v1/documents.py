import asyncio
import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from werkzeug.utils import secure_filename

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role
from app.core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    detect_mime,
    delete_files,
    generate_thumbnail,
    get_signed_url,
    upload_file,
)
from app.models.document import Document
from app.models.patient import Patient
from app.schemas.auth import MessageResponse
from app.schemas.document import DocumentResponse, DocumentUpdate, PaginatedDocuments

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)


async def _build_response(doc: Document) -> DocumentResponse:
    """Attach uploader name and fresh signed URLs to a document ORM object."""
    resp = DocumentResponse.model_validate(doc)
    if doc.uploader:
        resp.uploader_name = doc.uploader.full_name
    try:
        url_coros = [get_signed_url(doc.storage_path)]
        if doc.has_thumbnail and doc.thumbnail_path:
            url_coros.append(get_signed_url(doc.thumbnail_path))
        results = await asyncio.gather(*url_coros, return_exceptions=True)
        resp.download_url = results[0] if not isinstance(results[0], Exception) else ""
        if len(results) > 1:
            resp.thumbnail_url = results[1] if not isinstance(results[1], Exception) else None
    except Exception as exc:
        logger.warning("Signed URL generation failed for doc %s: %s", doc.id, exc)
    return resp


@router.get("", response_model=PaginatedDocuments)
async def list_documents(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(None),
    appointment_id: UUID | None = Query(None),
    document_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Document).options(selectinload(Document.uploader))
    if patient_id:
        query = query.where(Document.patient_id == patient_id)
    if appointment_id:
        query = query.where(Document.appointment_id == appointment_id)
    if document_type:
        query = query.where(Document.document_type == document_type)

    query = query.order_by(Document.uploaded_at.desc())
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    docs = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).scalars().all()

    responses = list(await asyncio.gather(*[_build_response(d) for d in docs]))
    return PaginatedDocuments(
        data=responses,
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
    patient_id: UUID = Form(...),
    appointment_id: UUID | None = Form(None),
    treatment_id: UUID | None = Form(None),
    document_type: str = Form(...),
    notes: str | None = Form(None),
):
    # ── Validate notes length ─────────────────────────────────────────────────
    if notes and len(notes) > 500:
        raise HTTPException(status_code=422, detail="Notes exceed maximum length of 500 characters.")

    # ── Validate document_type ────────────────────────────────────────────────
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid document type. Allowed: {sorted(ALLOWED_DOCUMENT_TYPES)}",
        )

    # ── Read file + size check ────────────────────────────────────────────────
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="This file exceeds the 50 MB size limit.",
        )

    # ── Magic-bytes MIME detection ─────────────────────────────────────────────
    mime_type = detect_mime(content)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type not supported. Accepted types: JPEG, PNG, PDF, DICOM.",
        )

    # ── Patient must exist and be active ──────────────────────────────────────
    patient = (
        await db.execute(select(Patient).where(Patient.id == patient_id))
    ).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    if not patient.is_active:
        raise HTTPException(status_code=422, detail="Patient is inactive.")

    # ── Sanitise filename + build storage path ────────────────────────────────
    safe_name = secure_filename(file.filename or "upload") or "upload"
    storage_path = f"{patient_id}/{uuid4()}_{safe_name}"

    # ── Upload file to Supabase Storage ───────────────────────────────────────
    try:
        await upload_file(storage_path, content, mime_type)
    except Exception as exc:
        logger.error("Storage upload failed: %s", exc)
        raise HTTPException(status_code=502, detail="File upload failed. Please try again.")

    # ── Generate + upload thumbnail (non-fatal failure) ────────────────────────
    thumbnail_path: str | None = None
    has_thumbnail = False
    thumb_bytes = generate_thumbnail(content, mime_type)
    if thumb_bytes:
        thumbnail_path = f"{storage_path}_thumb.jpg"
        try:
            await upload_file(thumbnail_path, thumb_bytes, "image/jpeg")
            has_thumbnail = True
        except Exception as exc:
            logger.warning("Thumbnail upload failed (non-fatal): %s", exc)
            thumbnail_path = None

    # ── DB insert with compensating storage delete on failure ─────────────────
    doc = Document(
        patient_id=patient_id,
        appointment_id=appointment_id,
        treatment_id=treatment_id,
        document_type=document_type,
        file_name=safe_name,
        storage_path=storage_path,
        file_size=len(content),
        mime_type=mime_type,
        notes=notes,
        has_thumbnail=has_thumbnail,
        thumbnail_path=thumbnail_path if has_thumbnail else None,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    try:
        await db.flush()
        result = await db.execute(
            select(Document).options(selectinload(Document.uploader)).where(Document.id == doc.id)
        )
        doc = result.scalar_one()
    except Exception as exc:
        logger.error("DB insert failed after storage upload; cleaning up. Error: %s", exc)
        cleanup = [storage_path]
        if thumbnail_path:
            cleanup.append(thumbnail_path)
        try:
            await delete_files(cleanup)
        except Exception as cleanup_exc:
            logger.error("Storage cleanup failed: %s", cleanup_exc)
        raise HTTPException(status_code=500, detail="Failed to save document record.")

    return await _build_response(doc)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).options(selectinload(Document.uploader)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="This document no longer exists or has been removed.",
        )
    return await _build_response(doc)


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="This document no longer exists or has been removed.",
        )
    try:
        url = await get_signed_url(doc.storage_path)
    except Exception as exc:
        logger.error("Signed URL generation failed for %s: %s", document_id, exc)
        raise HTTPException(status_code=502, detail="Could not generate download link.")
    return RedirectResponse(url=url, status_code=302)


@router.get("/{document_id}/thumbnail")
async def get_thumbnail_url(
    document_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.has_thumbnail or not doc.thumbnail_path:
        raise HTTPException(status_code=400, detail="No thumbnail available for this document.")
    try:
        url = await get_signed_url(doc.thumbnail_path)
    except Exception as exc:
        logger.error("Thumbnail signed URL failed for %s: %s", document_id, exc)
        raise HTTPException(status_code=502, detail="Could not generate thumbnail URL.")
    return {"thumbnail_url": url}


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document_metadata(
    document_id: UUID,
    body: DocumentUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update document notes. Any staff member can edit their own uploads."""
    result = await db.execute(
        select(Document).options(selectinload(Document.uploader)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if body.notes is not None:
        doc.notes = body.notes
    await db.flush()
    result = await db.execute(
        select(Document).options(selectinload(Document.uploader)).where(Document.id == document_id)
    )
    doc = result.scalar_one()
    return await _build_response(doc)


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: UUID,
    current_user=Depends(require_role("dentist")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    paths = [doc.storage_path]
    if doc.has_thumbnail and doc.thumbnail_path:
        paths.append(doc.thumbnail_path)

    try:
        await delete_files(paths)
    except Exception as exc:
        # Log but continue — DB consistency takes priority; storage orphan is recoverable
        logger.error("Storage deletion failed for doc %s: %s", document_id, exc)

    await db.delete(doc)
    await db.flush()
    logger.info(
        "Document %s permanently deleted by user %s (role: %s)",
        document_id,
        current_user.id,
        current_user.role,
    )
    return MessageResponse(message="Document deleted successfully.")
