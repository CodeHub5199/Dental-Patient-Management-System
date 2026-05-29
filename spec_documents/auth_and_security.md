# Feature Spec: Authentication & Security

**Document Version:** 1.0
**Feature:** Auth & Security (MVP)
**Audience:** Non-technical stakeholders, product owner, QA team

---

## 1. Problem Statement

A dental clinic handles sensitive personal and medical information for hundreds — sometimes thousands — of patients. This data must only be accessible to authorised staff. Without a proper authentication and role management system, there is no way to control who can see a patient's records, who can modify clinical notes, or who can access financial data.

Additionally, a single-dentist practice typically employs both clinical staff (the dentist) and administrative staff (receptionists). These two roles have fundamentally different responsibilities. A receptionist needs to book appointments and register patients; they should not be able to alter clinical diagnoses. The dentist, on the other hand, needs full access to write and update clinical records. Giving everyone the same level of access creates both a security risk and a compliance liability.

This feature establishes the security boundary of the entire system: every person who uses the application must prove who they are before they can do anything, and the system must enforce what each person is allowed to do based on their role.

---

## 2. Functional Requirements

### 2.1 Login & Session Management

- Staff members log in using their registered email address and a password.
- Upon successful login, the system issues a short-lived access token (valid for 15 minutes) and a longer-lived refresh token.
- The access token is used automatically by the application on every subsequent request.
- When the access token expires, the application silently uses the refresh token to obtain a new one — the user does not need to log in again unless the refresh token has also expired or been revoked.
- A user who is inactive for an extended period is automatically logged out.

### 2.2 Password Management

- Staff can request a password reset via a "Forgot Password" link on the login screen. A reset link is sent to their registered email.
- Password reset links expire after a reasonable window (e.g., 1 hour) and are single-use.
- A logged-in user can change their own password by providing their current password and a new one.
- The dentist (as system administrator) can force-reset the password of any staff account without needing to know the current password. This is useful when a receptionist leaves the practice.

### 2.3 Role-Based Access Control (RBAC)

Two roles exist in the system:

| Role | Description |
|---|---|
| **Dentist** | Full system access. Can read and write all records, manage users, edit clinical notes, delete documents, and update system settings. |
| **Receptionist** | Operational access. Can register patients, manage appointments, upload documents, send reminders, and view (but not write) clinical notes. Cannot manage system users or settings. |

The system enforces these roles automatically on every action. A receptionist who attempts to access a dentist-only function receives a clear "permission denied" message.

### 2.4 User Account Management

- Only the dentist can create new user accounts (e.g., adding a new receptionist).
- The dentist can deactivate any staff account. A deactivated account cannot log in but its history is preserved.
- The dentist can view a list of all staff accounts and their current status.

### 2.5 Profile Management

- Any logged-in user can view and update their own profile (name and email).
- Profile changes take effect on the next login or token refresh.

---

## 3. Input / Output Behaviour

### Login Flow

| Step | Input | Output |
|---|---|---|
| User enters credentials | Email address + Password | If valid: access token, refresh token, user role. If invalid: "Invalid email or password" error. |
| Application makes a request | Access token in header | If valid: requested data. If expired: automatic refresh attempt. |
| Token refresh | Refresh token | New access token. If refresh token expired: user is redirected to login screen. |

### Password Reset Flow

| Step | Input | Output |
|---|---|---|
| Request reset | Email address | System always responds with the same success message regardless of whether the email exists (prevents user enumeration). |
| Submit new password | Reset token (from email link) + New password | Success message and redirect to login. |

### Role Enforcement

| Action | Dentist | Receptionist |
|---|---|---|
| View patient records | ✅ Allowed | ✅ Allowed |
| Create / edit clinical notes | ✅ Allowed | ❌ Denied |
| Register / update patients | ✅ Allowed | ✅ Allowed |
| Create / cancel appointments | ✅ Allowed | ✅ Allowed |
| Create / manage user accounts | ✅ Allowed | ❌ Denied |
| View communication logs | ✅ Allowed | ✅ Allowed |
| Delete documents | ✅ Allowed | ❌ Denied |
| Update clinic settings | ✅ Allowed | ❌ Denied |

---

## 4. Constraints

- Passwords must meet minimum strength requirements (minimum 8 characters, mix of letters and numbers recommended).
- Email addresses must be unique across all staff accounts — two accounts cannot share the same email.
- The system must always have at least one active dentist account. The last active dentist account cannot be deactivated.
- The dentist cannot delete their own account or demote themselves.
- All authentication events (login, logout, failed attempts, password changes) are recorded internally for audit purposes.
- Tokens are transmitted only over HTTPS — never over plain HTTP.
- Access tokens are not stored in browser storage that is accessible to third-party scripts.

---

## 5. Edge Cases & Error Handling

| Scenario | Expected Behaviour |
|---|---|
| User enters wrong password | Show a generic "Invalid email or password" message. Do not specify which field is wrong (prevents username guessing). |
| User account is deactivated | Prevent login. Show "Account is inactive. Please contact your administrator." |
| Password reset link is clicked twice | Second click shows "This reset link has already been used or has expired." |
| Password reset link is clicked after 1 hour | Show "This reset link has expired. Please request a new one." |
| Receptionist attempts a dentist-only action | Return a clear "You do not have permission to perform this action" response. |
| Access token used after expiry | Application automatically attempts a silent refresh. If successful, the original request proceeds. If the refresh also fails, the user is redirected to the login page. |
| User logs in from a new browser tab | Each tab shares the same session. Logging out in one tab logs out all tabs. |
| Admin resets a user's password while that user is logged in | The user's existing session remains valid until their current tokens expire. They will need to log in with the new password on next session start. |
| Two staff members attempt to create an account with the same email | The second attempt returns a "An account with this email already exists" error. |

---

## 6. Acceptance Criteria

The feature is considered complete when all of the following conditions are verified:

**Login & Session:**
- [ ] A staff member with valid credentials can log in and reach the dashboard.
- [ ] A staff member with invalid credentials cannot log in and sees an appropriate error message.
- [ ] A deactivated account cannot be used to log in.
- [ ] The system issues both an access token and a refresh token on successful login.
- [ ] The application automatically renews the access token using the refresh token without interrupting the user's session.
- [ ] A user who has been idle long enough is redirected to the login screen.

**Password Management:**
- [ ] A user can request a password reset and receives an email with a reset link.
- [ ] The reset link expires after the defined window and cannot be reused.
- [ ] A logged-in user can change their password by correctly entering their current password.
- [ ] The dentist can force-reset another user's password from the user management screen.
- [ ] The "forgot password" response is identical whether or not the email exists in the system.

**Role Enforcement:**
- [ ] A receptionist cannot access or invoke any dentist-only feature (user management, clinical note editing, document deletion, settings).
- [ ] The dentist has access to all features without restriction.
- [ ] Attempting a forbidden action returns a clear, user-friendly "permission denied" message.

**User Account Management:**
- [ ] The dentist can create a new staff account with a defined role.
- [ ] The dentist can deactivate a staff account; the account immediately loses the ability to log in.
- [ ] The last active dentist account cannot be deactivated.
- [ ] A user can view and update their own profile name and email.
