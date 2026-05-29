# Feature Spec: Scheduling

**Document Version:** 1.0
**Feature:** Scheduling (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

For a single-dentist practice seeing 15–20 patients per day, the appointment schedule is the heartbeat of the clinic. When scheduling breaks down — double-bookings, no-shows with no record, uncancelled slots sitting empty — the practice loses revenue and patients lose trust.

The typical pain points in practices without a proper scheduling system are well-documented: a receptionist writes an appointment in a paper diary, another staff member books the same slot over the phone without checking, and the patient who shows up finds the dentist already treating someone else. Alternatively, a patient cancels the morning of their appointment with no record kept, the slot goes to waste, and the clinic has no way to track how frequently this happens.

Beyond booking, the clinical workflow requires the appointment to move through a sequence of states — from booked, to confirmed, to the patient arriving, to treatment starting, to treatment completing. Without a structured status system, neither the receptionist at the front desk nor the dentist in the chair has a reliable live view of where the day stands.

This feature replaces paper diaries and ad-hoc spreadsheets with a structured, double-booking-proof scheduling system that reflects the real-time status of every appointment in the clinic.

---

## 2. Functional Requirements

### 2.1 Calendar View

- The schedule is presented as a visual calendar with two view modes:
  - **Day View:** Shows all appointments for a single day as time blocks on a vertical timeline, from the clinic's opening time to closing time.
  - **Week View:** Shows all appointments across 5–7 days in a grid, allowing staff to see upcoming availability at a glance.
- Each appointment block displays the patient's name, appointment type, and current status.
- Staff can navigate forward and backward through days and weeks.

### 2.2 Creating an Appointment

- A new appointment can be created by clicking on any open time slot in the calendar.
- The booking form requires:
  - Patient (selected from the existing patient database)
  - Appointment type (e.g., consultation, cleaning, filling, extraction, root canal — from a configurable list)
  - Date and time
  - Duration (end time)
  - Optional notes (reason for visit, patient requests, etc.)
- Before saving, the system checks for conflicts: if the dentist already has an appointment in the selected time window, the booking is blocked.

### 2.3 Appointment Status Workflow

Every appointment progresses through a defined sequence of statuses. Staff advance the status manually at the appropriate moment.

| Status | Meaning | Who Changes It |
|---|---|---|
| `Scheduled` | Appointment has been booked | Set automatically on creation |
| `Confirmed` | Patient has confirmed they are attending | Receptionist (after reminder call or SMS reply) |
| `Checked In` | Patient has arrived at the clinic | Receptionist (when patient walks in) |
| `In Progress` | Dentist has started the appointment | Dentist (when entering the treatment room) |
| `Completed` | Treatment is finished | Dentist (at end of appointment) |
| `Cancelled` | Appointment was cancelled | Either role (requires a reason) |
| `No Show` | Patient did not arrive | Receptionist (at end of the appointment window) |

Statuses can only move forward through this sequence. The system prevents illogical transitions (e.g., moving directly from "Scheduled" to "Completed" without checking in first). Cancelled and No Show appointments can be reopened and rescheduled.

### 2.4 Cancelling an Appointment

- Either role can cancel an appointment.
- A cancellation **requires a reason** to be entered (e.g., "Patient called to cancel", "Dentist sick leave", "Emergency").
- Cancelled appointments remain visible in the record with their reason and are not deleted.

### 2.5 Editing an Appointment

- Date, time, appointment type, and notes can be updated on any appointment that has not yet reached "Completed" or "Cancelled" status.
- Rescheduling triggers the same conflict-check as a new booking.

### 2.6 Conflict Prevention (Double-Booking Guard)

- The system prevents two appointments from being booked in overlapping time windows for the same dentist.
- When a conflict is detected, the system shows the details of the existing appointment that would be overlapped, so the receptionist can choose an alternative slot.

### 2.7 Available Slot Lookup

- Staff can query the system for all open (unbooked) time slots on a given date, making it easy to find the next available opening for a patient without manually scanning the calendar.

---

## 3. Input / Output Behaviour

### Booking an Appointment

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| Patient selection | Must be an active patient | Patient name and phone pre-filled on the form | "This patient record is inactive" |
| Appointment date | Must not be in the past | Date accepted | "Appointment date cannot be in the past" |
| Start and end time | Must fall within clinic working hours; must not overlap an existing appointment | Appointment created, appears on calendar | "Time slot conflict. The dentist has an existing appointment from [time] to [time]." |
| Appointment type | Must be selected from the configured list | Saved to record | "Please select an appointment type" |

### Advancing Appointment Status

| Current Status | Action | Next Status | Blocked Transition Example |
|---|---|---|---|
| Scheduled | Confirm | Confirmed | Cannot jump directly to In Progress |
| Confirmed | Mark as Arrived | Checked In | Cannot jump to Completed |
| Checked In | Start Treatment | In Progress | Cannot go back to Scheduled |
| In Progress | Finish | Completed | Terminal — no further changes |
| Any non-terminal | Cancel (with reason) | Cancelled | — |
| Confirmed | No Show | No Show | — |

### Day View Output

The day view returns all appointments for the selected date, each showing:
- Patient name and phone
- Appointment type
- Start and end time
- Current status (colour-coded)
- A summary bar at the top: total scheduled, confirmed, checked in, in progress, completed, cancelled, no-shows

---

## 4. Constraints

- An appointment cannot be booked in the past.
- An appointment cannot be booked outside the clinic's configured working hours (e.g., before 09:00 or after 17:00).
- The end time of an appointment must be after the start time — zero-duration or negative-duration bookings are not permitted.
- Only active patients can be booked for appointments.
- An appointment's status cannot be moved backwards (e.g., from "Completed" back to "In Progress").
- A cancellation reason is **mandatory** — a cancellation cannot be saved without entering a reason.
- The calendar view only shows the single dentist's schedule (there is no multi-provider view in MVP, as the practice has one dentist).
- Recurring appointments (e.g., "every 6 months") are **out of scope for MVP** — each visit must be booked individually.
- The system does not enforce a specific appointment duration per type in MVP; the receptionist sets the end time manually.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| Receptionist attempts to book an appointment that overlaps an existing one by even one minute | Booking is blocked. System shows: "Conflict: [Patient Name] is already booked from [start time] to [end time]. Please choose another slot." |
| Patient cancels on the same day | Appointment is cancelled with reason recorded. The slot appears as free on the calendar and can be offered to another patient. |
| Dentist is sick — multiple appointments need to be cancelled | Each appointment must be cancelled individually with a reason. Bulk cancellation is out of scope for MVP. |
| Receptionist tries to book a time slot that is in the past | Blocked. "You cannot book an appointment for a past date or time." |
| Two receptionists attempt to book the same slot simultaneously | The first submission succeeds. The second detects the conflict and is rejected. |
| A "No Show" patient calls to reschedule | The No Show appointment is reopened (status reverts to Scheduled) and a new date/time is set through the edit flow. |
| Staff tries to cancel an already-completed appointment | Not allowed. A completed clinical record cannot be retroactively cancelled. |
| Appointment end time is set before start time | Blocked. "End time must be after start time." |
| A patient's appointment is in "In Progress" status and the receptionist tries to cancel it | The system warns: "This appointment is currently in progress. Are you sure you want to cancel?" Dentist role confirmation recommended. |
| Staff navigates to a week with no appointments | Calendar displays the empty week with all slots showing as available. No error. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Calendar View:**
- [ ] Day View displays all appointments for the selected date as time blocks with correct patient name, type, and status.
- [ ] Week View displays appointments across the week in a readable grid.
- [ ] Staff can navigate forward and backward between days and weeks.
- [ ] Appointment status is visually distinguished (e.g., by colour coding).

**Booking:**
- [ ] A receptionist can book a new appointment by clicking an open slot in the calendar.
- [ ] Booking for a past date or time is blocked with a clear error message.
- [ ] Booking outside configured working hours is blocked.
- [ ] Attempting to double-book shows the conflicting appointment's details and prevents saving.
- [ ] Available slot lookup returns all open time windows for a selected date.

**Status Workflow:**
- [ ] Each appointment correctly starts at "Scheduled" status upon creation.
- [ ] Staff can advance status only to permitted next states.
- [ ] Attempting an invalid transition (e.g., Scheduled → Completed) is blocked with an explanation.
- [ ] A cancelled appointment records its reason and remains visible in history.
- [ ] A no-show appointment can be reopened and rescheduled.

**Editing & Cancellation:**
- [ ] An appointment's date, time, type, and notes can be updated; the conflict check runs on save.
- [ ] An appointment cannot be cancelled without entering a reason.
- [ ] A completed appointment cannot be cancelled.
- [ ] All changes are timestamped and attributed to the user who made them.
