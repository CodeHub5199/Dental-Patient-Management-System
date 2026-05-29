"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Activity,
  FileText,
  Folder,
  MessageSquare,
  ChevronRight,
  Stethoscope,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Patient, ClinicalNote, Treatment, AppointmentWithPatient, Document, DocumentType } from "@/types";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
import { DeactivatePatientDialog } from "@/components/patients/DeactivatePatientDialog";
import { DocumentTypeFilter } from "@/components/documents/DocumentTypeFilter";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { DocumentViewerModal } from "@/components/documents/DocumentViewerModal";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

const APPT_STATUS_PILL: Record<string, string> = {
  scheduled:   "bg-gray-100 text-gray-700",
  confirmed:   "bg-blue-100 text-blue-700",
  checked_in:  "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
  no_show:     "bg-orange-100 text-orange-700",
};

const TX_STATUS_PILL: Record<string, string> = {
  planned:     "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed:   "bg-green-100 text-green-800",
};

// ─── Tab: Appointments ────────────────────────────────────────────────────────

function AppointmentsTab({ patientId }: { patientId: string }) {
  const [appointments, setAppointments] = useState<AppointmentWithPatient[] | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: AppointmentWithPatient[] }>(
        `/appointments?patient_id=${patientId}&per_page=50&sort_by=date_desc`
      )
      .then((res) => setAppointments(res.data.data))
      .catch(() => toast.error("Failed to load appointments"));
  }, [patientId]);

  if (appointments === null)
    return <div className="py-8 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>;

  if (appointments.length === 0)
    return <div className="py-10 text-center text-sm text-muted-foreground">No appointments on record.</div>;

  return (
    <div className="divide-y">
      {appointments.map((a) => (
        <Link
          key={a.id}
          href={`/appointments/${a.id}`}
          className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 rounded transition-colors group"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">{a.appointment_type.replace(/_/g, " ")}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${APPT_STATUS_PILL[a.status] ?? ""}`}>
                {a.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(a.appointment_date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </Link>
      ))}
    </div>
  );
}

// ─── Tab: Treatments ──────────────────────────────────────────────────────────

function TreatmentsTab({ patientId }: { patientId: string }) {
  const [treatments, setTreatments] = useState<Treatment[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    apiClient
      .get<{ data: Treatment[] }>(`/treatments?patient_id=${patientId}&per_page=100`)
      .then((res) => setTreatments(res.data.data))
      .catch(() => toast.error("Failed to load treatments"));
  }, [patientId]);

  if (treatments === null)
    return <div className="py-8 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>;

  const filtered = statusFilter === "all"
    ? treatments
    : treatments.filter((t) => t.status === statusFilter);

  if (treatments.length === 0)
    return <div className="py-10 text-center text-sm text-muted-foreground">No treatments on record.</div>;

  return (
    <div className="space-y-3">
      {/* Status filter */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", "planned", "in_progress", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No treatments match this filter.</div>
      ) : (
        <div className="divide-y">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-start gap-3 py-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{t.procedure_name}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    Tooth: {t.tooth_number === "general" ? "General" : t.tooth_number}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${TX_STATUS_PILL[t.status] ?? ""}`}>
                    {t.status.replace("_", " ")}
                  </span>
                  {t.amount != null && (
                    <span className="text-xs font-medium text-gray-700">{formatCurrency(Number(t.amount))}</span>
                  )}
                </div>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                <p className="text-xs text-muted-foreground">{formatDate(t.performed_date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Clinical Notes ──────────────────────────────────────────────────────

function ClinicalNotesTab({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<ClinicalNote[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: ClinicalNote[] }>(`/clinical-notes?patient_id=${patientId}&per_page=100`)
      .then((res) => setNotes(res.data.data))
      .catch(() => toast.error("Failed to load clinical notes"));
  }, [patientId]);

  if (notes === null)
    return <div className="py-8 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>;

  if (notes.length === 0)
    return <div className="py-10 text-center text-sm text-muted-foreground">No clinical notes on record.</div>;

  return (
    <div className="divide-y">
      {notes.map((n) => {
        const isOpen = expandedId === n.id;
        return (
          <div key={n.id} className="py-3">
            <button
              className="w-full flex items-center justify-between text-left group"
              onClick={() => setExpandedId(isOpen ? null : n.id)}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  SOAP Note — {formatDate(n.created_at)}
                </p>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{n.subjective}</p>
                )}
              </div>
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ml-3 ${isOpen ? "rotate-90" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="mt-3 grid gap-3">
                {(
                  [
                    ["Subjective (S)", n.subjective],
                    ["Objective (O)", n.objective],
                    ["Assessment (A)", n.assessment],
                    ["Plan (P)", n.plan],
                  ] as [string, string][]
                ).map(([label, text]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
                  </div>
                ))}
                {n.appointment_id && (
                  <div className="pt-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/appointments/${n.appointment_id}/chart`}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> View Full Chart
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab({ patientId, isDentist }: { patientId: string; isDentist: boolean }) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  useEffect(() => {
    const url =
      typeFilter === "all"
        ? `/documents?patient_id=${patientId}&per_page=100`
        : `/documents?patient_id=${patientId}&document_type=${typeFilter}&per_page=100`;
    apiClient
      .get<{ data: Document[] }>(url)
      .then((res) => setDocuments(res.data.data))
      .catch(() => toast.error("Failed to load documents"));
  }, [patientId, typeFilter]);

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => (prev ? [doc, ...prev] : [doc]));
  };

  const handleDeleted = (id: string) => {
    setDocuments((prev) => (prev ? prev.filter((d) => d.id !== id) : null));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DocumentTypeFilter value={typeFilter} onChange={setTypeFilter} />
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          Upload
        </Button>
      </div>

      {documents === null ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Folder className="h-8 w-8 text-muted-foreground/40" />
          <p>No documents uploaded for this patient.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isDentist={isDentist}
              onView={setViewingDoc}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        patientId={patientId}
        onUploaded={handleUploaded}
      />
      <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isDentist = user?.role === "dentist";

  const [patient,        setPatient]        = useState<Patient | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [editOpen,       setEditOpen]       = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Patient>(`/patients/${params.id}`);
      setPatient(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        toast.error("Patient not found");
        router.push("/patients");
      } else {
        toast.error("Failed to load patient");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!patient) return null;

  const stats = patient.stats;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/patients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h1>
              <Badge variant={patient.is_active ? "success" : "secondary"}>
                {patient.is_active ? "Active" : "Inactive"}
              </Badge>
              {patient.medical_notes && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Medical Alert
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              DOB: {formatDate(patient.date_of_birth)}
              {patient.gender ? ` · ${GENDER_LABELS[patient.gender] ?? patient.gender}` : ""}
              {" · "}Registered {formatDate(patient.registration_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {patient.is_active ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          ) : isDentist ? (
            <Button variant="outline" onClick={() => setDeactivateOpen(true)}>
              Reactivate
            </Button>
          ) : null}
        </div>
      </div>

      {/* Medical alert box */}
      {patient.medical_notes && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900 text-sm">Medical Alert</p>
            <p className="text-amber-800 text-sm mt-1 whitespace-pre-wrap">
              {patient.medical_notes}
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_appointments ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Treatments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_treatments ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? formatCurrency(stats.total_amount) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-base">
              {stats?.last_visit_date ? formatDate(stats.last_visit_date) : "No visits"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact + Emergency */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{patient.phone}</span>
            </div>
            {patient.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{patient.email}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{patient.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.emergency_contact ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {patient.emergency_contact.name}
                    {patient.emergency_contact.relationship && (
                      <span className="text-muted-foreground">
                        {" "}({patient.emergency_contact.relationship})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{patient.emergency_contact.phone}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emergency contact on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed history section */}
      <Tabs defaultValue="appointments">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none gap-0">
          {[
            { value: "appointments",    icon: Calendar,     label: "Appointments"   },
            { value: "treatments",      icon: Activity,     label: "Treatments"     },
            { value: "clinical-notes",  icon: FileText,     label: "Clinical Notes" },
            { value: "documents",       icon: Folder,       label: "Documents"      },
            { value: "communications",  icon: MessageSquare, label: "Communications" },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <AppointmentsTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="treatments" className="mt-4">
          <TreatmentsTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="clinical-notes" className="mt-4">
          <ClinicalNotesTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab patientId={patient.id} isDentist={isDentist} />
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p>Communications will be available in a future sprint.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSuccess={(updated) => setPatient({ ...patient, ...updated })}
      />
      <DeactivatePatientDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        patient={patient}
        mode={patient.is_active ? "deactivate" : "reactivate"}
        onSuccess={(updated) => setPatient(updated)}
      />
    </div>
  );
}
