"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AppointmentWithPatient, AvailableSlot } from "@/types";
import { APPOINTMENT_TYPES } from "@/types";

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z
  .object({
    patient_id:       z.string().min(1, "Please select a patient"),
    appointment_date: z.string().min(1, "Date is required"),
    appointment_type: z.string().min(1, "Please select an appointment type"),
    start_time:       z.string().min(1, "Start time is required"),
    end_time:         z.string().min(1, "End time is required"),
    notes:            z.string().optional(),
  })
  .refine((d) => !d.start_time || !d.end_time || d.end_time > d.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type FormValues = z.infer<typeof schema>;

// ── Patient autocomplete types ────────────────────────────────────────────────

interface PatientResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

const HOURS   = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    if (!v) return { hour: "", minute: "", period: "AM" };
    const [h, m] = v.split(":").map(Number);
    return {
      hour:   String(h % 12 || 12),
      minute: m.toString().padStart(2, "0"),
      period: h >= 12 ? "PM" : "AM",
    };
  };

  const { hour, minute, period } = parse(value);

  const emit = (h: string, m: string, p: string) => {
    if (!h || !m) return;
    const hours24 = (parseInt(h) % 12) + (p === "PM" ? 12 : 0);
    onChange(`${hours24.toString().padStart(2, "0")}:${m}`);
  };

  return (
    <div className="flex gap-1">
      <Select value={hour} onValueChange={(h) => emit(h, minute, period)}>
        <SelectTrigger className="w-[64px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={minute} onValueChange={(m) => emit(hour, m, period)}>
        <SelectTrigger className="w-[64px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(p) => emit(hour, minute, p)}>
        <SelectTrigger className="w-[64px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PreselectedPatient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dentistId: string;
  initialDate?: string;   // "YYYY-MM-DD"
  initialTime?: string;   // "HH:MM"
  preselectedPatient?: PreselectedPatient;
  onSuccess: (appt: AppointmentWithPatient) => void;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  dentistId,
  initialDate,
  initialTime,
  preselectedPatient,
  onSuccess,
}: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      appointment_date: initialDate ?? todayStr,
      start_time:       initialTime ?? "",
    },
  });

  const selectedDate = watch("appointment_date");
  const startTime    = watch("start_time");
  const endTime      = watch("end_time");

  // Patient search
  const [patientQuery,    setPatientQuery]    = useState("");
  const [patientResults,  setPatientResults]  = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [patientOpen,     setPatientOpen]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Available slots
  const [slots,        setSlots]        = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      reset({ appointment_date: initialDate ?? todayStr, start_time: initialTime ?? "" });
      setPatientQuery("");
      setSelectedPatient(null);
      setSlots([]);
    } else {
      if (initialDate)  setValue("appointment_date", initialDate);
      if (initialTime)  setValue("start_time", initialTime);
      if (preselectedPatient) {
        setSelectedPatient(preselectedPatient);
        setPatientQuery(`${preselectedPatient.first_name} ${preselectedPatient.last_name}`);
        setValue("patient_id", preselectedPatient.id, { shouldValidate: true });
      }
    }
  }, [open, initialDate, initialTime, preselectedPatient, reset, setValue, todayStr]);

  const fetchSlots = useCallback(async (d: string) => {
    if (!d || !dentistId) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await apiClient.get<{ available_slots: AvailableSlot[] }>(
        "/appointments/slots/available",
        { params: { date: d, dentist_id: dentistId } },
      );
      setSlots(res.data.available_slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [dentistId]);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) { setPatientResults([]); setPatientOpen(false); return; }
    try {
      const res = await apiClient.get<{ data: PatientResult[] }>("/patients/search/quick", {
        params: { q, limit: 8 },
      });
      setPatientResults(res.data.data ?? []);
      setPatientOpen(true);
    } catch {
      setPatientResults([]);
    }
  }, []);

  const handlePatientInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setPatientQuery(q);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchPatients(q), 300);
  };

  const selectPatient = (p: PatientResult) => {
    setSelectedPatient(p);
    setPatientQuery(`${p.first_name} ${p.last_name}`);
    setPatientOpen(false);
    setValue("patient_id", p.id, { shouldValidate: true });
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientQuery("");
    setValue("patient_id", "");
  };

  // When a slot is selected, auto-fill start & end times
  const handleSlotSelect = (value: string) => {
    const [start, end] = value.split("|");
    setValue("start_time", start, { shouldValidate: true });
    setValue("end_time",   end,   { shouldValidate: true });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await apiClient.post<AppointmentWithPatient>("/appointments", {
        patient_id:       data.patient_id,
        dentist_id:       dentistId,
        appointment_date: data.appointment_date,
        start_time:       data.start_time + ":00",
        end_time:         data.end_time   + ":00",
        appointment_type: data.appointment_type,
        notes:            data.notes || undefined,
      });
      toast.success("Appointment booked successfully");
      onSuccess(res.data);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to book appointment";
      toast.error(message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Hidden patient_id */}
          <input type="hidden" {...register("patient_id")} />

          {/* Patient search */}
          <div className="space-y-1.5">
            <Label>Patient <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or phone…"
                value={patientQuery}
                onChange={handlePatientInput}
                onFocus={() => patientQuery.length >= 2 && setPatientOpen(true)}
                onBlur={() => setTimeout(() => setPatientOpen(false), 150)}
                className="pl-9 pr-8"
                disabled={!!preselectedPatient}
              />
              {patientQuery && (
                <button
                  type="button"
                  onClick={clearPatient}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {patientOpen && patientResults.length > 0 && (
              <div className="border rounded-md shadow-md bg-popover z-50 overflow-hidden">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between"
                    onMouseDown={() => selectPatient(p)}
                  >
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                    <span className="text-muted-foreground text-xs">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedPatient && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="text-foreground font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span> — {selectedPatient.phone}
              </p>
            )}
            {errors.patient_id && (
              <p className="text-xs text-destructive">{errors.patient_id.message}</p>
            )}
          </div>

          {/* Date + Type (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-date">Date <span className="text-destructive">*</span></Label>
              <Input
                id="appt-date"
                type="date"
                min={todayStr}
                {...register("appointment_date")}
              />
              {errors.appointment_date && (
                <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setValue("appointment_type", v, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.appointment_type && (
                <p className="text-xs text-destructive">{errors.appointment_type.message}</p>
              )}
            </div>
          </div>

          {/* Slot picker */}
          <div className="space-y-1.5">
            <Label>Available Slots</Label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
              </div>
            ) : slots.length > 0 ? (
              <Select onValueChange={handleSlotSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a slot…" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={`${s.start_time}|${s.end_time}`} value={`${s.start_time}|${s.end_time}`}>
                      {to12h(s.start_time)} – {to12h(s.end_time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedDate ? (
              <p className="text-xs text-muted-foreground">No standard slots available — set times manually below.</p>
            ) : null}
          </div>

          {/* Manual start/end times */}
          <input type="hidden" {...register("start_time")} />
          <input type="hidden" {...register("end_time")} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time <span className="text-destructive">*</span></Label>
              <TimePicker
                value={startTime}
                onChange={(v) => setValue("start_time", v, { shouldValidate: true })}
              />
              {errors.start_time && (
                <p className="text-xs text-destructive">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>End time <span className="text-destructive">*</span></Label>
              <TimePicker
                value={endTime}
                onChange={(v) => setValue("end_time", v, { shouldValidate: true })}
              />
              {errors.end_time && (
                <p className="text-xs text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Reason for visit, patient requests…"
              rows={2}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</>
              ) : (
                "Book Appointment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
