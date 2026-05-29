"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/scheduling/StatusBadge";
import { StatusWorkflowPanel } from "@/components/scheduling/StatusWorkflowPanel";
import type { AppointmentWithPatient } from "@/types";
import { APPOINTMENT_TYPES } from "@/types";

// ── Edit form schema ──────────────────────────────────────────────────────────

const editSchema = z
  .object({
    appointment_date: z.string().min(1, "Date required"),
    appointment_type: z.string().min(1, "Type required"),
    start_time:       z.string().min(1, "Start time required"),
    end_time:         z.string().min(1, "End time required"),
    notes:            z.string().optional(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type EditValues = z.infer<typeof editSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentWithPatient | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  // ── Fetch appointment ─────────────────────────────────────────────────────

  const fetchAppointment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AppointmentWithPatient>(`/appointments/${id}`);
      setAppointment(res.data);
    } catch {
      toast.error("Appointment not found");
      router.push("/appointments");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchAppointment(); }, [fetchAppointment]);

  // ── Edit form setup ───────────────────────────────────────────────────────

  const startEditing = () => {
    if (!appointment) return;
    reset({
      appointment_date: appointment.appointment_date,
      appointment_type: appointment.appointment_type,
      start_time:       appointment.start_time.slice(0, 5),
      end_time:         appointment.end_time.slice(0, 5),
      notes:            appointment.notes ?? "",
    });
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const onEdit = async (data: EditValues) => {
    try {
      const res = await apiClient.put<AppointmentWithPatient>(`/appointments/${id}`, {
        appointment_date: data.appointment_date,
        appointment_type: data.appointment_type,
        start_time:       data.start_time + ":00",
        end_time:         data.end_time   + ":00",
        notes:            data.notes || undefined,
      });
      setAppointment(res.data);
      setEditing(false);
      toast.success("Appointment updated");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to update appointment";
      toast.error(message);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (!appointment) return null;

  const canEdit = !["completed", "cancelled"].includes(appointment.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/appointments")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Appointments
        </Button>
      </div>

      {/* Page title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {appointment.patient_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(appointment.appointment_date)} &middot; {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Patient card */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Patient</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{appointment.patient_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {appointment.patient_phone}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${appointment.patient_id}`}>View Profile</Link>
          </Button>
        </div>
      </section>

      {/* Appointment details — view or edit */}
      <section className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</h2>
          {canEdit && !editing && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onEdit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...register("appointment_date")} />
                {errors.appointment_date && <p className="text-xs text-destructive">{errors.appointment_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  defaultValue={appointment.appointment_type}
                  onValueChange={(v) => setValue("appointment_type", v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.appointment_type && <p className="text-xs text-destructive">{errors.appointment_type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" {...register("start_time")} />
                {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" {...register("end_time")} />
                {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} {...register("notes")} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={cancelEditing} disabled={isSubmitting}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24 shrink-0">Date</span>
              <span className="font-medium">{formatDate(appointment.appointment_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24 shrink-0">Time</span>
              <span className="font-medium">
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
                {appointment.duration_minutes ? ` (${appointment.duration_minutes} min)` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24 shrink-0">Type</span>
              <span className="font-medium capitalize">{appointment.appointment_type}</span>
            </div>
            {appointment.notes && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground w-24 shrink-0">Notes</span>
                <span className="text-foreground">{appointment.notes}</span>
              </div>
            )}
          </dl>
        )}
      </section>

      <Separator />

      {/* Status workflow */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</h2>
        <StatusWorkflowPanel
          appointment={appointment}
          onStatusChanged={setAppointment}
        />
      </section>

      {/* Clinical chart link */}
      <section className="border rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Clinical Record</p>
          <p className="text-xs text-muted-foreground">SOAP notes and treatment records</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/appointments/${appointment.id}/chart`}>Open Chart</Link>
        </Button>
      </section>
    </div>
  );
}
