# Feature Spec: Dashboard

**Document Version:** 1.0
**Feature:** Dashboard (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

The first screen a staff member sees when they open the system should answer the most important question of their day: *"What is happening right now, and what do I need to pay attention to?"* For a dental clinic, that question has a predictable shape every single morning — who is coming in today, who has confirmed, who is already checked in, and how the day looks financially.

Without a summary view, staff are forced to navigate to multiple separate screens just to understand the day's status. The receptionist has to open the calendar to see today's appointments, then open a separate screen to check financial totals, then manually count how many patients have confirmed. In a high-pressure front-desk environment with a ringing phone and a patient at the window, this fragmentation wastes time and leads to errors.

The dashboard solves this by aggregating the most operationally relevant information into a single, glanceable screen. It is not an analytics tool — that is a Phase 2 concern. The MVP dashboard is about operational awareness: what is happening today, and is the clinic on track.

---

## 2. Functional Requirements

### 2.1 Today's Appointment Overview

- The dashboard displays a summary of all appointments scheduled for the current calendar day.
- The summary includes counts broken down by status:
  - Scheduled (not yet confirmed)
  - Confirmed
  - Checked In
  - In Progress
  - Completed
  - Cancelled
  - No Show
- A total appointment count is shown prominently.

### 2.2 Today's Appointment List Widget

- Below the summary counts, a chronological list of today's appointments is displayed.
- Each row shows:
  - Patient name
  - Appointment time (start and end)
  - Appointment type (e.g., cleaning, filling)
  - Current status (colour-coded for fast visual scanning)
- Clicking any appointment row navigates directly to the full appointment record.
- The list updates automatically to reflect status changes made elsewhere in the system (e.g., when a receptionist marks a patient as checked in, the dashboard reflects this without a manual page refresh).

### 2.3 Quick Statistics

The dashboard displays three at-a-glance numbers alongside the appointment list:

- **Total Active Patients:** The count of all active patient records in the system. Gives the dentist a quick sense of the practice's patient base size.
- **New Patients This Month:** The count of patients registered in the current calendar month.
- **Revenue (Today):** The sum of all treatment amounts recorded with a "Completed" status for today's date. This is drawn from treatment records entered by the dentist during clinical charting.

### 2.4 Date Context

- The dashboard always defaults to the current date.
- The date is displayed clearly so there is no ambiguity about what "today" refers to.
- Staff cannot change the dashboard date — for historical views, they navigate to the calendar or reports. The dashboard is explicitly a live, current-day tool.

---

## 3. Input / Output Behaviour

### Dashboard Load

| Trigger | Output |
|---|---|
| Staff member logs in | Dashboard loads automatically as the landing page. |
| Staff member navigates to the dashboard | Current day's data is fetched and displayed. |

### Appointment Summary Counts

| Data Source | Output |
|---|---|
| Today's appointments in the database | Counts by status displayed as labelled numbers. Example: "Scheduled: 6 / Confirmed: 4 / Checked In: 2 / In Progress: 1 / Completed: 5 / Cancelled: 1 / No Show: 0 / Total: 18" |
| No appointments today | All counts show 0; a message reads "No appointments scheduled for today." |

### Quick Stats

| Stat | Data Source | Output |
|---|---|---|
| Total Active Patients | Count of patients with `is_active = true` | Displayed as a number (e.g., "1,050") |
| New Patients This Month | Count of patients with `registration_date` in the current calendar month | Displayed as a number (e.g., "12") |
| Revenue Today | Sum of `amount` from treatment records where `performed_date = today` and `status = Completed` | Displayed as a currency value (e.g., "$2,450.00") |

### Real-Time Status Update

| Event | Effect on Dashboard |
|---|---|
| Receptionist marks a patient as "Checked In" in another tab | The appointment row on the dashboard updates its status label without requiring a page reload |
| Dentist completes an appointment and logs a treatment | Revenue Today figure increments automatically |

---

## 4. Constraints

- The dashboard is **read-only**. No data can be created or modified directly from the dashboard. Actions like changing an appointment status, registering a patient, or adding a treatment are performed on their respective screens.
- The dashboard is scoped to **today only**. There is no ability to view "yesterday's dashboard" or "last week's summary" from this screen. Historical analysis is out of scope for the MVP dashboard.
- The **Revenue Today** figure is derived purely from treatment `amount` values logged by the dentist in clinical charting. It is not a billing system and does not account for payments received, insurance claims, or outstanding invoices. It should be understood as a *clinical fee tally*, not an accounting figure.
- Dashboard data loads when the screen is opened and refreshes automatically at a reasonable interval (e.g., every 60 seconds) to keep status counts current throughout the day. A manual "Refresh" button is also available.
- Both staff roles (dentist and receptionist) see the same dashboard. There is no role-specific dashboard view in MVP.
- The dashboard does not send alerts or notifications (e.g., "You have 2 patients waiting"). Active status monitoring is a Phase 2 concern.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| The clinic has no appointments today | Dashboard shows: "No appointments scheduled for today." All counts display as 0. Quick stats (patient count, revenue) still load normally. |
| It is a weekend or public holiday with no scheduled appointments | Same as above. No error. The dashboard renders gracefully with zero-state messaging. |
| No treatments have been logged today | Revenue Today displays as "$0.00". This is not an error — it is accurate. |
| The system cannot reach the database at load time | Dashboard displays a loading error: "Unable to load today's data. Please refresh the page or contact support." Individual widgets show an error state independently, so a failed revenue query does not block the appointment list from loading. |
| A treatment has no `amount` entered (optional field) | That treatment is excluded from the Revenue Today sum. Treatments with null amounts contribute $0.00. |
| A large number of appointments (e.g., 20+) in the list | The list scrolls; the most important context (summary counts, quick stats) remains fixed at the top. |
| Staff member opens the dashboard at 23:59 and the date rolls over to the next day | The dashboard detects the date change and re-loads with the new day's data. |
| New patient registered at reception while the dentist has the dashboard open | "Total Active Patients" count increments on the next auto-refresh (within 60 seconds). It does not update in real-time. |
| Revenue Today shows a very large number due to multiple expensive treatments | The number is formatted with currency symbol and thousands separators (e.g., "$12,500.00") for readability. No truncation. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Appointment Overview:**
- [ ] The dashboard displays the correct total count of today's appointments.
- [ ] Appointment counts are correctly broken down by all seven statuses.
- [ ] All counts are accurate and match what is visible in the full calendar view for the same date.
- [ ] When there are no appointments today, a "No appointments scheduled for today" message appears.

**Appointment List Widget:**
- [ ] Today's appointments are listed in chronological order with name, time, type, and status.
- [ ] Status labels are visually distinguished (e.g., colour-coded).
- [ ] Clicking an appointment row navigates to the full appointment detail page.
- [ ] When a status is changed elsewhere in the system, the dashboard reflects the change within one auto-refresh cycle (≤ 60 seconds) or immediately on manual refresh.

**Quick Statistics:**
- [ ] Total Active Patients shows the correct count of active patient records.
- [ ] New Patients This Month shows the correct count of patients registered in the current calendar month.
- [ ] Revenue Today shows the correct sum of completed treatment amounts for the current date.
- [ ] Revenue Today displays as "$0.00" when no treatments have been logged today.
- [ ] All three stats update correctly when underlying data changes.

**General:**
- [ ] The dashboard loads as the default landing page after login.
- [ ] The current date is displayed clearly on the dashboard.
- [ ] The dashboard auto-refreshes every 60 seconds or less.
- [ ] A manual refresh button reloads all dashboard data on demand.
- [ ] If the database is unavailable, an error message is shown rather than incorrect data.
- [ ] Both the dentist and receptionist see the same dashboard content.
- [ ] No data can be created or modified directly from the dashboard.
