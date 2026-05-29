# Feature Spec: Clinical Charting

**Document Version:** 1.0
**Feature:** Clinical Charting (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

Clinical documentation is the legal and professional backbone of dental practice. When a dentist examines and treats a patient, they are required — by professional standards and potential medicolegal scrutiny — to have a contemporaneous written record of what the patient complained of, what the dentist found, what was diagnosed, and what was done or planned. Without this documentation, a practice is exposed to liability, insurance disputes, and continuity-of-care failures.

In practices relying on paper charts, these records become difficult to retrieve, impossible to search, and vulnerable to loss. In practices using disconnected software (a separate notes tool, a spreadsheet for treatments), clinical data is fragmented: the dentist may have written a note on one system while the fee was logged somewhere else with no link between the two.

Beyond legal protection, good clinical charting directly benefits patient care. When a patient returns six months later, the dentist should be able to pull up exactly what was done, on which tooth, with which material, and what was planned for the next visit — in under 30 seconds.

This feature provides the dentist with a structured, appointment-linked clinical workspace where they can document what happened in the chair: the clinical narrative (SOAP note) and the procedural record (which tooth, which procedure, at what cost).

---

## 2. Functional Requirements

### 2.1 SOAP Note Documentation

SOAP is a universally recognised clinical documentation framework used across healthcare. Each letter stands for:

- **S — Subjective:** What the patient reports. Their complaint, pain level, symptoms, duration. Written in the patient's voice where appropriate. *Example: "Patient reports sensitivity to cold in the lower left area for approximately two weeks."*
- **O — Objective:** What the clinician observes and measures. Clinical findings from examination, x-ray findings, probing depths. *Example: "Clinical examination reveals occlusal caries on tooth #36. Periapical radiograph shows caries approximating the dentin."*
- **A — Assessment:** The clinical diagnosis or professional judgement. *Example: "Dental caries on tooth #36 requiring composite restoration."*
- **P — Plan:** What will be done now and at follow-up. *Example: "Composite restoration tooth #36 today. Review sensitivity at next appointment."*

The system provides four dedicated text fields, one for each SOAP component, on a note linked to a specific appointment and patient.

Each note is automatically attributed to the dentist who created it, with a timestamp.

### 2.2 SOAP Note History

- The full history of all SOAP notes for a patient is accessible on their profile.
- Notes are displayed in reverse chronological order (most recent first).
- Notes are read-only for receptionists. Only the dentist can create, edit, or delete their own notes.

### 2.3 Treatment / Procedure Recording

Alongside the narrative SOAP note, the dentist records the specific procedure(s) performed during the appointment:

- **Tooth number:** Using the internationally recognised FDI (Fédération Dentaire Internationale) notation. Tooth numbers run from 11 to 48 (with the first digit indicating the quadrant and the second indicating the tooth position). Procedures not linked to a specific tooth are recorded as "General" (e.g., examination, consultation).
- **Procedure name / code:** Selected from a pre-configured list or entered manually. Optionally includes a standard procedure code (e.g., ADA D-codes).
- **Description:** Free-text detail about the procedure. *Example: "Occlusal composite restoration, shade A2, rubber dam isolation used."*
- **Fee charged:** The amount billed for this procedure. This is recorded for analytics purposes (e.g., revenue reporting) and is not a billing or invoicing system.
- **Status:** Whether the procedure is `Planned` (to be done in a future visit), `In Progress`, or `Completed`.
- **Date performed.**

Multiple procedures can be recorded against a single appointment.

### 2.4 Linking Records

- A SOAP note is linked to both the patient and the specific appointment it belongs to.
- A treatment record is linked to the patient and, optionally, to an appointment.
- This linkage means that when reviewing a patient's appointment history, the associated clinical note and all procedures from that visit are immediately accessible without navigating away.

---

## 3. Input / Output Behaviour

### Creating a SOAP Note

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| Patient ID (context) | Must be an existing active patient | Note associated with the patient | "Patient not found" |
| Appointment ID (optional) | If provided, must belong to the same patient | Note linked to the appointment | "This appointment does not belong to this patient" |
| Subjective text | Required, 10–5,000 characters | Saved | "Subjective field is required (minimum 10 characters)" |
| Objective text | Required, 10–5,000 characters | Saved | "Objective field is required (minimum 10 characters)" |
| Assessment text | Required, 10–5,000 characters | Saved | "Assessment field is required (minimum 10 characters)" |
| Plan text | Required, 10–5,000 characters | Saved | "Plan field is required (minimum 10 characters)" |

On success: note is saved, attributed to the logged-in dentist, and timestamped. It appears at the top of the patient's SOAP note history.

### Recording a Treatment

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| Tooth number | Must be valid FDI notation (11–18, 21–28, 31–38, 41–48) or "General" | Saved | "Invalid tooth number. Use FDI notation (e.g., 36) or 'General'." |
| Procedure name | Required, max 200 characters | Saved | "Procedure name is required" |
| Amount | Optional; if provided, must be a non-negative number with up to 2 decimal places | Saved | "Amount must be a positive number" |
| Status | Required (`Planned`, `In Progress`, `Completed`) | Saved | "Please select a treatment status" |
| Performed date | Required, must not be in the future | Saved | "Performed date cannot be in the future" |

### Viewing Clinical History

| Request | Output |
|---|---|
| View SOAP notes for a patient | Chronological list of all notes with date, appointment type, and the four SOAP fields. Most recent first. |
| View treatments for a patient | List of all procedures with tooth number, procedure name, amount, status, and date. Can be filtered by status or tooth number. |
| View clinical activity for a specific appointment | SOAP note(s) and treatment(s) linked to that appointment displayed together. |

---

## 4. Constraints

- **Only the dentist can create, edit, or delete clinical notes.** Receptionists have read-only access to SOAP notes. This is a hard role-based restriction.
- Only the dentist who created a note can edit or delete it. If a second dentist were ever added in a future version, they would not be able to alter another dentist's notes.
- All four SOAP fields must be completed before a note can be saved. Partial notes are not permitted, as they are legally incomplete records.
- Treatment records can be entered during or after an appointment but **cannot be backdated more than the appointment date** — if linked to an appointment, the performed date must match or be no earlier than the appointment date.
- Procedure amounts are recorded for internal analytics only. The system is not an invoicing or billing platform and does not generate patient invoices in MVP.
- FDI tooth notation is used rather than Universal (Palmer) notation, as FDI is the international standard adopted in most modern dental software.
- Clinical notes cannot be bulk-deleted. Each deletion is individual and deliberate.
- Editing a completed (signed-off) clinical note preserves the `updated_at` timestamp, creating a traceable change record.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| Dentist tries to save a SOAP note with one field empty | Save is blocked. The empty field is highlighted with an error: "This field is required." |
| Receptionist tries to create a SOAP note | Access denied. The "New Clinical Note" button is not visible to receptionists. If attempted via direct URL, a "Permission denied" response is returned. |
| Procedure recorded for a tooth number outside FDI range | Blocked. "Invalid tooth number. FDI notation ranges from 11 to 48." |
| Amount entered as a negative number | Blocked. "Amount must be a non-negative number." |
| Same tooth has multiple procedures across different appointments | Each is recorded independently and all appear in the treatment history. Filtering by tooth number shows the full history for that tooth. |
| Dentist creates a SOAP note not linked to a specific appointment | Permitted. The note is still linked to the patient and timestamped, but without an appointment reference. |
| Dentist edits a SOAP note written yesterday | Allowed. The note saves with an `updated_at` timestamp, distinguishing the edit from the original creation. |
| Dentist deletes a SOAP note | The note is permanently removed. This action requires a confirmation prompt: "Are you sure you want to delete this clinical note? This cannot be undone." |
| Treatment recorded as "Planned" and appointment is later completed | The treatment status must be manually updated to "Completed" by the dentist. The system does not auto-complete planned treatments. |
| Patient has no clinical notes on record | The profile displays "No clinical notes on record" rather than an empty list. |
| Very long SOAP note (near 5,000-character limit) | The text field displays a character counter. At the limit, no further input is accepted and a message shows: "Maximum character limit reached (5,000)." |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**SOAP Note Creation:**
- [ ] The dentist can create a SOAP note linked to a patient and (optionally) an appointment.
- [ ] All four fields (S, O, A, P) must be populated; saving with any field empty is blocked.
- [ ] The note is attributed to the logged-in dentist with the correct timestamp.
- [ ] The note immediately appears at the top of the patient's SOAP note history.

**SOAP Note Access & Editing:**
- [ ] Receptionists can view SOAP notes but cannot see a "Create", "Edit", or "Delete" option.
- [ ] The dentist can edit their own notes; the `updated_at` timestamp updates on save.
- [ ] The dentist can delete their own notes after confirming the action.
- [ ] Editing or deleting another dentist's note (if applicable) is blocked.

**Treatment Recording:**
- [ ] The dentist can record a procedure with a valid FDI tooth number or "General".
- [ ] Invalid FDI tooth numbers are rejected with a clear message.
- [ ] Multiple procedures can be recorded for a single appointment.
- [ ] A treatment with status "Planned" can be updated to "In Progress" or "Completed" in a subsequent session.
- [ ] Treatment amount is optional; when omitted, the record is saved without a fee value.

**Linking & History:**
- [ ] A patient's SOAP note history displays all notes in reverse chronological order.
- [ ] A patient's treatment history can be filtered by status and by tooth number.
- [ ] Viewing a specific appointment shows all SOAP notes and treatments linked to it.
- [ ] A SOAP note linked to an appointment that belongs to a different patient is rejected.
