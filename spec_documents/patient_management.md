# Feature Spec: Patient Management

**Document Version:** 1.0
**Feature:** Patient Management (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

The patient record is the foundation of every dental practice. Before a dentist can treat someone, and before a receptionist can book an appointment, a complete and accurate patient profile must exist in the system. In many smaller practices, this information lives across paper forms, spreadsheets, and the memories of long-tenured staff — creating serious risks: critical allergies get overlooked, patients are contacted on outdated phone numbers, and duplicate records accumulate over the years.

Beyond registration, staff need to be able to quickly find any patient by name, phone number, or email. In a busy clinic with 15–20 appointments per day, a receptionist who has to scroll through hundreds of records to find "John D." is a receptionist who is slowing down the queue.

This feature provides the authoritative record of every patient in the practice: who they are, how to reach them, what conditions or allergies the dentist must know before touching them, and who to call in an emergency. It is the starting point for every other workflow in the system.

---

## 2. Functional Requirements

### 2.1 Patient Registration

- Any authorised staff member (dentist or receptionist) can register a new patient.
- The registration form captures:
  - **Personal details:** First name, last name, date of birth, gender
  - **Contact details:** Phone number (primary), email address (optional), physical address (optional)
  - **Emergency contact:** Name, phone number, relationship to patient
  - **Medical notes:** A free-text field for allergies, current medications, systemic conditions (e.g., diabetes, hypertension, heart conditions, blood thinners), and any other clinical alerts that the dentist must be aware of before treatment
- Phone number is the primary unique identifier for a patient. No two patients can share the same phone number.

### 2.2 Viewing a Patient Profile

- Any staff member can view a patient's full profile.
- The profile displays all registered information alongside a summary of clinical activity:
  - Total number of appointments
  - Total number of treatments recorded
  - Date of last visit
  - Next upcoming appointment (if any)
- From the profile, staff can navigate directly to the patient's appointment history, treatment history, clinical notes, and documents.

### 2.3 Updating Patient Information

- Any staff member can update a patient's personal, contact, or emergency contact details.
- The dentist can update medical notes directly on the profile.
- Every update is timestamped automatically.

### 2.4 Patient Search

- Staff can search for patients using a search bar that matches against:
  - First name
  - Last name
  - Phone number
  - Email address
- A quick-search (autocomplete) mode returns the top matching results as the user types, without requiring a full page load.
- The full patient list supports sorting (by name or registration date) and pagination for large record sets.

### 2.5 Deactivating a Patient Record

- Rather than permanently deleting patient records (which would destroy historical clinical and legal data), the system supports **soft deletion** — marking a patient as inactive.
- An inactive patient does not appear in standard search results or appointment scheduling.
- Their full record and history remain preserved and can be retrieved by specifically filtering for inactive patients.
- Only the dentist can reactivate an inactive patient.

---

## 3. Input / Output Behaviour

### Registering a New Patient

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| First name + Last name | Required, max 100 characters each | New patient record created; profile page opens | "First name is required" / "Last name is required" |
| Date of birth | Required, must be a past date | Saved to profile | "Date of birth cannot be in the future" |
| Phone number | Required, must be unique in the system | Saved as primary contact | "A patient with this phone number already exists" |
| Email address | Optional; if provided, must be a valid email format and unique | Saved to profile | "Invalid email format" / "Email already in use" |
| Medical notes | Optional, max 5,000 characters | Saved with a medical alert indicator on the profile if populated | "Notes exceed maximum length" |

### Searching for a Patient

| Input | Output |
|---|---|
| 2+ characters typed in the search bar | Autocomplete list of up to 10 matching patients showing name, phone, and last visit date |
| Full search submitted | Paginated list of all matching patients with sort options |
| Search with no matches | "No patients found matching your search." |

### Deactivating a Patient

| Input | Output |
|---|---|
| Dentist confirms deactivation | Patient marked inactive, removed from standard search and scheduling |
| Attempt to book an appointment for an inactive patient | "This patient record is inactive. Please reactivate before scheduling." |

---

## 4. Constraints

- Patient records are **never permanently deleted** from the database. Deactivation is the only removal mechanism. This preserves clinical and legal history.
- Phone number must be unique across the entire patient database — including inactive patients.
- A patient cannot be registered with a future date of birth.
- Medical notes are a plain-text field and do not support document attachments (those belong in the Document Storage feature). They are intended for brief, critical clinical flags.
- The medical notes field is visible to all staff but should be understood by the team as clinically sensitive information — it will be displayed prominently on appointment and charting screens.
- Bulk import of patients (e.g., from a CSV or legacy system) is **out of scope for MVP**.
- The system does not track patient insurance information in MVP.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| Receptionist registers a patient with a phone number that already exists | System blocks the save and displays: "A patient with this phone number already exists. Would you like to view that record?" |
| Staff searches for a patient using an archived (inactive) name | Inactive patients do not appear in standard search. A filter toggle ("Show inactive patients") reveals them. |
| Date of birth entered as today's date | Blocked — a patient born today cannot be a dental patient scheduled for an appointment. |
| Medical notes field left blank | Allowed. However, the profile does not display a medical alert indicator, signalling to clinical staff that no alerts are on file. |
| Two receptionists register the same patient simultaneously | The second submission detects the duplicate phone number and is rejected, even if the first submission is mid-save. |
| Patient provides only a first name (no last name) | Last name is required. The system prompts: "Last name is required." |
| Emergency contact phone number is the same as the patient's | Allowed — this is uncommon but not invalid. No system restriction applies. |
| A patient has 0 appointments on record | Profile displays "No visits on record" rather than empty or zero-value fields. |
| Staff attempts to reactivate a patient | Only a dentist can do this. Receptionists see the inactive record but do not see a "Reactivate" button. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Patient Registration:**
- [ ] A staff member can successfully register a new patient with all required fields populated.
- [ ] A registration attempt with a duplicate phone number is rejected with a clear message.
- [ ] A registration attempt with a future date of birth is rejected.
- [ ] Optional fields (email, address, emergency contact, medical notes) can be left blank without blocking registration.
- [ ] A newly registered patient's profile is immediately accessible and searchable.

**Patient Profile:**
- [ ] All registered information is displayed correctly on the patient profile.
- [ ] The profile summary shows correct counts for appointments, treatments, and last visit date.
- [ ] If medical notes are present, a visible medical alert indicator appears on the profile.
- [ ] Navigation links to the patient's appointments, treatments, SOAP notes, and documents are functional.

**Search:**
- [ ] Typing 2 characters in the search bar returns relevant autocomplete results within 1 second.
- [ ] Full search returns paginated results that can be sorted by name or registration date.
- [ ] Searching for a non-existent patient returns a clear "no results" message.
- [ ] Inactive patients do not appear in standard search results.
- [ ] Inactive patients appear when the "Show inactive patients" filter is applied.

**Update & Deactivation:**
- [ ] A staff member can update a patient's contact and personal details.
- [ ] The `updated_at` timestamp changes on every save.
- [ ] The dentist can deactivate a patient; the patient no longer appears in standard workflows.
- [ ] An inactive patient cannot be added to a new appointment.
- [ ] The dentist can reactivate a patient; the patient reappears in standard workflows.
- [ ] A receptionist cannot reactivate a patient.
