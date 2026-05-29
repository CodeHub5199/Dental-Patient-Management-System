"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Stethoscope, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SOAPNoteForm } from "@/components/clinical/SOAPNoteForm";
import { TreatmentFormDialog } from "@/components/clinical/TreatmentFormDialog";
import type { AppointmentWithPatient, ClinicalNote, Treatment } from "@/types";

const STATUS_PILL: Record<string, string> = {
  planned:     "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed:   "bg-green-100 text-green-800",
};

export default function ChartPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const isDentist = user?.role === "dentist";

  const [appt,       setAppt]       = useState<AppointmentWithPatient | null>(null);
  const [note,       setNote]       = useState<ClinicalNote | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [txDialogOpen,      setTxDialogOpen]      = useState(false);
  const [editingTreatment,  setEditingTreatment]  = useState<Treatment | null>(null);

  // ── Load all data in parallel ─────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, notesRes, txRes] = await Promise.all([
        apiClient.get<AppointmentWithPatient>(`/appointments/${id}`),
        apiClient.get<{ data: ClinicalNote[] }>(`/clinical-notes?appointment_id=${id}&per_page=1`),
        apiClient.get<{ data: Treatment[] }>(`/treatments?appointment_id=${id}&per_page=100`),
      ]);
      setAppt(apptRes.data);
      setNote(notesRes.data.data[0] ?? null);
      setTreatments(txRes.data.data);
    } catch {
      toast.error("Failed to load clinical record");
      router.push("/appointments");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // ── Treatment handlers ────────────────────────────────────────────────────

  const openAddTreatment = () => {
    setEditingTreatment(null);
    setTxDialogOpen(true);
  };

  const openEditTreatment = (t: Treatment) => {
    setEditingTreatment(t);
    setTxDialogOpen(true);
  };

  const handleTreatmentSaved = (saved: Treatment) => {
    setTreatments((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      return idx >= 0
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [...prev, saved];
    });
  };

  const handleDeleteTreatment = async (t: Treatment) => {
    try {
      await apiClient.delete(`/treatments/${t.id}`);
      setTreatments((prev) => prev.filter((tx) => tx.id !== t.id));
      toast.success("Treatment deleted");
    } catch {
      toast.error("Failed to delete treatment");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!appt) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/appointments/${id}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Appointment
        </Link>
      </Button>

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Clinical Chart</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {appt.patient_name}
          {" · "}
          {formatDate(appt.appointment_date)}
          {" · "}
          {formatTime(appt.start_time)}
          {" · "}
          <span className="capitalize">{appt.appointment_type.replace(/_/g, " ")}</span>
        </p>
      </div>

      {/* ── SOAP Note ─────────────────────────────────────────────────────── */}
      <section className="border rounded-lg">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">SOAP Note</h2>
          {!isDentist && (
            <span className="ml-auto text-xs text-muted-foreground italic">Read-only</span>
          )}
        </div>
        <div className="p-4">
          <SOAPNoteForm
            patientId={appt.patient_id}
            appointmentId={id}
            note={note}
            isDentist={isDentist}
            onSaved={setNote}
            onDeleted={() => setNote(null)}
          />
        </div>
      </section>

      <Separator />

      {/* ── Treatments ────────────────────────────────────────────────────── */}
      <section className="border rounded-lg">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Treatments & Procedures</h2>
          {isDentist && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs"
              onClick={openAddTreatment}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>

        <div className="divide-y">
          {treatments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isDentist
                ? "No treatments recorded. Click Add to record a procedure."
                : "No treatments recorded for this appointment."}
            </div>
          ) : (
            treatments.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.procedure_name}</span>
                    {t.procedure_code && (
                      <span className="text-xs text-muted-foreground font-mono">{t.procedure_code}</span>
                    )}
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      Tooth: {t.tooth_number === "general" ? "General" : t.tooth_number}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded capitalize ${STATUS_PILL[t.status] ?? ""}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                    {t.amount != null && (
                      <span className="text-xs font-medium text-gray-700">
                        {formatCurrency(Number(t.amount))}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(t.performed_date)}</p>
                </div>

                {isDentist && (
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditTreatment(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete treatment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            &quot;{t.procedure_name}&quot; will be permanently removed from this record.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTreatment(t)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Treatment dialog */}
      <TreatmentFormDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        patientId={appt.patient_id}
        appointmentId={id}
        treatment={editingTreatment}
        onSaved={handleTreatmentSaved}
      />
    </div>
  );
}
