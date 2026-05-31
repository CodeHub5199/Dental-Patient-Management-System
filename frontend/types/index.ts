// ─── Auth & Users ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "dentist" | "receptionist";
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ─── Patients ─────────────────────────────────────────────────────────────────
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface PatientStats {
  total_appointments: number;
  total_treatments: number;
  total_amount: number;
  last_visit_date: string | null;
  upcoming_appointment: {
    id: string;
    date: string;
    time: string;
    type: string;
  } | null;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  emergency_contact: EmergencyContact | null;
  medical_notes: string | null;
  is_active: boolean;
  registration_date: string;
  created_at: string;
  updated_at: string;
  stats?: PatientStats;
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export const APPOINTMENT_TYPES = [
  "consultation",
  "checkup",
  "cleaning",
  "filling",
  "extraction",
  "root_canal",
  "crown",
  "bridge",
  "x-ray",
  "whitening",
  "denture",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  status: AppointmentStatus;
  appointment_type: string;
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithPatient extends Appointment {
  patient_name: string;
  patient_phone: string;
  color?: string;
}

export interface PaginatedAppointments {
  data: AppointmentWithPatient[];
  summary: Record<string, number>;
  pagination: Pagination;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
}

// ─── Clinical Notes ───────────────────────────────────────────────────────────
export interface ClinicalNote {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Treatments ───────────────────────────────────────────────────────────────
export interface Treatment {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  tooth_number: string;
  procedure_code: string | null;
  procedure_name: string;
  description: string | null;
  amount: number | null;
  status: "planned" | "in_progress" | "completed";
  performed_by: string;
  performed_date: string;
  created_at: string;
  updated_at: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type DocumentType =
  | "xray"
  | "photo"
  | "consent_form"
  | "prescription"
  | "lab_report"
  | "other";

export interface Document {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  treatment_id: string | null;
  document_type: DocumentType;
  file_name: string;
  file_size: number;
  mime_type: string;
  notes: string | null;
  has_thumbnail: boolean;
  uploaded_by: string;
  uploader_name: string;
  uploaded_at: string;
  download_url?: string;
  thumbnail_url?: string;
}

// ─── Communications ───────────────────────────────────────────────────────────
export interface Communication {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  communication_type: "sms" | "email";
  direction: "outbound";
  message_content: string;
  status: "sent" | "delivered" | "failed";
  failure_reason: string | null;
  sent_at: string;
  delivered_at: string | null;
  created_by: string | null;
  is_automated: boolean;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface AppointmentCounts {
  total: number;
  scheduled: number;
  confirmed: number;
  checked_in: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DashboardSummary {
  date: string;
  appointments: AppointmentCounts;
  total_active_patients: number;
  new_patients_this_month: number;
  revenue_today: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface WorkingDayHours {
  start: string;
  end: string;
}

export interface WorkingHours {
  monday:    WorkingDayHours | null;
  tuesday:   WorkingDayHours | null;
  wednesday: WorkingDayHours | null;
  thursday:  WorkingDayHours | null;
  friday:    WorkingDayHours | null;
  saturday:  WorkingDayHours | null;
  sunday:    WorkingDayHours | null;
}

export interface ClinicSettings {
  id?: string;
  clinic_name: string;
  timezone: string;
  working_hours: Partial<WorkingHours>;
  slot_duration_minutes: number;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Procedure {
  id: string;
  code: string | null;
  name: string;
  default_amount: number | null;
  default_duration_minutes: number | null;
  category: string | null;
  is_active: boolean;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
