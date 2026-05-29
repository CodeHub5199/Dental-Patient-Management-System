# Feature Spec: Document Storage

**Document Version:** 1.0
**Feature:** Document Storage (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

Modern dental care is inseparable from clinical documentation that goes beyond written notes. X-rays (radiographs) are taken at almost every significant treatment — they are essential for diagnosis, treatment planning, and post-treatment verification. Consent forms must be signed and retained before procedures with any clinical risk. Photographs document pre- and post-treatment conditions. Lab reports accompany crown and denture work. Prescriptions need to be on file.

In most small practices, these documents are stored in physical folders, filed by patient name, taking up space and making retrieval slow. When a patient calls to ask about their last x-ray or a clinical question about a consent form, the receptionist has to find the physical file — a process that can take minutes, and becomes unreliable when files are misfiled or damaged.

More critically, radiographs are a patient safety issue. If a dentist does not have access to the patient's most recent x-ray, they may expose the patient to unnecessary additional radiation, or miss a condition that was already visible in a previous image.

This feature provides a secure, structured, per-patient document library. Any digital file associated with a patient — whether uploaded at reception, taken chair-side by the dentist, or received from an external laboratory — is stored in one place, tagged by type, and retrievable in seconds.

---

## 2. Functional Requirements

### 2.1 Uploading Documents

- Any authorised staff member can upload files for a patient.
- Uploads are linked to:
  - The patient (always required)
  - An appointment (optional — for files that belong to a specific visit)
  - A treatment record (optional — for files that belong to a specific procedure)
- Each upload requires the staff member to select a **document type** from a defined list:
  - **X-ray / Radiograph** — Bitewing, periapical, panoramic, CBCT scans
  - **Clinical Photo** — Intraoral or extraoral photographs
  - **Consent Form** — Signed patient consent for procedures
  - **Prescription** — Written prescriptions issued to the patient
  - **Lab Report** — Reports or results from external dental laboratories
  - **Other** — Any other clinical or administrative file
- An optional **notes** field allows staff to describe the document (e.g., "Right bitewing, pre-treatment", "Consent for extraction tooth #46").
- Multiple files can be uploaded in a single session.

### 2.2 Viewing Documents

- A patient's document library is accessible from their profile.
- The library lists all documents with their type, file name, upload date, uploader name, and notes.
- Documents can be filtered by type (e.g., show only x-rays).
- Image files (X-rays, photos) can be viewed inline directly in the browser without downloading.
- Non-image files (PDFs for consent forms, lab reports) open in the browser's built-in PDF viewer or prompt a download.

### 2.3 Downloading Documents

- Any authorised user can download a document to their local device.
- Downloads use a secure, time-limited link generated at the moment of the request. Links cannot be shared or reused.

### 2.4 Deleting Documents

- Only the dentist can permanently delete a document from the system.
- Deletion is irreversible and requires an explicit confirmation.
- Document deletion is logged for audit purposes.

### 2.5 Thumbnails & Previews

- For image-type documents, the system generates a small preview thumbnail.
- Thumbnails are displayed in the document list for quick visual identification, so staff can see at a glance which x-ray or photo is which without opening the full file.

---

## 3. Input / Output Behaviour

### Uploading a Document

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| File | Required; must be JPEG, PNG, DICOM, or PDF; max 50 MB | File stored securely; appears in patient's document library | "File type not supported. Accepted types: JPEG, PNG, PDF, DICOM." / "File exceeds the 50 MB size limit." |
| Patient ID | Required, must be an active patient | File linked to patient | "Patient not found" |
| Document type | Required, must be selected from the list | Saved | "Please select a document type" |
| Notes | Optional, max 500 characters | Saved with document | "Notes exceed maximum length" |

On success: The document appears immediately in the patient's document library with the correct type tag, uploader, and timestamp.

### Viewing the Document Library

| Request | Output |
|---|---|
| Open patient document library | Paginated list of all documents: type, file name, notes, uploader, date |
| Filter by document type | Only documents of the selected type are shown |
| Click an image document | Inline viewer opens; image is displayed in the browser |
| Click a PDF document | PDF opens in browser viewer or downloads |
| Hover/focus on image document | Thumbnail preview is shown |

### Downloading a Document

| Request | Output |
|---|---|
| Click "Download" on a document | Browser receives the file with the original filename. Link is single-use and expires after a short window. |

### Deleting a Document

| Request | Output on Confirm | Output on Cancel |
|---|---|---|
| Dentist clicks "Delete" | Confirmation prompt shown; on confirm, file permanently removed from storage and library | No change |
| Receptionist clicks (if visible) | "You do not have permission to delete documents" | — |

---

## 4. Constraints

- **Accepted file types are strictly controlled:** Only JPEG, PNG, PDF, and DICOM formats are accepted. Executable files, Office documents, ZIP archives, and other formats are rejected at upload. This is a security measure to prevent malicious files from entering the system.
- **Maximum file size is 50 MB per file.** This accommodates high-resolution panoramic X-rays and CBCT scans while preventing storage abuse.
- Files are stored in private, access-controlled cloud storage. Files cannot be accessed by their storage URL alone — every access requires a valid authenticated session.
- File names are sanitised on upload to remove special characters and path components that could cause security issues.
- Documents are **never publicly accessible.** Download links are signed, time-limited, and generated only for authenticated users.
- **Only the dentist can delete documents.** This protects against accidental deletion of medicolegally significant records.
- Bulk document upload (uploading a folder or multiple selected files at once) is supported in the upload interface.
- Permanent deletion of files cannot be undone. There is no "trash" or recovery mechanism in MVP.
- The system does not perform OCR (text recognition) on uploaded documents in MVP — documents are stored as-is.
- DICOM files (the standard format for dental radiograph equipment) are stored and downloadable but may not render as inline previews in all browsers — this is a known limitation of the format.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| Staff uploads a file type that is not on the allow-list (e.g., a `.docx` or `.exe`) | Upload is blocked. "File type not supported. Accepted types: JPEG, PNG, PDF, DICOM." |
| File exceeds 50 MB | Upload is blocked before transfer completes. "This file exceeds the 50 MB size limit." |
| Staff uploads the same file name for the same patient | Allowed — the system does not de-duplicate by filename. Both files are stored with unique internal identifiers. A note should distinguish them. |
| Network drops mid-upload | The partial upload is discarded. The staff member sees an error and can retry. No partial or corrupted files are stored. |
| Receptionist attempts to delete a document | The delete button is not visible to receptionists. If the action is attempted through other means, "Permission denied" is returned. |
| Staff tries to view a document that has been deleted | "This document no longer exists or has been removed." |
| Patient has no documents on file | The document library shows "No documents uploaded for this patient." |
| Download link is accessed after it expires | "This download link has expired. Please return to the patient record to generate a new one." |
| DICOM file is uploaded | File is accepted and stored. A download button is provided. An inline preview may not be available — the library shows a file icon with the label "DICOM — click to download." |
| Very large image (e.g., high-resolution panoramic X-ray under 50 MB) is uploaded | Accepted and stored. Thumbnail generation may take a moment — a loading indicator is shown while the thumbnail processes. |
| Staff uploads a document and selects the wrong appointment | Staff can edit the document's metadata (notes, appointment link) after upload. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Upload:**
- [ ] Staff can upload a JPEG, PNG, PDF, or DICOM file for a patient.
- [ ] Files with disallowed types (e.g., `.exe`, `.docx`) are rejected with a clear error.
- [ ] Files over 50 MB are rejected before the upload completes.
- [ ] Uploaded files are immediately visible in the patient's document library.
- [ ] Each uploaded document correctly records its type, uploader, and timestamp.
- [ ] Multiple files can be uploaded in a single session.

**Viewing & Downloading:**
- [ ] The document library displays all files with type, name, notes, uploader, and date.
- [ ] Filtering the library by document type correctly shows only the selected type.
- [ ] Image files (JPEG, PNG) can be viewed inline without downloading.
- [ ] PDF files open in a browser PDF viewer or prompt a download.
- [ ] Thumbnails are shown for image-type documents in the list.
- [ ] A download link is generated on request, delivers the file with the original name, and cannot be reused after it expires.

**Security:**
- [ ] A document URL cannot be accessed without an authenticated session.
- [ ] Download links expire after their defined window.
- [ ] A receptionist cannot see a "Delete" button for any document.

**Deletion:**
- [ ] The dentist can delete a document after confirming the action.
- [ ] Deleted documents no longer appear in the patient's document library.
- [ ] Deletion is logged internally for audit purposes.
- [ ] A receptionist attempting deletion receives a "Permission denied" response.
