# DPMS — Dental Patient Management System
# User Guide

**Version:** 1.0  
**Audience:** Dentist & Receptionist Staff  
**System:** Cloud-based Dental Practice Management System

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - 1.1 [Logging In](#11-logging-in)
   - 1.2 [Navigation Overview](#12-navigation-overview)
   - 1.3 [Understanding Your Role](#13-understanding-your-role)
   - 1.4 [Logging Out](#14-logging-out)
2. [Dashboard](#2-dashboard)
   - 2.1 [KPI Cards](#21-kpi-cards)
   - 2.2 [Appointment Status Bar](#22-appointment-status-bar)
   - 2.3 [Today's Schedule Table](#23-todays-schedule-table)
   - 2.4 [Procedure Mix Panel](#24-procedure-mix-panel)
   - 2.5 [Live Activity Card](#25-live-activity-card)
   - 2.6 [Refreshing the Dashboard](#26-refreshing-the-dashboard)
   - 2.7 [Outstanding Balance Panel](#27-outstanding-balance-panel)
3. [Patient Management](#3-patient-management)
   - 3.1 [Viewing the Patient List](#31-viewing-the-patient-list)
   - 3.2 [Searching for a Patient](#32-searching-for-a-patient)
   - 3.3 [Registering a New Patient](#33-registering-a-new-patient)
   - 3.4 [Viewing a Patient Profile](#34-viewing-a-patient-profile)
   - 3.5 [Editing Patient Information](#35-editing-patient-information)
   - 3.6 [Deactivating a Patient](#36-deactivating-a-patient-dentist-only)
   - 3.7 [Reactivating a Patient](#37-reactivating-a-patient-dentist-only)
   - 3.8 [Recording a Payment](#38-recording-a-payment)
   - 3.9 [Viewing and Managing Payment History](#39-viewing-and-managing-payment-history)
4. [Appointments & Scheduling](#4-appointments--scheduling)
   - 4.1 [Calendar Views](#41-calendar-views)
   - 4.2 [Navigating the Calendar](#42-navigating-the-calendar)
   - 4.3 [Booking a New Appointment](#43-booking-a-new-appointment)
   - 4.4 [Viewing Appointment Details](#44-viewing-appointment-details)
   - 4.5 [Advancing Appointment Status](#45-advancing-appointment-status)
   - 4.6 [Cancelling an Appointment](#46-cancelling-an-appointment)
   - 4.7 [Editing an Appointment](#47-editing-an-appointment)
   - 4.8 [Reopening a Cancelled or No-Show Appointment](#48-reopening-a-cancelled-or-no-show-appointment)
5. [Clinical Charting](#5-clinical-charting)  *(Dentist only for write access)*
   - 5.1 [Opening the Clinical Chart](#51-opening-the-clinical-chart)
   - 5.2 [Writing a SOAP Note](#52-writing-a-soap-note)
   - 5.3 [Editing a SOAP Note](#53-editing-a-soap-note)
   - 5.4 [Deleting a SOAP Note](#54-deleting-a-soap-note)
   - 5.5 [Recording a Treatment / Procedure](#55-recording-a-treatment--procedure)
   - 5.6 [Editing a Treatment Record](#56-editing-a-treatment-record)
   - 5.7 [Viewing Clinical History on the Patient Profile](#57-viewing-clinical-history-on-the-patient-profile)
6. [Document Management](#6-document-management)
   - 6.1 [Uploading Documents](#61-uploading-documents)
   - 6.2 [Viewing and Previewing Documents](#62-viewing-and-previewing-documents)
   - 6.3 [Filtering Documents by Type](#63-filtering-documents-by-type)
   - 6.4 [Deleting a Document](#64-deleting-a-document-dentist-only)
7. [Settings](#7-settings)  *(Dentist only for editing)*
   - 7.1 [Clinic Information](#71-clinic-information)
   - 7.2 [Working Hours](#72-working-hours)
   - 7.3 [Managing the Procedure Catalog](#73-managing-the-procedure-catalog)
8. [Staff Management](#8-staff-management)  *(Dentist only)*
   - 8.1 [Viewing Staff Accounts](#81-viewing-staff-accounts)
   - 8.2 [Creating a New Staff Account](#82-creating-a-new-staff-account)
   - 8.3 [Resetting a Staff Member's Password](#83-resetting-a-staff-members-password)
   - 8.4 [Deactivating and Reactivating a Staff Account](#84-deactivating-and-reactivating-a-staff-account)
9. [Your Profile](#9-your-profile)
   - 9.1 [Updating Your Name and Email](#91-updating-your-name-and-email)
   - 9.2 [Changing Your Password](#92-changing-your-password)
10. [Role Permissions Quick Reference](#10-role-permissions-quick-reference)
11. [Common Error Messages](#11-common-error-messages)

---

## 1. Getting Started

### 1.1 Logging In

1. Open your web browser and navigate to the DPMS URL provided by your clinic administrator.
2. You will see the **Login** screen.
3. Enter your **Email address** and **Password** in the respective fields.
4. Click **Sign In**.

On successful login you are taken directly to the **Dashboard**.

**If login fails:**
- Double-check your email address for typos.
- Passwords are case-sensitive — ensure Caps Lock is off.
- If you have forgotten your password, click the **Forgot password?** link below the sign-in button. Enter your registered email address and click **Send reset link**. A password-reset link will be emailed to you (check your spam folder). The link expires in 1 hour and can only be used once.
- If your account has been deactivated, you will see "Account is inactive. Please contact your administrator." Contact your dentist to reactivate the account.

---

### 1.2 Navigation Overview

After login, the left-hand sidebar is your main navigation panel. It is always visible.

| Menu Item | Who Sees It | Destination |
|-----------|-------------|-------------|
| Dashboard | Everyone | Today's clinic summary |
| Patients | Everyone | Patient registry |
| Appointments | Everyone | Calendar and scheduling |
| Communications | Everyone | Message log *(coming soon)* |
| Reminders | Dentist only | Reminder configurations *(coming soon)* |
| Settings | Dentist only | Clinic config and procedure catalog |
| Staff | Dentist only | User account management |

At the very bottom of the sidebar you will find:
- **Your avatar** (initials) with your name and role — click it to go to your **Profile** page.
- **Sign Out** button.

---

### 1.3 Understanding Your Role

DPMS has two roles. Your role determines what you can do:

**Dentist** — Full access. Can read and write all records, manage users, write clinical notes, delete documents, and change settings.

**Receptionist** — Operational access. Can register patients, manage appointments, upload documents, and view clinical notes and settings, but cannot modify clinical records, settings, or user accounts.

Your current role is shown in the sidebar footer next to your name. When a feature is restricted to the dentist role, the relevant buttons simply do not appear in the interface for receptionists — you will not see them.

---

### 1.4 Logging Out

Click the **Sign Out** button at the bottom of the sidebar. You are returned to the Login screen immediately. All other open tabs with DPMS will also be logged out.

---

## 2. Dashboard

The Dashboard is the first screen you see after login. It shows a live summary of today's clinic activity. No data can be created or modified here — it is a read-only operational view.

---

### 2.1 KPI Cards

Five cards at the top of the dashboard display your key metrics for the current day:

**Today's Appointments**
- The total number of appointments scheduled for today.
- A small badge shows how many are **Confirmed**.

**Active Patients**
- The total count of all active patient records in the system.
- A badge shows how many new patients were registered this calendar month.

**Completed Today**
- The count of appointments that have reached **Completed** status today.
- A colour-coded badge shows the completion rate as a percentage:
  - Green: 75% or more completed
  - Amber: 40–74% completed
  - Gray: below 40%

**Billed Today**
- The sum of all completed treatment fee amounts logged by the dentist for today's date.
- This is a clinical fee tally drawn from treatment records — it represents what was charged, not necessarily what was collected.
- A note under the figure reads "Treatment fees" as a reminder.

**Collected Today**
- The sum of all payments recorded against today's date — the amount actually received from patients.
- A contextual badge shows the collection status:
  - **Fully settled** (green) — today's collected amount equals or exceeds today's billed amount
  - **Partial** (amber) — some amount was collected but less than what was billed
  - **None collected** (gray) — no payments have been recorded for today
- Use this alongside **Billed Today** to understand how much of today's revenue has been received.

---

### 2.2 Appointment Status Bar

Below the KPI cards is a horizontal bar of status pills showing how many appointments today are in each status:

| Pill | Meaning |
|------|---------|
| **Scheduled** (gray) | Booked but not yet confirmed by the patient |
| **Confirmed** (blue) | Patient has confirmed they are attending |
| **Checked In** (amber) | Patient has arrived at the clinic |
| **In Progress** (orange) | Dentist has started the appointment |
| **Completed** (green) | Treatment is finished |
| **Cancelled** (gray) | Appointment was cancelled |
| **No Show** (red) | Patient did not arrive |

---

### 2.3 Today's Schedule Table

A chronological list of today's appointments. Each row shows:
- **Patient name** and phone number
- **Time range** (e.g., 09:00 AM – 09:30 AM)
- **Appointment type** (e.g., Cleaning, Filling)
- **Status** with colour-coded badge

Click any row to open the full appointment detail page for that appointment.

If there are no appointments today, the table shows: *"No appointments scheduled for today."*

---

### 2.4 Procedure Mix Panel

A visual breakdown of today's appointment types showing:
- Each procedure type with a colour swatch
- The percentage of today's total that type represents
- The count for each type
- Total appointment count and number of distinct procedure types

This gives you a quick sense of the clinical workload composition.

---

### 2.5 Live Activity Card

A compact card showing real-time counts of appointments currently in active states:
- **Checked In** — patients waiting to be seen
- **In Progress** — appointments currently under treatment
- **Confirmed** — confirmed and expected later today
- **No Shows** — appointments where the patient did not attend

---

### 2.6 Refreshing the Dashboard

The dashboard automatically refreshes every **60 seconds** — you will see the data update without any action on your part.

To refresh immediately, click the **Refresh** button (circular arrow icon) in the top-right of the dashboard header.

---

### 2.7 Outstanding Balance Panel

Below the Live Activity card on the right sidebar is the **Outstanding Balance** panel. It shows the total unpaid balance across **all patients, all time** — not just today.

- When there are outstanding balances, the panel has a **red background** and shows the total amount owed with the message *"Unpaid balances across all patients"*.
- When all patient balances are fully settled, the panel turns **green** and shows *"All balances settled"*.

This gives the dentist an immediate end-of-day indicator of the clinic's overall payment health without navigating to individual patient records.

> **Note:** This figure reflects the difference between the sum of all completed treatment fees ever recorded and the sum of all payments ever received. It is not an accounting or invoicing system — it is a clinical fee tracker.

---

## 3. Patient Management

### 3.1 Viewing the Patient List

Click **Patients** in the sidebar to open the patient registry.

The list shows all active patients by default, with columns:
- **Name** — Full name. A red medical alert icon appears next to the name if medical notes are on file.
- **Phone** — Primary contact number
- **Email** — Email address (if provided)
- **Registered** — Date the patient was registered
- **Status** — Green "Active" or gray "Inactive" badge

**Sorting:** Click the **Name** or **Registered** column headers to toggle ascending/descending sort. Clicking the same header again reverses the order.

**Pagination:** The list shows 20 patients per page. Use the **Previous** and **Next** buttons at the bottom to move between pages. The current page and total pages are displayed (e.g., "Page 1 of 8").

**Showing inactive patients:** Tick the **Show inactive patients** checkbox in the toolbar to include deactivated patient records in the list. Inactive patients show a gray "Inactive" badge.

**Outstanding balance only:** Tick the **Outstanding balance only** checkbox to filter the list to only patients who have an unpaid balance — that is, patients where the sum of their completed treatment fees exceeds the sum of payments received from them. Use this at the end of the day to quickly identify which patients still owe money.

---

### 3.2 Searching for a Patient

There are two ways to find a patient:

**Quick Search (Autocomplete)**
1. Click the search bar at the top of the Patients page.
2. Start typing at least **2 characters** — this can be part of a first name, last name, phone number, or email address.
3. A dropdown list of up to 8 matching patients appears within a moment.
4. Click a patient from the dropdown to go directly to their profile.

**Full Search**
If no dropdown appears or you want to search the full list, pressing **Enter** after typing performs a full search and filters the table below.

If no patients match your search, the table shows: *"No patients found matching your search."*

---

### 3.3 Registering a New Patient

1. On the Patients page, click the **+ New Patient** button (top-right, blue).
2. A registration form dialog opens with four sections.

**Personal Details**
| Field | Required | Notes |
|-------|----------|-------|
| First Name | Yes | Maximum 100 characters |
| Last Name | Yes | Maximum 100 characters |
| Date of Birth | Yes | Must be a past date; today's date is not allowed |
| Gender | No | Male / Female / Other / Prefer not to say |

**Contact Details**
| Field | Required | Notes |
|-------|----------|-------|
| Phone Number | Yes | Must be unique — no two patients can share the same number |
| Email Address | No | If provided, must be a valid email format and unique |
| Address | No | Free text |

**Emergency Contact** *(all optional)*
| Field | Notes |
|-------|-------|
| Name | Emergency contact person's full name |
| Phone | Their phone number |
| Relationship | Their relationship to the patient (e.g., Spouse, Parent) |

**Medical Notes / Alerts** *(optional)*
- A free-text field for allergies, current medications, systemic conditions, and clinical alerts (e.g., blood thinners, diabetes, heart conditions).
- Maximum 5,000 characters.
- If populated, a red **Medical Alert** badge appears prominently on the patient's profile to ensure clinical staff see it before treatment.

3. Click **Save Patient** to create the record.

**If registration succeeds:** A success screen appears with the patient's name and two action buttons:
- **View Patient Profile** — Goes to the new patient's profile page.
- **Book Appointment** — Opens the appointment booking dialog with this patient pre-selected (available if a dentist account exists in the system).

**Common errors:**
- *"A patient with this phone number already exists"* — A record (active or inactive) already uses that number. Search for the patient and view or reactivate their record instead.
- *"Date of birth cannot be today or in the future"* — Correct the date of birth field.
- *"Last name is required"* — Both first and last name are mandatory.

---

### 3.4 Viewing a Patient Profile

Click any patient row in the list (or select a patient from the search autocomplete) to open their profile.

The profile page is organised as follows:

**Header**
- Full name, registration status badge
- **Medical Alert** badge (red) — visible if medical notes exist
- Date of birth, gender, registration date
- **Edit** button (pencil icon) — opens the edit form
- **Deactivate** button — dentist only

**Medical Alert Box**
If the patient has medical notes, they are displayed in a prominent amber box at the top of the page. Always read this before beginning treatment.

**Stats Cards**
Six summary numbers displayed across the top of the profile:

| Card | What it shows |
|------|--------------|
| **Appointments** | Total number of appointments on record |
| **Treatments** | Total number of treatment procedures recorded |
| **Total Billed** | Sum of all completed treatment fees |
| **Total Paid** | Sum of all payments received from this patient (shown in green) |
| **Outstanding** | Difference between Total Billed and Total Paid. Shown in **red** with a red-tinted card when there is an unpaid balance; green when fully settled. |
| **Last Visit** | Date of the most recent completed appointment, or "No visits" if new |

**Contact & Emergency Info**
Two side-by-side cards showing all contact details and emergency contact information. If a field was left blank during registration, it is simply absent.

**History Tabs**
Six tabs provide access to the patient's full clinical history:

| Tab | Contents |
|-----|----------|
| **Appointments** | All appointments, newest first. Click any to open the appointment detail. |
| **Treatments** | All procedure records. Filter by status (All / Planned / In Progress / Completed). |
| **Clinical Notes** | All SOAP notes, newest first, as expandable cards. |
| **Documents** | All uploaded files with a type filter. Upload new documents here. |
| **Payments** | Full payment history with running totals. Record new payments here. |
| **Communications** | *(Coming soon — placeholder)* |

---

### 3.5 Editing Patient Information

1. On the patient profile, click the **Edit** button (pencil icon) in the header.
2. The same registration form opens, pre-filled with the patient's current details.
3. Update any fields as needed.
4. Click **Save Changes**.

All changes are saved immediately and the profile refreshes. The **Last Updated** timestamp is updated automatically.

Note: Changing a patient's phone number to one that belongs to another patient (active or inactive) will be rejected.

---

### 3.6 Deactivating a Patient *(Dentist only)*

Deactivating a patient marks their record as inactive. An inactive patient:
- Does not appear in standard search results or the patient list (unless you check "Show inactive patients").
- Cannot be booked for new appointments.
- Retains all historical data (appointments, clinical notes, treatments, documents) — nothing is deleted.

**Steps:**
1. Open the patient's profile.
2. Click the **Deactivate** button in the header.
3. A confirmation dialog appears: *"Are you sure you want to deactivate this patient?"*
4. Click **Deactivate Patient** to confirm.

The profile immediately shows an "Inactive" badge in the header.

---

### 3.7 Reactivating a Patient *(Dentist only)*

1. On the Patients list, tick **Show inactive patients** to reveal the deactivated record.
2. Click the patient row to open their profile.
3. Click the **Reactivate** button in the header (the button label changes when the patient is inactive).
4. Confirm the action in the dialog.

The patient returns to active status and appears again in standard searches and booking flows.

---

### 3.8 Recording a Payment

Payments can be recorded by both dentists and receptionists.

1. Open the patient's profile.
2. Click the **Payments** tab.
3. Click the **Record Payment** button (top-right of the tab).
4. Fill in the payment form:

| Field | Required | Notes |
|-------|----------|-------|
| Amount | Yes | Must be greater than $0. Enter the amount received. |
| Date | Yes | Defaults to today. Cannot be a future date. |
| Payment Method | Yes | Cash, Card, Bank Transfer, Insurance, or Other |
| Notes | No | Optional description (e.g., "Part payment for crown — balance next visit"). Maximum 500 characters. |

5. Click **Record Payment**.

The payment appears immediately in the Payments tab list and the **Total Paid** and **Outstanding** stat cards at the top of the profile update automatically.

**Common errors:**
- *"Amount must be greater than 0"* — Enter a positive value.
- *"Payment date cannot be in the future"* — Use today's date or a past date.

---

### 3.9 Viewing and Managing Payment History

Open the patient's profile and click the **Payments** tab.

Each entry in the payment list shows:
- Amount (in green)
- Payment method badge (e.g., Cash, Card)
- Payment date
- Name of the staff member who recorded the payment
- Notes (if any)

Payments are listed in reverse chronological order (most recent first).

**Deleting a payment** *(Dentist only)*
If a payment was entered in error, the dentist can delete it:

1. Locate the payment in the list.
2. Click the **trash icon** on the right side of the payment row.
3. A confirmation prompt appears: *"Delete this payment record? This cannot be undone."*
4. Click **OK** to confirm.

The payment is removed and the **Total Paid** and **Outstanding** stat cards update immediately.

> **Receptionists do not see the delete button.** If a payment needs to be corrected, ask the dentist to delete the incorrect entry and then record the correct amount.

---

## 4. Appointments & Scheduling

### 4.1 Calendar Views

Click **Appointments** in the sidebar. You will see the appointment calendar with two view modes:

**Day View**
Shows a vertical timeline for a single day. Each appointment appears as a coloured block at the appropriate time slot. The block shows the patient's name, appointment type, and duration. This is the primary working view for day-to-day scheduling.

**Week View**
Shows a seven-column grid covering one full week (Monday to Sunday). Each day shows the count of appointments booked. Click any day cell to switch to Day View for that specific date. Use the Week View to check availability across the coming days.

Switch between views using the **Day** and **Week** tab buttons at the top of the calendar.

---

### 4.2 Navigating the Calendar

- **< Previous** / **Next >** buttons — Move one day backward or forward (Day View), or one week (Week View).
- **Today** button — Jumps immediately back to the current date.
- The current date or week range is shown as a heading above the calendar (e.g., "Sunday, 31 May 2026" in Day View, or "May 25 – May 31, 2026" in Week View).

The Day View also shows a **Daily Summary Bar** — a strip of coloured status pills showing how many appointments are in each status for the selected day. This gives you an instant read on the day's progress without scrolling.

---

### 4.3 Booking a New Appointment

There are three ways to open the booking form:

1. Click the **+ New Appointment** button in the top-right of the Appointments page.
2. Click an **empty time slot** on the Day View calendar — the slot's time is pre-filled automatically.
3. From the new-patient success screen, click **Book Appointment**.

**Booking form fields:**

**Patient** *(required)*
- Type at least 2 characters in the patient search box.
- A dropdown lists matching patients by name and phone number.
- Click the patient you want to book. Their name appears as a chip. To change the patient, click the X to clear and search again.
- Only active patients can be booked.

**Date** *(required)*
- Use the date picker to select the appointment date.
- Dates in the past cannot be selected.
- If you opened the form by clicking a slot, the date is pre-filled.

**Appointment Type** *(required)*
- Select from the dropdown: Checkup, Cleaning, Filling, Extraction, Root Canal, Consultation, or other types configured for your clinic.

**Available Slots**
Once you have selected a date, the system fetches all open time slots based on the clinic's working hours and existing bookings. Click any slot chip (e.g., "09:00 AM – 09:30 AM") to pre-fill the start and end times below.

If the slot picker shows *"No standard slots available — set times manually below"*, all pre-defined slots for that day are taken. You can still enter times manually in the time fields below.

**Start Time** *(required)*
Use the time picker: select the Hour (1–12), Minutes (in 5-minute steps), and AM/PM.

**End Time** *(required)*
Same time picker. End time must be after start time.

**Notes** *(optional)*
Free-text notes for the receptionist or dentist, such as the reason for visit, patient requests, or preparation instructions.

Click **Book Appointment** to save. If the selected time overlaps an existing appointment, a conflict error appears: *"Conflict: [Patient Name] is already booked from [time] to [time]. Please choose another slot."* Select a different time and try again.

On success, the new appointment block appears immediately on the calendar.

---

### 4.4 Viewing Appointment Details

Click any appointment block on the calendar, or click any appointment row in the Dashboard's Today's Schedule table. This opens the appointment detail page showing:

- Patient name (clicking opens the patient profile)
- Date and time range
- Current status badge
- Appointment type and any notes
- A **Patient card** with the patient's name and phone
- The **Status Workflow Panel** with action buttons for the current status (see Section 4.5)
- An **Open Chart** button to go to the clinical charting workspace

---

### 4.5 Advancing Appointment Status

Appointments move through a defined sequence of statuses. Use the action buttons in the **Status Workflow Panel** on the appointment detail page.

**Status flow and available actions:**

| Current Status | Available Actions |
|----------------|-------------------|
| **Scheduled** | Confirm Appointment → moves to *Confirmed*; Cancel |
| **Confirmed** | Check In Patient → moves to *Checked In*; Mark No Show → moves to *No Show*; Cancel |
| **Checked In** | Start Treatment → moves to *In Progress*; Cancel |
| **In Progress** | Complete Appointment → moves to *Completed* |
| **Completed** | No further actions — this is a terminal state |
| **Cancelled** | Reopen & Reschedule → moves back to *Scheduled* |
| **No Show** | Reopen & Reschedule → moves back to *Scheduled* |

**Step-by-step morning workflow (typical day):**
1. When a patient calls to confirm, open the appointment → click **Confirm Appointment**.
2. When the patient walks in, click **Check In Patient**.
3. When the dentist starts the session, click **Start Treatment**.
4. When the session ends, click **Complete Appointment**.

Attempting to skip steps (e.g., going directly from Scheduled to Completed) is blocked by the system with a clear explanation.

**Cancellation** requires a reason — see Section 4.6.

---

### 4.6 Cancelling an Appointment

1. Open the appointment detail page.
2. Click the **Cancel** button (available from Scheduled, Confirmed, and Checked In statuses).
3. A dialog appears with a required text field: *"Cancellation reason"*.
4. Enter the reason (e.g., "Patient called to cancel", "Dentist sick leave", "Emergency").
5. Click **Cancel Appointment** to confirm.

The appointment status changes to **Cancelled**. The record remains visible in history with the reason recorded. The time slot is freed for re-booking.

You cannot cancel a **Completed** appointment.

---

### 4.7 Editing an Appointment

Appointments that have not yet been completed or cancelled can be edited.

1. Open the appointment detail page.
2. Click the **Edit** button (pencil icon) in the Details section.
3. Update any of the following:
   - Date
   - Appointment type
   - Start time
   - End time
   - Notes
4. Click **Save Changes**. The system runs the same conflict check as a new booking — if the updated time overlaps another appointment, an error is shown and you must choose a different time.
5. To discard your edits, click **Discard**.

---

### 4.8 Reopening a Cancelled or No-Show Appointment

A patient who missed their appointment or whose appointment was cancelled can have their appointment reopened:

1. Open the cancelled or no-show appointment.
2. Click **Reopen & Reschedule**.
3. The appointment status reverts to **Scheduled**.
4. Edit the appointment (see Section 4.7) to set a new date and time, then save.

---

## 5. Clinical Charting

Clinical charting is where the dentist documents the clinical encounter. **Receptionists can view charts but cannot create, edit, or delete any clinical records.**

---

### 5.1 Opening the Clinical Chart

The clinical chart workspace is linked to a specific appointment. To open it:

1. Open the appointment detail page (from the calendar or dashboard).
2. Click the **Open Chart** button.

The chart page shows:
- A header with the patient's name, appointment date, time, and type.
- The **SOAP Note** section.
- The **Treatments & Procedures** section.

---

### 5.2 Writing a SOAP Note *(Dentist only)*

SOAP is the standard clinical documentation framework. Each letter represents a section of the note:

| Letter | Name | What to Write |
|--------|------|---------------|
| **S** | Subjective | The patient's complaint in their own words — symptoms, pain level, duration, what they report feeling. *Example: "Patient reports sensitivity to cold in the lower left area for two weeks."* |
| **O** | Objective | Your clinical findings from examination — what you observe, measure, or see on radiographs. *Example: "Clinical examination reveals occlusal caries on tooth 36. Periapical radiograph shows caries approximating the dentin."* |
| **A** | Assessment | Your diagnosis and professional judgment. *Example: "Dental caries on tooth 36 requiring composite restoration."* |
| **P** | Plan | What was done today and what is planned for follow-up. *Example: "Composite restoration tooth 36 today. Review sensitivity at next appointment."* |

**To write a new SOAP note:**
1. In the SOAP Note section, all four text fields are visible.
2. Click into the **Subjective** field and type your notes. A character counter at the bottom-right of each field shows your usage (e.g., "120 / 5,000"). When you are close to the 5,000-character limit the counter turns amber.
3. Complete all four fields. Each field requires a minimum of 10 characters — the note cannot be saved if any field is left blank or too short.
4. Click **Save SOAP Note**.

The note is saved with your name and the current timestamp.

---

### 5.3 Editing a SOAP Note *(Dentist only)*

1. In the SOAP Note section, click the **Edit** button (pencil icon).
2. The fields become editable with your current content pre-filled.
3. Make your changes.
4. Click **Update Note**. The note is saved with an `updated_at` timestamp — the original creation date is preserved.
5. To discard, click **Cancel**.

---

### 5.4 Deleting a SOAP Note *(Dentist only)*

1. In the SOAP Note section, click the **Delete** button (trash icon).
2. A confirmation dialog appears: *"Are you sure you want to delete this clinical note? This cannot be undone."*
3. Click **Delete** to permanently remove the note. This action cannot be reversed.

---

### 5.5 Recording a Treatment / Procedure *(Dentist only)*

Multiple procedures can be recorded for a single appointment.

1. In the **Treatments & Procedures** section, click **+ Add**.
2. Fill in the treatment form:

**Tooth Number** *(required)*
Enter the tooth number using **FDI notation**:
- Quadrant 1 (upper right): 11, 12, 13, 14, 15, 16, 17, 18
- Quadrant 2 (upper left): 21, 22, 23, 24, 25, 26, 27, 28
- Quadrant 3 (lower left): 31, 32, 33, 34, 35, 36, 37, 38
- Quadrant 4 (lower right): 41, 42, 43, 44, 45, 46, 47, 48
- For procedures not tied to a specific tooth (e.g., full-mouth examination, consultation): type `general`

**Status** *(required)*
- **Planned** — Procedure is planned for a future visit.
- **In Progress** — Procedure is underway across multiple visits.
- **Completed** — Procedure was finished today.

**Procedure Name** *(required)*
The name of the procedure performed (e.g., "Composite Filling", "Scaling and Root Planing", "Extraction"). Maximum 200 characters.

**Procedure Code** *(optional)*
A standard procedure code if your clinic uses them (e.g., ADA D-code such as "D2391"). Maximum 20 characters.

**Amount (INR)** *(optional)*
The fee charged for this procedure. Must be zero or a positive number. If left blank, no fee is recorded for this treatment.

**Date Performed** *(required)*
The date the procedure was carried out. Cannot be a future date.

**Description** *(optional)*
Free-text details about the procedure: materials used, technique, observations (e.g., "Occlusal composite, shade A2, rubber dam isolation used"). Maximum 1,000 characters.

3. Click **Save Treatment**.

The treatment record appears in the list below with the tooth number badge, status, amount, and date.

Repeat for each additional procedure performed in the same appointment.

---

### 5.6 Editing a Treatment Record *(Dentist only)*

1. Find the treatment in the list and click its **Edit** button (pencil icon).
2. The treatment form opens pre-filled.
3. Make your changes.
4. Click **Save Treatment**.

This is commonly used to update a treatment from **Planned** to **In Progress** or **Completed** at a subsequent visit.

---

### 5.7 Viewing Clinical History on the Patient Profile

All SOAP notes and treatments are accessible from the patient's profile (not just from individual appointment chart pages).

**Clinical Notes tab:**
Shows all SOAP notes for the patient in reverse chronological order (newest first). Each note is displayed as a collapsible card — click it to expand and read the full Subjective, Objective, Assessment, and Plan text. A link at the bottom of each card opens the original appointment chart.

**Treatments tab:**
Shows all treatment records across all appointments. Use the status filter buttons (All / Planned / In Progress / Completed) to narrow the list. Each entry shows the tooth number, procedure name, status, amount, and date.

---

## 6. Document Management

### 6.1 Uploading Documents

Documents are uploaded from the patient profile.

1. Open the patient profile and click the **Documents** tab.
2. Click the **Upload** button (top-right of the Documents tab).
3. The upload dialog opens.

**Adding files:**
- Drag and drop files onto the grey drop zone, or click the drop zone to open a file picker.
- Accepted file types: **JPEG, PNG, PDF, DICOM (.dcm)**
- Maximum size: **50 MB per file**
- You can add multiple files to the queue before uploading.
- Files in the queue appear as a list. Click the X next to a file to remove it before uploading.

**Document Type** *(required)*
Select the type that best describes the document:

| Type | Use for |
|------|---------|
| X-Ray / Radiograph | Bitewing, periapical, panoramic, CBCT scans |
| Clinical Photo | Intraoral or extraoral photographs |
| Consent Form | Signed patient consent for procedures |
| Prescription | Prescriptions issued to the patient |
| Lab Report | Reports from dental laboratories |
| Other | Any other clinical or administrative file |

**Notes** *(optional)*
Add a brief description to help identify the file later (e.g., "Right bitewing, pre-treatment 2026-05-31", "Consent for tooth 46 extraction"). Maximum 500 characters.

4. Click **Upload**. Each file in the queue is uploaded in sequence with a progress bar.
5. When all uploads are complete, the dialog closes and the new documents appear in the Documents tab.

**If upload fails:**
- Files with disallowed types are rejected with: *"File type not supported. Accepted types: JPEG, PNG, PDF, DICOM."*
- Files over 50 MB are rejected with: *"File exceeds the 50 MB size limit."*
- A network error shows an error message on the affected file row. Remove it and try again.

---

### 6.2 Viewing and Previewing Documents

In the **Documents** tab on the patient profile, each document card shows:
- Document type badge
- Original file name
- Upload date
- Uploader's name
- Notes (if any)

**To preview an image (JPEG or PNG):**
Click the document card. A viewer modal opens displaying the full image in the browser. Use the **Download** button in the viewer to save the file.

**To view a PDF:**
Click the document card. The PDF opens in a viewer — either within the modal or in a browser PDF viewer, depending on your browser settings.

**DICOM files:**
DICOM radiographs are stored and downloadable. They may not display inline in all browsers. Click the document card and use the **Download** button.

---

### 6.3 Filtering Documents by Type

In the Documents tab, a type filter dropdown allows you to show only documents of a specific type:
- All (default)
- X-Ray / Radiograph
- Clinical Photo
- Consent Form
- Prescription
- Lab Report
- Other

Select a type from the dropdown to filter. Select "All" to see the full list again.

---

### 6.4 Deleting a Document *(Dentist only)*

1. In the **Documents** tab, locate the document card.
2. Click the **Delete** button (trash icon) on the card.
3. A confirmation dialog appears. Deletion is permanent and cannot be undone.
4. Click **Delete** to confirm.

The document is removed from storage and no longer appears in the patient's library. Deletion is logged internally for audit purposes.

**Receptionists do not see the Delete button.**

---

## 7. Settings

The Settings page is accessible from the sidebar (dentist only sees it; receptionists can view but not edit). It has two tabs: **Clinic Information** and **Procedures**.

---

### 7.1 Clinic Information

Click **Settings** in the sidebar, then select the **Clinic Information** tab.

**Clinic Details**
| Field | Required | Purpose |
|-------|----------|---------|
| Clinic Name | Yes | Appears in automated reminder messages and on-screen |
| Phone | No | Clinic contact number |
| Email | No | Clinic email address |
| Address | No | Physical clinic address |

**Schedule Settings**
| Field | Options | Purpose |
|-------|---------|---------|
| Timezone | 17 timezone options (US, Europe, Asia, Australia) | Ensures appointment times display correctly |
| Appointment Slot Duration | 15 / 20 / 30 / 45 / 60 minutes | The interval used when showing available slots in the booking form |

After making changes, click **Save Settings** (visible only to the dentist). A green success message confirms the save.

**Note for receptionists:** You can view these settings but a notice reads *"Only the dentist can modify clinic settings."* No save button is shown.

---

### 7.2 Working Hours

Within the Clinic Information tab, the **Working Hours** section lets the dentist configure when the clinic is open each day of the week.

For each day (Monday through Sunday):
- **Toggle** — Click to mark the day as Open or Closed.
  - When toggled **Open**: Two time dropdowns appear — **Opening Time** and **Closing Time**. Times range from 6:00 AM to 10:30 PM in 30-minute intervals.
  - When toggled **Closed**: The row shows "Closed" and no time selection is needed.

**Example setup:** If the clinic is open Monday–Friday 9:00 AM to 5:00 PM, and Friday closes at 2:00 PM, and is closed on weekends:
- Monday–Thursday: Open, 9:00 AM to 5:00 PM
- Friday: Open, 9:00 AM to 2:00 PM
- Saturday–Sunday: Closed

These working hours directly control which time slots are offered in the appointment booking dialog and restrict bookings from being made outside operating hours.

Click **Save Settings** after configuring working hours.

---

### 7.3 Managing the Procedure Catalog

Click **Settings** in the sidebar, then select the **Procedures** tab.

The procedure catalog is the list of procedures available for selection when recording a treatment in the clinical chart.

**Viewing procedures:**
All procedures are listed in a table with:
- Name, Code, Category, Default Fee (₹), Duration (minutes), Status (Active/Inactive)

**Adding a new procedure** *(Dentist only):*
1. Click **+ Add Procedure**.
2. Fill in the dialog:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | e.g., "Composite Filling - Posterior" |
| Code | No | e.g., "D2391" |
| Category | No | e.g., "Restorative", "Preventive", "Surgical" |
| Default Fee (₹) | No | Pre-filled when selected in treatment recording |
| Duration (min) | No | Reference for scheduling; does not auto-fill appointment duration |

3. Click **Save Procedure**.

**Editing a procedure** *(Dentist only):*
1. Click the **Edit** button (pencil icon) on the procedure row.
2. Update the fields as needed.
3. Use the **Active** toggle to deactivate a procedure (making it unavailable for selection) without deleting it.
4. Click **Save Procedure**.

---

## 8. Staff Management

*(Dentist only — Receptionists do not see this section in the sidebar.)*

### 8.1 Viewing Staff Accounts

Click **Staff** in the sidebar (icon looks like a person with a settings badge).

The staff list shows all user accounts with:
- Full name (accounts belonging to the currently logged-in user show a "(you)" label)
- Email address
- Role badge: **Dentist** (blue) or **Receptionist** (purple)
- Status badge: **Active** (green) or **Inactive** (red)
- Action buttons: Key icon (reset password) and Deactivate/Reactivate

---

### 8.2 Creating a New Staff Account

1. Click **+ New account** (top-right of the Staff page).
2. Fill in the dialog:

| Field | Required | Notes |
|-------|----------|-------|
| Full Name | Yes | The person's full name |
| Email | Yes | Must be unique; this is their login email |
| Password | Yes | Minimum 8 characters; share this with the new staff member securely |
| Role | Yes | **Receptionist** or **Dentist** |

3. Click **Create account**.

The new account appears in the list immediately. The new staff member can log in with the email and password you set. Ask them to change their password after first login via their Profile page.

**Note:** You cannot share an email address between two accounts — the system will reject it.

---

### 8.3 Resetting a Staff Member's Password

If a staff member is locked out or has forgotten their password, the dentist can set a new password directly:

1. On the Staff page, click the **Key** icon next to the staff member's row.
2. Enter a **New password** (minimum 8 characters) and confirm it in the second field.
3. Click **Reset password**.

The staff member can now log in with the new password. Their existing session (if any) remains valid until it expires naturally.

**Staff members can also reset their own password** via the **Forgot password?** link on the Login page if they have access to their registered email, or via their Profile page (Change Password section) if they are logged in.

---

### 8.4 Deactivating and Reactivating a Staff Account

**Deactivating:**
1. Click the **Deactivate** button next to the staff member's row.
2. Their account is immediately deactivated — they cannot log in.
3. Their historical records (appointments created, notes written) are preserved.

**Restrictions:**
- You cannot deactivate your own account.
- The system protects against deactivating the last active dentist account — at least one dentist must always remain active.

**Reactivating:**
Click the **Reactivate** button on the inactive staff member's row. Their account is restored immediately and they can log in again.

---

## 9. Your Profile

Both dentists and receptionists can manage their own profile from the Profile page. Click your **name/avatar** at the bottom of the sidebar to open it.

---

### 9.1 Updating Your Name and Email

1. On the Profile page, the **Personal Information** section shows your current name and email.
2. Click into the **Full name** field and type your updated name.
3. Click into the **Email address** field and type your new email.
4. Click **Save changes**.

Your role (Dentist or Receptionist) is displayed here for reference — it cannot be changed from this page. Contact the dentist to change your role.

---

### 9.2 Changing Your Password

1. On the Profile page, scroll to the **Change password** section.
2. Enter your **Current password**.
3. Enter your **New password** (minimum 8 characters).
4. Re-enter it in the **Confirm new password** field.
5. Click **Update password**.

**Rules:**
- Your new password must not be the same as your current password.
- The two "new password" fields must match.

If you have forgotten your current password and cannot log in, use the **Forgot password?** link on the Login page, or ask the dentist to reset your password from the Staff management page.

---

## 10. Role Permissions Quick Reference

| Feature | Dentist | Receptionist |
|---------|:-------:|:------------:|
| View Dashboard | ✓ | ✓ |
| View Patient List | ✓ | ✓ |
| Register New Patient | ✓ | ✓ |
| Edit Patient Details | ✓ | ✓ |
| Deactivate Patient | ✓ | — |
| Reactivate Patient | ✓ | — |
| View Appointments (Calendar) | ✓ | ✓ |
| Book New Appointment | ✓ | ✓ |
| Edit Appointment Details | ✓ | ✓ |
| Advance Appointment Status | ✓ | ✓ |
| Cancel Appointment | ✓ | ✓ |
| View Clinical Chart | ✓ | ✓ (read-only) |
| Write SOAP Note | ✓ | — |
| Edit SOAP Note | ✓ | — |
| Delete SOAP Note | ✓ | — |
| Record Treatment / Procedure | ✓ | — |
| Edit Treatment Record | ✓ | — |
| Delete Treatment Record | ✓ | — |
| Upload Documents | ✓ | ✓ |
| View / Preview Documents | ✓ | ✓ |
| Delete Documents | ✓ | — |
| View Payment History | ✓ | ✓ |
| Record a Payment | ✓ | ✓ |
| Delete a Payment | ✓ | — |
| View Settings (read-only) | ✓ | ✓ |
| Edit Clinic Settings | ✓ | — |
| Manage Working Hours | ✓ | — |
| View Procedure Catalog | ✓ | ✓ |
| Add / Edit Procedures | ✓ | — |
| View Staff Accounts | ✓ | — |
| Create Staff Account | ✓ | — |
| Reset Staff Password | ✓ | — |
| Deactivate / Reactivate Staff | ✓ | — |
| Edit Own Profile | ✓ | ✓ |
| Change Own Password | ✓ | ✓ |

---

## 11. Common Error Messages

| Message | Cause | What to Do |
|---------|-------|------------|
| *"Invalid email or password"* | Wrong credentials at login | Check email and password; use Forgot Password if needed |
| *"Account is inactive"* | Account has been deactivated | Contact the dentist to reactivate your account |
| *"A patient with this phone number already exists"* | Another patient (active or inactive) uses that phone number | Search for the existing patient and update or reactivate them |
| *"Date of birth cannot be today or in the future"* | Invalid DOB entry | Enter a past date |
| *"Conflict: [Patient] is already booked from [time] to [time]"* | Double-booking attempt | Choose a different time slot |
| *"End time must be after start time"* | Invalid appointment times | Set end time after start time |
| *"This patient record is inactive"* | Attempting to book an inactive patient | Reactivate the patient first (dentist only) |
| *"Cannot transition from '[status]' to '[status]'"* | Invalid status jump | Follow the correct status sequence (see Section 4.5) |
| *"You do not have permission to perform this action"* | Receptionist attempting a dentist-only action | Contact your dentist |
| *"Subjective field is required (minimum 10 characters)"* | SOAP note field too short | Expand the field with more clinical detail |
| *"Invalid tooth number"* | FDI notation error | Use 11–18, 21–28, 31–38, or 41–48, or type "general" |
| *"File type not supported"* | Unsupported file format uploaded | Convert to or upload a JPEG, PNG, PDF, or DICOM file |
| *"File exceeds the 50 MB size limit"* | File too large | Compress or reduce the image resolution before uploading |
| *"This reset link has already been used or has expired"* | Password reset link clicked twice or expired | Request a new reset link from the Forgot Password page |
| *"An account with this email already exists"* | Duplicate email when creating a staff account | Use a different email address for the new account |
| *"SMS messages cannot exceed 160 characters"* | Manual SMS too long | Shorten the message |
| *"Amount must be greater than 0"* | Payment amount of zero or negative entered | Enter a positive payment amount |
| *"Payment date cannot be in the future"* | A future date was entered on the payment form | Use today's date or a past date |

---

*This guide covers all features available in DPMS version 1.0. The Communications and Reminders modules are currently in development and will be documented in a future revision of this guide.*
