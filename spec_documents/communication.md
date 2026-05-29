# Feature Spec: Communication

**Document Version:** 1.0
**Feature:** Communication — SMS & Email Reminders (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

Appointment no-shows are one of the most costly and preventable problems in dental practice management. Industry data consistently shows that practices without systematic reminders experience no-show rates of 15–30%. For a single-dentist practice with 15–20 appointments per day, even a 20% no-show rate means 3–4 empty slots daily — each representing lost revenue and wasted clinical preparation time.

The primary cause is not patient indifference — it is forgetting. A patient who books a 6-month hygiene appointment on a Tuesday in October will almost certainly not remember it the following March. Sending a reminder 24 hours before the appointment, or even 1 hour before, dramatically reduces no-shows across every healthcare setting where this has been studied.

Beyond automated reminders, clinical staff also need to send ad-hoc messages: notifying a patient that their appointment has been rescheduled, following up on a treatment, or confirming a callback. Without a system-managed log of these communications, the practice has no record of what was sent, when, or whether it was delivered.

This feature provides two capabilities: an **automated reminder engine** that sends messages to patients ahead of their appointments without staff needing to remember to do so, and a **manual messaging tool** that lets staff send targeted communications from within the patient record — with every message logged permanently.

---

## 2. Functional Requirements

### 2.1 Automated Appointment Reminders

- The system automatically sends reminder messages to patients ahead of their scheduled appointments.
- Reminders are sent via **SMS** (to the patient's registered phone number) and/or **Email** (to the patient's registered email address).
- The default reminder configuration sends an SMS 24 hours before the appointment.
- Reminder templates use placeholders that are automatically filled in:
  - `{{patient_name}}` — patient's first name
  - `{{appointment_type}}` — type of appointment (e.g., "cleaning")
  - `{{appointment_time}}` — scheduled start time
  - `{{appointment_date}}` — scheduled date
  - `{{clinic_name}}` — the practice name from settings
- Example SMS: *"Hi Sarah, reminder: your cleaning appointment is tomorrow at 10:00 AM at Smile Dental. Reply CONFIRM to confirm or call us to reschedule."*
- Automated reminders are only sent to patients who have a valid phone number (for SMS) or email address (for email) on file. Patients without contact details are skipped, and the failure is logged.

### 2.2 Reminder Configuration

- The dentist can create, edit, and delete reminder configurations.
- Each configuration specifies:
  - **Name:** A human-readable label (e.g., "24hr SMS Reminder")
  - **Channel:** SMS or Email
  - **Timing:** How many hours before the appointment to send the message
  - **Template:** The message body, using placeholders
  - **Active / Inactive:** Whether this configuration is currently running
- Multiple configurations can run simultaneously (e.g., a 24-hour SMS and a 1-hour SMS).
- Configurations can be toggled on or off without deleting them, allowing the practice to pause reminders (e.g., during a clinic closure) and resume them later.

### 2.3 Manual Communication

- Any staff member can send a message directly to a patient from within the patient record or appointment screen.
- The staff member selects the channel (SMS or Email), writes the message, and sends it.
- SMS messages are limited to 160 characters (standard SMS length). Email messages allow up to 2,000 characters.
- Every manually sent message is logged automatically.

### 2.4 Bulk Reminder Trigger

- Staff can manually trigger all 24-hour reminders for the following day's appointments in a single action, rather than waiting for the automated schedule.
- This is useful for batch-sending reminders on a specific day or testing the configuration.
- After the bulk send, a summary is displayed: how many reminders were sent, and how many failed (with a reason for each failure).

### 2.5 Communication Log

- Every message sent through the system — automated or manual — is recorded in a communication log.
- Each log entry captures:
  - Patient name
  - Channel (SMS or Email)
  - Direction (Outbound — the system sending to the patient)
  - Message content
  - Delivery status: `Sent`, `Delivered`, `Failed`
  - Date and time of sending
  - Who triggered it (staff name, or "System" for automated messages)
- Staff can filter the log by patient, channel, status, or date range.

---

## 3. Input / Output Behaviour

### Automated Reminder Trigger

| Trigger | Process | Output |
|---|---|---|
| System clock reaches the configured lead time before an appointment | System looks up the patient's contact details, fills in the template, and sends via the configured channel | Message logged as "Sent"; delivery status updated to "Delivered" or "Failed" after provider callback |
| Patient has no phone number (for SMS reminder) | Send is skipped | Log entry created with status "Failed — No phone number on file" |
| Patient has no email (for Email reminder) | Send is skipped | Log entry created with status "Failed — No email on file" |

### Manual Communication

| Input | Validation | Output on Success | Output on Failure |
|---|---|---|---|
| Patient selection | Must be an existing patient | Message form pre-fills patient name and contact | "Patient not found" |
| Channel (SMS or Email) | Required | — | "Please select a channel" |
| Message content | Required; SMS max 160 chars; Email max 2,000 chars | Message sent and logged | "Message cannot be empty" / "SMS messages cannot exceed 160 characters" |

### Bulk Reminder Trigger

| Input | Output |
|---|---|
| Staff clicks "Send Tomorrow's Reminders" | Summary screen: "18 appointments tomorrow. 16 reminders sent, 2 failed." Failure reasons listed by patient. |

### Reminder Configuration

| Input | Validation | Output on Success |
|---|---|---|
| Name | Required | Configuration saved |
| Channel | Required | — |
| Hours before appointment | Required, positive integer | — |
| Template | Required, must include at least one valid placeholder | Configuration saved and active |
| Toggle off | — | Configuration paused; reminders stop sending until toggled back on |

---

## 4. Constraints

- **SMS messages are capped at 160 characters.** This is a technical constraint of the SMS standard. Messages longer than 160 characters may be split into multiple SMS messages by the carrier, incurring additional cost. The system enforces the limit to prevent this.
- Reminders are only sent to **opted-in patients** who have valid contact details. The system does not send to patients with missing or invalid contact information — it logs the skip instead.
- The system does not manage patient opt-in/opt-out preferences in MVP (e.g., GDPR/marketing consent). This is noted as a compliance consideration for future development. For MVP, it is assumed that all registered patients have consented to appointment-related communications as part of the practice's patient registration process.
- Automated reminders are sent via third-party providers (Twilio for SMS, SendGrid for Email). Message delivery is not guaranteed by the system — it relies on the provider's delivery network. Delivery failures are logged but the system does not automatically retry.
- The communication system is **outbound only** in MVP. If a patient replies to an SMS, that reply is received by the Twilio number but is not currently displayed inside the DPMS.
- Reminder configurations can only be created and managed by the dentist role.
- Message templates cannot contain HTML in SMS messages. Email templates may use basic formatting in future phases but are plain text in MVP.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| Automated reminder is triggered for a patient who has no phone number | Reminder is skipped. A log entry is created: "Reminder skipped — no phone number on file for [Patient Name]." |
| Automated reminder is triggered for an appointment that was cancelled after the reminder was scheduled | The system checks appointment status before sending. If the appointment is cancelled, the reminder is not sent. |
| Manual SMS message is typed beyond 160 characters | Character counter turns red. Save/send button is disabled. Message: "SMS limit is 160 characters. Please shorten your message." |
| Bulk reminder trigger is run but there are no appointments tomorrow | System responds: "No appointments scheduled for tomorrow. No reminders sent." |
| SMS delivery fails (e.g., invalid number, carrier rejection) | System logs the attempt with status "Failed" and the error reason returned by the provider (e.g., "Invalid destination number"). Staff can see the failure in the communication log. |
| Email delivery fails (e.g., email address invalid) | Same as SMS: logged with status "Failed" and reason. |
| Same appointment has multiple reminders configured (e.g., 24hr and 1hr) | Both are sent independently. Each generates its own log entry. |
| Staff sends a manual message to a patient with no email address while selecting "Email" | Blocked before sending. "This patient does not have an email address on file." |
| A reminder configuration's template uses an invalid placeholder | At save time, the system validates all placeholders. "Unknown placeholder: {{appointment_doctor}}. Supported placeholders are: {{patient_name}}, {{appointment_type}}, {{appointment_time}}, {{appointment_date}}, {{clinic_name}}." |
| Dentist deactivates all reminder configurations | Automated reminders stop entirely until at least one configuration is re-activated. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Automated Reminders:**
- [ ] A configured reminder is sent to the patient's phone/email at the correct lead time before their appointment.
- [ ] If a patient has no contact information, the reminder is skipped and logged (not errored).
- [ ] If an appointment is cancelled before the reminder sends, the reminder is not sent.
- [ ] Each sent reminder is logged with channel, content, status, and timestamp.

**Reminder Configuration:**
- [ ] The dentist can create a new reminder configuration with name, channel, timing, and template.
- [ ] Templates with invalid placeholders are rejected at save with an explanation.
- [ ] A configuration can be toggled active/inactive without deleting it.
- [ ] The dentist can delete a configuration; it stops sending immediately.
- [ ] A receptionist cannot create or modify reminder configurations.

**Manual Communication:**
- [ ] Any staff member can send a manual SMS or Email to a patient.
- [ ] SMS messages over 160 characters are blocked before sending.
- [ ] Every manually sent message appears in the communication log.
- [ ] Attempting to send via Email to a patient without an email on file is blocked.
- [ ] Attempting to send via SMS to a patient without a phone number is blocked.

**Bulk Trigger:**
- [ ] Staff can trigger all next-day reminders in one action.
- [ ] The result screen shows count of sent and failed reminders with failure reasons.
- [ ] When no appointments exist for the next day, a clear "no reminders to send" message is shown.

**Communication Log:**
- [ ] All outbound messages (automated and manual) appear in the log.
- [ ] Each log entry correctly records patient, channel, content, status, timestamp, and sender.
- [ ] The log can be filtered by patient, channel, status, and date range.
