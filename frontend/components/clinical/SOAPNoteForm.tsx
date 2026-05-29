"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ClinicalNote } from "@/types";

const MAX = 5000;

const soapSchema = z.object({
  subjective: z.string().min(10, "Minimum 10 characters").max(MAX, "Maximum 5000 characters"),
  objective:  z.string().min(10, "Minimum 10 characters").max(MAX, "Maximum 5000 characters"),
  assessment: z.string().min(10, "Minimum 10 characters").max(MAX, "Maximum 5000 characters"),
  plan:       z.string().min(10, "Minimum 10 characters").max(MAX, "Maximum 5000 characters"),
});

type SOAPValues = z.infer<typeof soapSchema>;

const SOAP_FIELDS: { key: keyof SOAPValues; label: string; hint: string }[] = [
  { key: "subjective", label: "Subjective (S)", hint: "Patient's complaint in their own words" },
  { key: "objective",  label: "Objective (O)",  hint: "Clinical findings and examination results" },
  { key: "assessment", label: "Assessment (A)", hint: "Diagnosis and clinical judgement" },
  { key: "plan",       label: "Plan (P)",       hint: "Treatment performed and next steps" },
];

interface Props {
  patientId:    string;
  appointmentId: string;
  note:         ClinicalNote | null;
  isDentist:    boolean;
  onSaved:      (note: ClinicalNote) => void;
  onDeleted:    () => void;
}

export function SOAPNoteForm({ patientId, appointmentId, note, isDentist, onSaved, onDeleted }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const defaultValues: SOAPValues = {
    subjective: note?.subjective ?? "",
    objective:  note?.objective  ?? "",
    assessment: note?.assessment ?? "",
    plan:       note?.plan       ?? "",
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SOAPValues>({ resolver: zodResolver(soapSchema), defaultValues });

  const values = watch();

  const onSubmit = async (data: SOAPValues) => {
    try {
      if (!note) {
        const res = await apiClient.post<ClinicalNote>("/clinical-notes", {
          patient_id:     patientId,
          appointment_id: appointmentId,
          ...data,
        });
        toast.success("SOAP note saved");
        onSaved(res.data);
      } else {
        const res = await apiClient.put<ClinicalNote>(`/clinical-notes/${note.id}`, data);
        toast.success("SOAP note updated");
        onSaved(res.data);
        setMode("view");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save note";
      toast.error(msg);
    }
  };

  const startEdit = () => {
    reset({
      subjective: note!.subjective,
      objective:  note!.objective,
      assessment: note!.assessment,
      plan:       note!.plan,
    });
    setMode("edit");
  };

  const cancelEdit = () => {
    setMode("view");
    reset(defaultValues);
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/clinical-notes/${note!.id}`);
      toast.success("SOAP note deleted");
      onDeleted();
    } catch {
      toast.error("Failed to delete note");
    }
  };

  // No note + receptionist
  if (!note && !isDentist) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No SOAP note recorded for this appointment.
      </div>
    );
  }

  // View mode (note exists)
  if (note && mode === "view") {
    return (
      <div className="space-y-4">
        {isDentist && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete clinical note?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. The SOAP note will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <div className="grid gap-4">
          {SOAP_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{note[key]}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Create or edit form
  const isCreate = !note;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {SOAP_FIELDS.map(({ key, label, hint }) => {
        const count = (values[key] ?? "").length;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {label} <span className="text-destructive">*</span>
              </Label>
              <span
                className={`text-xs ${
                  count > MAX * 0.9 ? "text-amber-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {count.toLocaleString()} / {MAX.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <Textarea
              {...register(key)}
              rows={4}
              maxLength={MAX}
              className={errors[key] ? "border-destructive" : ""}
            />
            {errors[key] && (
              <p className="text-xs text-destructive">{errors[key]?.message}</p>
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isCreate ? "Save SOAP Note" : "Update Note"}
        </Button>
        {!isCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isSubmitting}
          >
            <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
