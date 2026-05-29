Here is the complete API specification for the MVP, organized by resource module with full request/response schemas, validation rules, and error handling.

---

# DPMS API Specification 

---

## 1. Authentication

### `POST /auth/login`
Authenticate user and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "dentist@clinic.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "dentist@clinic.com",
    "full_name": "Dr. Smith",
    "role": "dentist"
  }
}
```

**Error `401`:**
```json
{
  "detail": "Invalid email or password"
}
```

---

### `POST /auth/refresh`
Exchange refresh token for new access token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### `POST /auth/forgot-password`
Send password reset email.

**Request Body:**
```json
{
  "email": "dentist@clinic.com"
}
```

**Response `200`:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

---

### `POST /auth/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newSecurePassword456"
}
```

**Response `200`:**
```json
{
  "message": "Password reset successful"
}
```

---

### `GET /auth/me`
Get current authenticated user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "dentist@clinic.com",
  "full_name": "Dr. Smith",
  "role": "dentist",
  "is_active": true,
  "created_at": "2026-01-15T09:30:00Z"
}
```

---

### `PUT /auth/me`
Update current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "full_name": "Dr. John Smith",
  "email": "dr.smith@clinic.com"
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "dr.smith@clinic.com",
  "full_name": "Dr. John Smith",
  "role": "dentist",
  "is_active": true,
  "updated_at": "2026-05-28T14:00:00Z"
}
```

---

### `PUT /auth/change-password`
Change password (requires current password).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "current_password": "oldPassword",
  "new_password": "newSecurePassword789"
}
```

**Response `200`:**
```json
{
  "message": "Password changed successfully"
}
```

**Error `400`:**
```json
{
  "detail": "Current password is incorrect"
}
```

---

## 2. Users Management (Dentist Only)

### `GET /users`
List all system users.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `role` | string | optional | Filter by `dentist` or `receptionist` |
| `is_active` | boolean | optional | Filter by active status |
| `search` | string | optional | Search by name or email |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max 100) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "reception@clinic.com",
      "full_name": "Jane Doe",
      "role": "receptionist",
      "is_active": true,
      "created_at": "2026-01-15T09:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

---

### `POST /users`
Create new system user.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "email": "assistant@clinic.com",
  "password": "tempPassword123",
  "full_name": "Mike Wilson",
  "role": "receptionist"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "email": "assistant@clinic.com",
  "full_name": "Mike Wilson",
  "role": "receptionist",
  "is_active": true,
  "created_at": "2026-05-28T14:00:00Z"
}
```

---

### `GET /users/{user_id}`
Get specific user details.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "reception@clinic.com",
  "full_name": "Jane Doe",
  "role": "receptionist",
  "is_active": true,
  "created_at": "2026-01-15T09:30:00Z",
  "updated_at": "2026-05-20T11:00:00Z"
}
```

---

### `PUT /users/{user_id}`
Update user details.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "full_name": "Jane Smith-Doe",
  "email": "jane.smith@clinic.com",
  "role": "receptionist",
  "is_active": true
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "jane.smith@clinic.com",
  "full_name": "Jane Smith-Doe",
  "role": "receptionist",
  "is_active": true,
  "updated_at": "2026-05-28T15:00:00Z"
}
```

---

### `DELETE /users/{user_id}`
Deactivate user (soft delete).

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Response `200`:**
```json
{
  "message": "User deactivated successfully"
}
```

---

### `POST /users/{user_id}/reset-password`
Admin-forced password reset.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "new_password": "forcedReset456"
}
```

**Response `200`:**
```json
{
  "message": "Password reset by admin"
}
```

---

## 3. Patients

### `GET /patients`
List/search patients with pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `search` | string | optional | Search by name, phone, or email |
| `is_active` | boolean | true | Filter active/inactive patients |
| `registration_date_from` | date | optional | Filter by registration date range start |
| `registration_date_to` | date | optional | Filter by registration date range end |
| `sort_by` | string | `created_at` | Sort field: `first_name`, `last_name`, `created_at` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max 100) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1985-03-15",
      "gender": "male",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St, City",
      "emergency_contact": {
        "name": "Jane Doe",
        "phone": "+0987654321",
        "relationship": "Spouse"
      },
      "medical_notes": "Allergic to penicillin. Type 2 diabetes.",
      "is_active": true,
      "registration_date": "2025-06-15",
      "created_by": {
        "id": "uuid",
        "full_name": "Jane Doe"
      },
      "created_at": "2025-06-15T10:30:00Z",
      "updated_at": "2026-05-20T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1050,
    "total_pages": 53
  }
}
```

---

### `POST /patients`
Register new patient.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "first_name": "Sarah",
  "last_name": "Connor",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah@example.com",
  "address": "456 Oak Ave, City, State 12345",
  "emergency_contact": {
    "name": "Kyle Reese",
    "phone": "+5544332211",
    "relationship": "Partner"
  },
  "medical_notes": "Pregnant - 2nd trimester. Avoid NSAIDs."
}
```

**Validation Rules:**
- `first_name`: Required, 1-100 chars
- `last_name`: Required, 1-100 chars
- `date_of_birth`: Required, must be valid date, not in future
- `phone`: Required, unique, E.164 format recommended
- `email`: Optional, valid email format, unique if provided
- `medical_notes`: Optional, max 5000 chars

**Response `201`:**
```json
{
  "id": "uuid",
  "first_name": "Sarah",
  "last_name": "Connor",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah@example.com",
  "address": "456 Oak Ave, City, State 12345",
  "emergency_contact": {
    "name": "Kyle Reese",
    "phone": "+5544332211",
    "relationship": "Partner"
  },
  "medical_notes": "Pregnant - 2nd trimester. Avoid NSAIDs.",
  "is_active": true,
  "registration_date": "2026-05-28",
  "created_by": {
    "id": "uuid",
    "full_name": "Jane Doe"
  },
  "created_at": "2026-05-28T14:00:00Z"
}
```

**Error `409`:**
```json
{
  "detail": "A patient with this phone number already exists"
}
```

---

### `GET /patients/{patient_id}`
Get detailed patient profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "first_name": "Sarah",
  "last_name": "Connor",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah@example.com",
  "address": "456 Oak Ave, City, State 12345",
  "emergency_contact": {
    "name": "Kyle Reese",
    "phone": "+5544332211",
    "relationship": "Partner"
  },
  "medical_notes": "Pregnant - 2nd trimester. Avoid NSAIDs.",
  "is_active": true,
  "registration_date": "2026-05-28",
  "created_by": {
    "id": "uuid",
    "full_name": "Jane Doe"
  },
  "created_at": "2026-05-28T14:00:00Z",
  "updated_at": "2026-05-28T14:00:00Z",
  "stats": {
    "total_appointments": 5,
    "total_treatments": 8,
    "total_amount": 1500.00,
    "last_visit_date": "2026-05-20",
    "upcoming_appointment": {
      "id": "uuid",
      "date": "2026-06-15",
      "time": "10:00",
      "type": "checkup"
    }
  }
}
```

**Error `404`:**
```json
{
  "detail": "Patient not found"
}
```

---

### `PUT /patients/{patient_id}`
Update patient information.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "first_name": "Sarah",
  "last_name": "Connor-Smith",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah.smith@example.com",
  "address": "789 Pine St, City, State 12345",
  "emergency_contact": {
    "name": "Kyle Reese",
    "phone": "+5544332211",
    "relationship": "Partner"
  },
  "medical_notes": "Pregnant - 3rd trimester. Avoid NSAIDs. Gestational diabetes - controlled."
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "first_name": "Sarah",
  "last_name": "Connor-Smith",
  "date_of_birth": "1990-08-22",
  "gender": "female",
  "phone": "+1122334455",
  "email": "sarah.smith@example.com",
  "address": "789 Pine St, City, State 12345",
  "emergency_contact": {
    "name": "Kyle Reese",
    "phone": "+5544332211",
    "relationship": "Partner"
  },
  "medical_notes": "Pregnant - 3rd trimester. Avoid NSAIDs. Gestational diabetes - controlled.",
  "is_active": true,
  "updated_at": "2026-05-28T15:30:00Z"
}
```

---

### `DELETE /patients/{patient_id}`
Deactivate patient (soft delete).

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "message": "Patient deactivated successfully"
}
```

---

### `GET /patients/{patient_id}/appointments`
Get all appointments for a specific patient.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `status` | string | optional | Filter by appointment status |
| `date_from` | date | optional | Start date filter |
| `date_to` | date | optional | End date filter |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "patient_name": "Sarah Connor-Smith",
      "dentist_id": "uuid",
      "dentist_name": "Dr. Smith",
      "appointment_date": "2026-06-15",
      "start_time": "10:00",
      "end_time": "10:30",
      "status": "scheduled",
      "appointment_type": "checkup",
      "notes": "Regular 6-month checkup",
      "created_at": "2026-05-28T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### `GET /patients/{patient_id}/treatments`
Get treatment history for a patient.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `status` | string | optional | `planned`, `in_progress`, `completed` |
| `tooth_number` | string | optional | FDI notation (e.g., "11", "36") |
| `sort_order` | string | `desc` | `asc` or `desc` by performed_date |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "appointment_id": "uuid",
      "appointment_date": "2026-05-20",
      "tooth_number": "36",
      "procedure_code": "D2391",
      "procedure_name": "Composite Filling - 1 surface",
      "description": "Occlusal composite restoration on lower left first molar",
      "amount": 250.00,
      "status": "completed",
      "performed_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "performed_date": "2026-05-20",
      "created_at": "2026-05-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 8,
    "total_pages": 1
  }
}
```

---

### `GET /patients/{patient_id}/clinical-notes`
Get SOAP notes history for a patient.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `date_from` | date | optional | Start date filter |
| `date_to` | date | optional | End date filter |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 10 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "appointment_id": "uuid",
      "appointment_date": "2026-05-20",
      "appointment_type": "filling",
      "subjective": "Patient reports sensitivity to cold on lower left side for 2 weeks",
      "objective": "Clinical examination reveals occlusal caries on tooth #36. No percussion sensitivity. Periapical radiograph shows caries approaching dentin.",
      "assessment": "Dental caries on tooth #36 requiring restoration",
      "plan": "Composite restoration tooth #36. Schedule follow-up if sensitivity persists.",
      "created_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "created_at": "2026-05-20T11:30:00Z",
      "updated_at": "2026-05-20T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### `GET /patients/{patient_id}/documents`
Get all documents for a patient.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `document_type` | string | optional | `xray`, `photo`, `consent_form`, `prescription`, `lab_report`, `other` |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "appointment_id": "uuid",
      "treatment_id": "uuid",
      "document_type": "xray",
      "file_name": "bitewing_right_side.jpg",
      "file_size": 2450000,
      "mime_type": "image/jpeg",
      "uploaded_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "uploaded_at": "2026-05-20T11:00:00Z",
      "notes": "Right bitewing radiograph",
      "download_url": "https://supabase.co/storage/v1/object/signed/..."
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

---

### `GET /patients/search/quick`
Quick patient search (autocomplete).

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `q` | string | required | Search query (min 2 chars) |
| `limit` | integer | 10 | Max results |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "Sarah",
      "last_name": "Connor-Smith",
      "phone": "+1122334455",
      "date_of_birth": "1990-08-22",
      "last_visit_date": "2026-05-20"
    }
  ]
}
```

---

## 4. Appointments

### `GET /appointments`
List appointments with filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `date` | date | today | Specific date to query |
| `date_from` | date | optional | Range start |
| `date_to` | date | optional | Range end |
| `status` | string | optional | Comma-separated: `scheduled,confirmed,checked_in` |
| `dentist_id` | uuid | optional | Filter by dentist |
| `patient_id` | uuid | optional | Filter by patient |
| `search` | string | optional | Search by patient name |
| `sort_by` | string | `start_time` | `start_time` or `created_at` |
| `sort_order` | string | `asc` | `asc` or `desc` |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "first_name": "Sarah",
        "last_name": "Connor-Smith",
        "phone": "+1122334455"
      },
      "dentist": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "appointment_date": "2026-05-28",
      "start_time": "10:00",
      "end_time": "10:30",
      "duration_minutes": 30,
      "status": "scheduled",
      "appointment_type": "checkup",
      "notes": "Regular 6-month checkup",
      "created_by": {
        "id": "uuid",
        "full_name": "Jane Doe"
      },
      "created_at": "2026-05-20T09:00:00Z",
      "updated_at": "2026-05-20T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 18,
    "total_pages": 1
  },
  "summary": {
    "total_appointments": 18,
    "scheduled": 12,
    "confirmed": 3,
    "checked_in": 2,
    "in_progress": 1,
    "completed": 0,
    "cancelled": 0,
    "no_show": 0
  }
}
```

---

### `POST /appointments`
Create new appointment.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "dentist_id": "uuid",
  "appointment_date": "2026-06-15",
  "start_time": "14:00",
  "end_time": "14:45",
  "appointment_type": "cleaning",
  "notes": "Patient requested evening slot"
}
```

**Validation Rules:**
- `patient_id`: Required, must be active patient
- `dentist_id`: Required, must be active dentist
- `appointment_date`: Required, not in past
- `start_time`: Required, within working hours (e.g., 09:00-17:00)
- `end_time`: Required, after start_time
- No overlapping appointments for same dentist
- `appointment_type`: Required, from configured types

**Response `201`:**
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "first_name": "Sarah",
    "last_name": "Connor-Smith",
    "phone": "+1122334455"
  },
  "dentist": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "appointment_date": "2026-06-15",
  "start_time": "14:00",
  "end_time": "14:45",
  "duration_minutes": 45,
  "status": "scheduled",
  "appointment_type": "cleaning",
  "notes": "Patient requested evening slot",
  "created_by": {
    "id": "uuid",
    "full_name": "Jane Doe"
  },
  "created_at": "2026-05-28T15:00:00Z"
}
```

**Error `409`:**
```json
{
  "detail": "Time slot conflict. Dentist has an existing appointment from 13:30 to 14:15."
}
```

---

### `GET /appointments/{appointment_id}`
Get appointment details.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "first_name": "Sarah",
    "last_name": "Connor-Smith",
    "phone": "+1122334455",
    "date_of_birth": "1990-08-22",
    "medical_notes": "Pregnant - 3rd trimester. Avoid NSAIDs."
  },
  "dentist": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "appointment_date": "2026-06-15",
  "start_time": "14:00",
  "end_time": "14:45",
  "duration_minutes": 45,
  "status": "scheduled",
  "appointment_type": "cleaning",
  "notes": "Patient requested evening slot",
  "cancellation_reason": null,
  "created_by": {
    "id": "uuid",
    "full_name": "Jane Doe"
  },
  "created_at": "2026-05-28T15:00:00Z",
  "updated_at": "2026-05-28T15:00:00Z"
}
```

---

### `PUT /appointments/{appointment_id}`
Update appointment details.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "appointment_date": "2026-06-16",
  "start_time": "15:00",
  "end_time": "15:45",
  "appointment_type": "cleaning",
  "notes": "Rescheduled per patient request"
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "appointment_date": "2026-06-16",
  "start_time": "15:00",
  "end_time": "15:45",
  "appointment_type": "cleaning",
  "notes": "Rescheduled per patient request",
  "updated_at": "2026-05-28T16:00:00Z"
}
```

---

### `DELETE /appointments/{appointment_id}`
Cancel appointment.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "cancellation_reason": "Patient called to cancel - scheduling conflict"
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancellation_reason": "Patient called to cancel - scheduling conflict",
  "updated_at": "2026-05-28T16:30:00Z"
}
```

---

### `PATCH /appointments/{appointment_id}/status`
Update appointment status (status workflow transitions).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "status": "checked_in"
}
```

**Status Transition Rules:**
| Current Status | Allowed Transitions |
|:---|:---|
| `scheduled` | `confirmed`, `cancelled` |
| `confirmed` | `checked_in`, `cancelled`, `no_show` |
| `checked_in` | `in_progress`, `cancelled` |
| `in_progress` | `completed` |
| `completed` | (terminal) |
| `cancelled` | `scheduled` (reopen) |
| `no_show` | `scheduled` (reopen) |

**Response `200`:**
```json
{
  "id": "uuid",
  "status": "checked_in",
  "previous_status": "confirmed",
  "updated_at": "2026-05-28T14:05:00Z"
}
```

**Error `422`:**
```json
{
  "detail": "Invalid status transition from 'completed' to 'checked_in'"
}
```

---

### `GET /appointments/calendar`
Get calendar view data (optimized for calendar UI).

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `start_date` | date | required | Calendar range start |
| `end_date` | date | required | Calendar range end |
| `dentist_id` | uuid | optional | Filter by dentist |

**Response `200`:**
```json
{
  "start_date": "2026-05-25",
  "end_date": "2026-05-31",
  "appointments": [
    {
      "id": "uuid",
      "date": "2026-05-28",
      "start_time": "10:00",
      "end_time": "10:30",
      "status": "scheduled",
      "patient_name": "Sarah Connor-Smith",
      "appointment_type": "checkup",
      "color": "#3B82F6"
    }
  ],
  "blocked_slots": [
    {
      "date": "2026-05-29",
      "start_time": "12:00",
      "end_time": "13:00",
      "reason": "Lunch break"
    }
  ]
}
```

---

### `GET /appointments/stats/daily`
Get daily appointment statistics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `date` | date | today | Specific date |

**Response `200`:**
```json
{
  "date": "2026-05-28",
  "total_scheduled": 18,
  "confirmed": 3,
  "checked_in": 2,
  "in_progress": 1,
  "completed": 10,
  "cancelled": 1,
  "no_show": 1,
  "completion_rate": 0.83
}
```

---

### `GET /appointments/slots/available`
Get available time slots for a given date.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `date` | date | required | Date to check |
| `dentist_id` | uuid | required | Dentist to check |

**Response `200`:**
```json
{
  "date": "2026-06-15",
  "dentist_id": "uuid",
  "working_hours": {
    "start": "09:00",
    "end": "17:00"
  },
  "available_slots": [
    {
      "start_time": "09:00",
      "end_time": "09:30"
    },
    {
      "start_time": "09:30",
      "end_time": "10:00"
    },
    {
      "start_time": "14:00",
      "end_time": "14:30"
    }
  ],
  "booked_slots": [
    {
      "start_time": "10:00",
      "end_time": "10:30",
      "patient_name": "John Doe"
    }
  ]
}
```

---

## 5. Clinical Notes (SOAP)

### `GET /clinical-notes`
List clinical notes with filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `patient_id` | uuid | optional | Filter by patient |
| `appointment_id` | uuid | optional | Filter by appointment |
| `created_by` | uuid | optional | Filter by dentist |
| `date_from` | date | optional | Range start |
| `date_to` | date | optional | Range end |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "first_name": "Sarah",
        "last_name": "Connor-Smith"
      },
      "appointment_id": "uuid",
      "appointment_date": "2026-05-20",
      "appointment_type": "filling",
      "subjective": "Patient reports sensitivity to cold on lower left side",
      "objective": "Clinical examination reveals occlusal caries on tooth #36",
      "assessment": "Dental caries requiring restoration",
      "plan": "Composite restoration tooth #36",
      "created_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "created_at": "2026-05-20T11:30:00Z",
      "updated_at": "2026-05-20T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

### `POST /clinical-notes`
Create clinical note.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "subjective": "Patient reports severe pain in upper right quadrant for 3 days. Pain is throbbing and worsens at night.",
  "objective": "Periapical radiograph of tooth #16 shows radiolucency at apex. Tooth is tender to percussion. No swelling visible.",
  "assessment": "Acute apical periodontitis on tooth #16. Likely pulpal necrosis.",
  "plan": "1. Root canal treatment tooth #16. 2. Prescribe amoxicillin 500mg TID for 7 days. 3. Schedule follow-up in 1 week."
}
```

**Validation Rules:**
- `patient_id`: Required, must exist
- `appointment_id`: Optional, if provided must belong to patient
- `subjective`: Required, min 10 chars, max 5000 chars
- `objective`: Required, min 10 chars, max 5000 chars
- `assessment`: Required, min 10 chars, max 5000 chars
- `plan`: Required, min 10 chars, max 5000 chars

**Response `201`:**
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "subjective": "Patient reports severe pain in upper right quadrant for 3 days...",
  "objective": "Periapical radiograph of tooth #16 shows radiolucency at apex...",
  "assessment": "Acute apical periodontitis on tooth #16...",
  "plan": "1. Root canal treatment tooth #16...",
  "created_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "created_at": "2026-05-28T14:30:00Z"
}
```

---

### `GET /clinical-notes/{note_id}`
Get specific clinical note.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "first_name": "Sarah",
    "last_name": "Connor-Smith"
  },
  "appointment_id": "uuid",
  "appointment_date": "2026-05-20",
  "subjective": "Patient reports severe pain...",
  "objective": "Periapical radiograph...",
  "assessment": "Acute apical periodontitis...",
  "plan": "1. Root canal treatment...",
  "created_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "created_at": "2026-05-28T14:30:00Z",
  "updated_at": "2026-05-28T14:30:00Z"
}
```

---

### `PUT /clinical-notes/{note_id}`
Update clinical note.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`  
**Note:** Only the creator can update their notes

**Request Body:**
```json
{
  "subjective": "Updated patient complaint...",
  "objective": "Updated findings...",
  "assessment": "Updated diagnosis...",
  "plan": "Updated treatment plan..."
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "subjective": "Updated patient complaint...",
  "objective": "Updated findings...",
  "assessment": "Updated diagnosis...",
  "plan": "Updated treatment plan...",
  "updated_at": "2026-05-28T16:00:00Z"
}
```

**Error `403`:**
```json
{
  "detail": "You can only edit your own clinical notes"
}
```

---

### `DELETE /clinical-notes/{note_id}`
Delete clinical note.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`  
**Note:** Only the creator can delete their notes

**Response `200`:**
```json
{
  "message": "Clinical note deleted successfully"
}
```

---

## 6. Treatments

### `GET /treatments`
List treatments with filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `patient_id` | uuid | optional | Filter by patient |
| `appointment_id` | uuid | optional | Filter by appointment |
| `status` | string | optional | `planned`, `in_progress`, `completed` |
| `tooth_number` | string | optional | FDI notation |
| `performed_by` | uuid | optional | Filter by dentist |
| `date_from` | date | optional | Performed date range start |
| `date_to` | date | optional | Performed date range end |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "first_name": "Sarah",
        "last_name": "Connor-Smith"
      },
      "appointment_id": "uuid",
      "appointment_date": "2026-05-20",
      "tooth_number": "36",
      "procedure_code": "D2391",
      "procedure_name": "Composite Filling - 1 surface",
      "description": "Occlusal composite restoration on lower left first molar",
      "amount": 250.00,
      "status": "completed",
      "performed_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "performed_date": "2026-05-20",
      "created_at": "2026-05-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### `POST /treatments`
Record new treatment.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "tooth_number": "36",
  "procedure_code": "D2391",
  "procedure_name": "Composite Filling - 1 surface",
  "description": "Occlusal composite restoration on lower left first molar. Shade A2 used.",
  "amount": 250.00,
  "status": "completed",
  "performed_date": "2026-05-28"
}
```

**Validation Rules:**
- `patient_id`: Required
- `appointment_id`: Optional
- `tooth_number`: Required, valid FDI notation (11-18, 21-28, 31-38, 41-48) or "general"
- `procedure_name`: Required, 1-200 chars
- `description`: Optional, max 1000 chars
- `amount`: Optional, decimal with 2 places, non-negative
- `status`: Required
- `performed_date`: Required, not in future

**Response `201`:**
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "tooth_number": "36",
  "procedure_code": "D2391",
  "procedure_name": "Composite Filling - 1 surface",
  "description": "Occlusal composite restoration on lower left first molar. Shade A2 used.",
  "amount": 250.00,
  "status": "completed",
  "performed_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "performed_date": "2026-05-28",
  "created_at": "2026-05-28T14:45:00Z"
}
```

---

### `GET /treatments/{treatment_id}`
Get specific treatment.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "first_name": "Sarah",
    "last_name": "Connor-Smith"
  },
  "appointment_id": "uuid",
  "appointment_date": "2026-05-28",
  "tooth_number": "36",
  "procedure_code": "D2391",
  "procedure_name": "Composite Filling - 1 surface",
  "description": "Occlusal composite restoration on lower left first molar. Shade A2 used.",
  "amount": 250.00,
  "status": "completed",
  "performed_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "performed_date": "2026-05-28",
  "created_at": "2026-05-28T14:45:00Z",
  "updated_at": "2026-05-28T14:45:00Z"
}
```

---

### `PUT /treatments/{treatment_id}`
Update treatment.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "tooth_number": "36",
  "procedure_name": "Composite Filling - 2 surfaces",
  "description": "MOD composite restoration on lower left first molar",
  "amount": 350.00,
  "status": "completed",
  "performed_date": "2026-05-28"
}
```

**Response `200`:`
```json
{
  "id": "uuid",
  "tooth_number": "36",
  "procedure_name": "Composite Filling - 2 surfaces",
  "description": "MOD composite restoration on lower left first molar",
  "amount": 350.00,
  "status": "completed",
  "updated_at": "2026-05-28T16:30:00Z"
}
```

---

### `DELETE /treatments/{treatment_id}`
Delete treatment.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Response `200`:`
```json
{
  "message": "Treatment deleted successfully"
}
```

---

## 7. Documents

### `GET /documents`
List documents with filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `patient_id` | uuid | optional | Filter by patient |
| `appointment_id` | uuid | optional | Filter by appointment |
| `document_type` | string | optional | `xray`, `photo`, `consent_form`, `prescription`, `lab_report`, `other` |
| `uploaded_by` | uuid | optional | Filter by uploader |
| `date_from` | date | optional | Upload date range start |
| `date_to` | date | optional | Upload date range end |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:`
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "first_name": "Sarah",
        "last_name": "Connor-Smith"
      },
      "appointment_id": "uuid",
      "treatment_id": "uuid",
      "document_type": "xray",
      "file_name": "bitewing_right_side.jpg",
      "file_size": 2450000,
      "mime_type": "image/jpeg",
      "uploaded_by": {
        "id": "uuid",
        "full_name": "Dr. Smith"
      },
      "uploaded_at": "2026-05-20T11:00:00Z",
      "notes": "Right bitewing radiograph",
      "download_url": "https://supabase.co/storage/v1/object/signed/..."
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 120,
    "total_pages": 6
  }
}
```

---

### `POST /documents/upload`
Upload new document.

**Headers:** `Authorization: Bearer <access_token>`  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `file` | file | Yes | Document file |
| `patient_id` | string | Yes | UUID of patient |
| `appointment_id` | string | No | UUID of appointment |
| `treatment_id` | string | No | UUID of treatment |
| `document_type` | string | Yes | `xray`, `photo`, `consent_form`, `prescription`, `lab_report`, `other` |
| `notes` | string | No | Additional notes |

**File Validation:**
- Max size: 50MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/dicom`, `application/pdf`
- File name sanitized before storage

**Response `201`:**
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "treatment_id": "uuid",
  "document_type": "xray",
  "file_name": "bitewing_right_side.jpg",
  "file_size": 2450000,
  "mime_type": "image/jpeg",
  "uploaded_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "uploaded_at": "2026-05-28T15:00:00Z",
  "notes": "Right bitewing radiograph",
  "download_url": "https://supabase.co/storage/v1/object/signed/..."
}
```

**Error `413`:**
```json
{
  "detail": "File size exceeds maximum allowed size of 50MB"
}
```

**Error `415`:**
```json
{
  "detail": "File type 'application/exe' is not allowed. Allowed types: image/jpeg, image/png, image/dicom, application/pdf"
}
```

---

### `GET /documents/{document_id}`
Get document metadata.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "first_name": "Sarah",
    "last_name": "Connor-Smith"
  },
  "appointment_id": "uuid",
  "treatment_id": "uuid",
  "document_type": "xray",
  "file_name": "bitewing_right_side.jpg",
  "file_size": 2450000,
  "mime_type": "image/jpeg",
  "uploaded_by": {
    "id": "uuid",
    "full_name": "Dr. Smith"
  },
  "uploaded_at": "2026-05-20T11:00:00Z",
  "notes": "Right bitewing radiograph",
  "download_url": "https://supabase.co/storage/v1/object/signed/..."
}
```

---

### `GET /documents/{document_id}/download`
Download/stream document file.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:** Binary file stream with proper `Content-Type` and `Content-Disposition` headers.

---

### `DELETE /documents/{document_id}`
Delete document.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Response `200`:**
```json
{
  "message": "Document deleted successfully"
}
```

---

### `GET /documents/{document_id}/thumbnail`
Get thumbnail/preview for image documents.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:** Resized image (max 400px) for gallery/preview views.

**Note:** Only works for image MIME types. Returns `400` for non-image files.

---

## 8. Communications & Reminders

### `GET /communications`
List communication logs.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `patient_id` | uuid | optional | Filter by patient |
| `appointment_id` | uuid | optional | Filter by appointment |
| `communication_type` | string | optional | `sms`, `email` |
| `status` | string | optional | `sent`, `delivered`, `failed` |
| `date_from` | date | optional | Range start |
| `date_to` | date | optional | Range end |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "first_name": "Sarah",
        "last_name": "Connor-Smith"
      },
      "appointment_id": "uuid",
      "communication_type": "sms",
      "direction": "outbound",
      "message_content": "Hi Sarah, reminder: dental checkup tomorrow at 10:00 AM. Reply CONFIRM to confirm.",
      "status": "delivered",
      "sent_at": "2026-05-27T10:00:00Z",
      "created_by": {
        "id": "uuid",
        "full_name": "System"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 350,
    "total_pages": 18
  }
}
```

---

### `POST /communications/send`
Send manual communication to patient.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "communication_type": "sms",
  "message_content": "Hi Sarah, your appointment has been rescheduled to June 16 at 3:00 PM. Please confirm."
}
```

**Validation Rules:**
- `patient_id`: Required, must have valid phone for SMS or email for email
- `communication_type`: Required, `sms` or `email`
- `message_content`: Required, max 160 chars for SMS, max 2000 chars for email

**Response `201`:`
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "communication_type": "sms",
  "direction": "outbound",
  "message_content": "Hi Sarah, your appointment has been rescheduled to June 16 at 3:00 PM. Please confirm.",
  "status": "sent",
  "sent_at": "2026-05-28T15:30:00Z",
  "created_by": {
    "id": "uuid",
    "full_name": "Jane Doe"
  }
}
```

**Error `400`:**
```json
{
  "detail": "Patient does not have a phone number on file"
}
```

---

### `POST /communications/reminders/trigger`
Manually trigger reminder for specific appointment.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "appointment_id": "uuid",
  "reminder_config_id": "uuid"
}
```

**Response `200`:`
```json
{
  "message": "Reminder sent successfully",
  "communication_id": "uuid",
  "status": "sent"
}
```

---

### `POST /communications/reminders/bulk`
Bulk trigger reminders for all tomorrow's appointments.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "message": "Bulk reminders triggered",
  "total_appointments": 18,
  "reminders_sent": 16,
  "reminders_failed": 2,
  "failures": [
    {
      "appointment_id": "uuid",
      "patient_name": "Mike Johnson",
      "reason": "No phone number on file"
    }
  ]
}
```

---

### `GET /reminders/configs`
List reminder configurations.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "24hr_before_sms",
      "hours_before_appointment": 24,
      "communication_type": "sms",
      "template": "Hi {{patient_name}}, reminder: your {{appointment_type}} appointment is tomorrow at {{appointment_time}}. Reply CONFIRM to confirm or call us to reschedule.",
      "is_active": true
    },
    {
      "id": "uuid",
      "name": "1hr_before_sms",
      "hours_before_appointment": 1,
      "communication_type": "sms",
      "template": "Hi {{patient_name}}, your appointment is in 1 hour at {{appointment_time}}. See you soon!",
      "is_active": true
    },
    {
      "id": "uuid",
      "name": "24hr_before_email",
      "hours_before_appointment": 24,
      "communication_type": "email",
      "template": "Dear {{patient_name}},\n\nThis is a reminder...",
      "is_active": false
    }
  ]
}
```

---

### `POST /reminders/configs`
Create reminder configuration.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "name": "48hr_before_sms",
  "hours_before_appointment": 48,
  "communication_type": "sms",
  "template": "Hi {{patient_name}}, you have a {{appointment_type}} appointment in 2 days at {{appointment_time}}. Please confirm or reschedule.",
  "is_active": true
}
```

**Response `201`:`
```json
{
  "id": "uuid",
  "name": "48hr_before_sms",
  "hours_before_appointment": 48,
  "communication_type": "sms",
  "template": "Hi {{patient_name}}, you have a {{appointment_type}} appointment in 2 days at {{appointment_time}}. Please confirm or reschedule.",
  "is_active": true,
  "created_at": "2026-05-28T16:00:00Z"
}
```

---

### `PUT /reminders/configs/{config_id}`
Update reminder configuration.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "template": "Updated template...",
  "is_active": false
}
```

**Response `200`:`
```json
{
  "id": "uuid",
  "template": "Updated template...",
  "is_active": false,
  "updated_at": "2026-05-28T16:30:00Z"
}
```

---

### `DELETE /reminders/configs/{config_id}`
Delete reminder configuration.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Response `200`:`
```json
{
  "message": "Reminder configuration deleted successfully"
}
```

---

## 9. Analytics & Dashboard

### `GET /dashboard/summary`
Get dashboard summary for today.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "date": "2026-05-28",
  "appointments": {
    "total": 18,
    "scheduled": 12,
    "confirmed": 3,
    "checked_in": 2,
    "in_progress": 1,
    "completed": 0,
    "cancelled": 0,
    "no_show": 0
  },
  "financial": {
    "total_amount_today": 2500.00,
    "total_amount_this_week": 12500.00,
    "total_amount_this_month": 45000.00
  },
  "patients": {
    "total_active": 1050,
    "new_this_month": 25,
    "total_appointments_this_month": 320
  }
}
```

---

### `GET /analytics/revenue`
Get revenue analytics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `period` | string | `monthly` | `daily`, `weekly`, `monthly`, `yearly` |
| `date_from` | date | optional | Range start |
| `date_to` | date | optional | Range end |
| `group_by` | string | `procedure` | `procedure`, `tooth`, `month` |

**Response `200`:`
```json
{
  "period": "monthly",
  "date_from": "2026-01-01",
  "date_to": "2026-05-31",
  "total_revenue": 225000.00,
  "data": [
    {
      "month": "2026-01",
      "revenue": 42000.00,
      "appointment_count": 95
    },
    {
      "month": "2026-02",
      "revenue": 38500.00,
      "appointment_count": 88
    },
    {
      "month": "2026-03",
      "revenue": 51000.00,
      "appointment_count": 105
    },
    {
      "month": "2026-04",
      "revenue": 48500.00,
      "appointment_count": 98
    },
    {
      "month": "2026-05",
      "revenue": 45000.00,
      "appointment_count": 92
    }
  ]
}
```

---

### `GET /analytics/procedures`
Get procedure frequency analytics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Description |
|:---|:---|:---|:---|
| `date_from` | date | optional | Range start |
| `date_to` | date | optional | Range end |
| `limit` | integer | 10 | Top procedures |

**Response `200`:`
```json
{
  "data": [
    {
      "procedure_name": "Prophylaxis - Adult",
      "count": 245,
      "total_amount": 36750.00,
      "average_amount": 150.00
    },
    {
      "procedure_name": "Composite Filling - 1 surface",
      "count": 180,
      "total_amount": 45000.00,
      "average_amount": 250.00
    },
    {
      "procedure_name": "Root Canal - Molar",
      "count": 45,
      "total_amount": 54000.00,
      "average_amount": 1200.00
    },
    {
      "procedure_name": "Crown - Porcelain",
      "count": 30,
      "total_amount": 36000.00,
      "average_amount": 1200.00
    },
    {
      "procedure_name": "Extraction - Simple",
      "count": 55,
      "total_amount": 11000.00,
      "average_amount": 200.00
    }
  ]
}
```

---

### `GET /analytics/patients`
Get patient demographics analytics.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "total_patients": 1050,
  "active_patients": 980,
  "inactive_patients": 70,
  "new_patients_this_month": 25,
  "new_patients_this_year": 150,
  "age_distribution": [
    {"range": "0-18", "count": 120},
    {"range": "19-30", "count": 250},
    {"range": "31-50", "count": 380},
    {"range": "51-70", "count": 220},
    {"range": "71+", "count": 80}
  ],
  "gender_distribution": [
    {"gender": "male", "count": 520},
    {"gender": "female", "count": 530}
  ],
  "visit_frequency": {
    "average_visits_per_year": 2.3,
    "patients_with_multiple_visits": 680
  }
}
```

---

## 10. Settings & Configuration

### `GET /settings/clinic`
Get clinic settings.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "clinic_name": "Smile Dental Care",
  "address": "123 Main St, City, State 12345",
  "phone": "+1234567890",
  "email": "info@smiledental.com",
  "working_hours": {
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "17:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": {"start": "09:00", "end": "14:00"},
    "saturday": null,
    "sunday": null
  },
  "appointment_durations": {
    "checkup": 30,
    "cleaning": 45,
    "filling": 60,
    "extraction": 45,
    "root_canal": 90,
    "crown": 90,
    "consultation": 30
  }
}
```

---

### `PUT /settings/clinic`
Update clinic settings.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "clinic_name": "Smile Dental Care & Implant Center",
  "address": "456 New Address, City, State 12345",
  "phone": "+1234567890",
  "email": "info@smiledental.com",
  "working_hours": {
    "monday": {"start": "08:00", "end": "18:00"},
    "tuesday": {"start": "08:00", "end": "18:00"},
    "wednesday": {"start": "08:00", "end": "18:00"},
    "thursday": {"start": "08:00", "end": "18:00"},
    "friday": {"start": "08:00", "end": "14:00"},
    "saturday": {"start": "09:00", "end": "13:00"},
    "sunday": null
  },
  "appointment_durations": {
    "checkup": 30,
    "cleaning": 45,
    "filling": 60,
    "extraction": 45,
    "root_canal": 90,
    "crown": 90,
    "consultation": 20
  }
}
```

**Response `200`:`
```json
{
  "clinic_name": "Smile Dental Care & Implant Center",
  "address": "456 New Address, City, State 12345",
  "working_hours": {
    "monday": {"start": "08:00", "end": "18:00"},
    "tuesday": {"start": "08:00", "end": "18:00"},
    "wednesday": {"start": "08:00", "end": "18:00"},
    "thursday": {"start": "08:00", "end": "18:00"},
    "friday": {"start": "08:00", "end": "14:00"},
    "saturday": {"start": "09:00", "end": "13:00"},
    "sunday": null
  },
  "updated_at": "2026-05-28T17:00:00Z"
}
```

---

### `GET /settings/procedures`
List configured procedure codes.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200`:`
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "D0120",
      "name": "Periodic Oral Evaluation",
      "default_amount": 75.00,
      "default_duration_minutes": 30,
      "category": "diagnostic",
      "is_active": true
    },
    {
      "id": "uuid",
      "code": "D1110",
      "name": "Prophylaxis - Adult",
      "default_amount": 150.00,
      "default_duration_minutes": 45,
      "category": "preventive",
      "is_active": true
    },
    {
      "id": "uuid",
      "code": "D2391",
      "name": "Composite Filling - 1 surface",
      "default_amount": 250.00,
      "default_duration_minutes": 45,
      "category": "restorative",
      "is_active": true
    }
  ]
}
```

---

### `POST /settings/procedures`
Add procedure code.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "code": "D2750",
  "name": "Crown - Porcelain/Ceramic",
  "default_amount": 1200.00,
  "default_duration_minutes": 90,
  "category": "restorative"
}
```

**Response `201`:`
```json
{
  "id": "uuid",
  "code": "D2750",
  "name": "Crown - Porcelain/Ceramic",
  "default_amount": 1200.00,
  "default_duration_minutes": 90,
  "category": "restorative",
  "is_active": true,
  "created_at": "2026-05-28T17:30:00Z"
}
```

---

### `PUT /settings/procedures/{procedure_id}`
Update procedure code.

**Headers:** `Authorization: Bearer <access_token>`  
**Role Required:** `dentist`

**Request Body:**
```json
{
  "default_amount": 1300.00,
  "is_active": false
}
```

**Response `200`:`
```json
{
  "id": "uuid",
  "default_amount": 1300.00,
  "is_active": false,
  "updated_at": "2026-05-28T17:45:00Z"
}
```

---

## 11. Common HTTP Responses

### Authentication Errors
```json
// 401 Unauthorized
{
  "detail": "Not authenticated"
}

// 401 Token Expired
{
  "detail": "Token has expired"
}

// 403 Forbidden
{
  "detail": "You do not have permission to perform this action"
}
```

### Validation Errors
```json
// 422 Unprocessable Entity
{
  "detail": [
    {
      "loc": ["body", "first_name"],
      "msg": "field required",
      "type": "value_error.missing"
    },
    {
      "loc": ["body", "phone"],
      "msg": "invalid phone format",
      "type": "value_error"
    }
  ]
}
```

### Not Found
```json
// 404 Not Found
{
  "detail": "Resource not found"
}
```

### Rate Limiting
```json
// 429 Too Many Requests
{
  "detail": "Rate limit exceeded. Try again in 60 seconds."
}
```

### Server Error
```json
// 500 Internal Server Error
{
  "detail": "An unexpected error occurred"
}
```

---

## 12. API-wide Headers

### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### Response Headers
```
Content-Type: application/json
X-Request-ID: <uuid>
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622200000
```

---

## API Endpoint Summary (Quick Reference)

| Method | Endpoint | Auth | Role | Description |
|:---|:---|:---|:---|:---|
| **Auth** | | | | |
| POST | `/auth/login` | No | - | Login |
| POST | `/auth/refresh` | No | - | Refresh token |
| POST | `/auth/forgot-password` | No | - | Request reset |
| POST | `/auth/reset-password` | No | - | Reset password |
| GET | `/auth/me` | Yes | Any | Current user |
| PUT | `/auth/me` | Yes | Any | Update profile |
| PUT | `/auth/change-password` | Yes | Any | Change password |
| **Users** | | | | |
| GET | `/users` | Yes | Dentist | List users |
| POST | `/users` | Yes | Dentist | Create user |
| GET | `/users/{id}` | Yes | Dentist | Get user |
| PUT | `/users/{id}` | Yes | Dentist | Update user |
| DELETE | `/users/{id}` | Yes | Dentist | Deactivate user |
| POST | `/users/{id}/reset-password` | Yes | Dentist | Admin reset password |
| **Patients** | | | | |
| GET | `/patients` | Yes | Any | List/search patients |
| POST | `/patients` | Yes | Any | Register patient |
| GET | `/patients/search/quick` | Yes | Any | Quick search |
| GET | `/patients/{id}` | Yes | Any | Get patient |
| PUT | `/patients/{id}` | Yes | Any | Update patient |
| DELETE | `/patients/{id}` | Yes | Any | Deactivate patient |
| GET | `/patients/{id}/appointments` | Yes | Any | Patient appointments |
| GET | `/patients/{id}/treatments` | Yes | Any | Patient treatments |
| GET | `/patients/{id}/clinical-notes` | Yes | Any | Patient SOAP notes |
| GET | `/patients/{id}/documents` | Yes | Any | Patient documents |
| **Appointments** | | | | |
| GET | `/appointments` | Yes | Any | List appointments |
| POST | `/appointments` | Yes | Any | Create appointment |
| GET | `/appointments/calendar` | Yes | Any | Calendar view |
| GET | `/appointments/stats/daily` | Yes | Any | Daily stats |
| GET | `/appointments/slots/available` | Yes | Any | Available slots |
| GET | `/appointments/{id}` | Yes | Any | Get appointment |
| PUT | `/appointments/{id}` | Yes | Any | Update appointment |
| DELETE | `/appointments/{id}` | Yes | Any | Cancel appointment |
| PATCH | `/appointments/{id}/status` | Yes | Any | Update status |
| **Clinical Notes** | | | | |
| GET | `/clinical-notes` | Yes | Any | List notes |
| POST | `/clinical-notes` | Yes | Dentist | Create note |
| GET | `/clinical-notes/{id}` | Yes | Any | Get note |
| PUT | `/clinical-notes/{id}` | Yes | Dentist | Update note |
| DELETE | `/clinical-notes/{id}` | Yes | Dentist | Delete note |
| **Treatments** | | | | |
| GET | `/treatments` | Yes | Any | List treatments |
| POST | `/treatments` | Yes | Dentist | Record treatment |
| GET | `/treatments/{id}` | Yes | Any | Get treatment |
| PUT | `/treatments/{id}` | Yes | Dentist | Update treatment |
| DELETE | `/treatments/{id}` | Yes | Dentist | Delete treatment |
| **Documents** | | | | |
| GET | `/documents` | Yes | Any | List documents |
| POST | `/documents/upload` | Yes | Any | Upload document |
| GET | `/documents/{id}` | Yes | Any | Get metadata |
| GET | `/documents/{id}/download` | Yes | Any | Download file |
| GET | `/documents/{id}/thumbnail` | Yes | Any | Get thumbnail |
| DELETE | `/documents/{id}` | Yes | Dentist | Delete document |
| **Communications** | | | | |
| GET | `/communications` | Yes | Any | List communications |
| POST | `/communications/send` | Yes | Any | Send message |
| POST | `/communications/reminders/trigger` | Yes | Any | Trigger reminder |
| POST | `/communications/reminders/bulk` | Yes | Any | Bulk reminders |
| GET | `/reminders/configs` | Yes | Any | List configs |
| POST | `/reminders/configs` | Yes | Dentist | Create config |
| PUT | `/reminders/configs/{id}` | Yes | Dentist | Update config |
| DELETE | `/reminders/configs/{id}` | Yes | Dentist | Delete config |
| **Dashboard & Analytics** | | | | |
| GET | `/dashboard/summary` | Yes | Any | Dashboard |
| GET | `/analytics/revenue` | Yes | Any | Revenue analytics |
| GET | `/analytics/procedures` | Yes | Any | Procedure analytics |
| GET | `/analytics/patients` | Yes | Any | Patient analytics |
| **Settings** | | | | |
| GET | `/settings/clinic` | Yes | Any | Get settings |
| PUT | `/settings/clinic` | Yes | Dentist | Update settings |
| GET | `/settings/procedures` | Yes | Any | List procedures |
| POST | `/settings/procedures` | Yes | Dentist | Add procedure |
| PUT | `/settings/procedures/{id}` | Yes | Dentist | Update procedure |

---

*End of API Specification — Total: 65 Endpoints*