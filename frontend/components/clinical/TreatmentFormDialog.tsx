"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Treatment } from "@/types";

// Mirror backend FDI set
const VALID_FDI = new Set([
  ...Array.from({ length: 4 }, (_, q) =>
    Array.from({ length: 8 }, (_, p) => `${q + 1}${p + 1}`)
  ).flat(),
  "general",
]);

const treatmentSchema = z.object({
  tooth_number:   z.string().min(1, "Required").refine(
    (v) => VALID_FDI.has(v.trim().toLowerCase()),
    "Use FDI notation (11–18, 21–28, 31–38, 41–48) or 'general'"
  ),
  procedure_name: z.string().min(1, "Required").max(200),
  procedure_code: z.string().max(20).optional(),
  description:    z.string().max(1000).optional(),
  amount:         z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number"
    ),
  status:         z.enum(["planned", "in_progress", "completed"]),
  performed_date: z.string().min(1, "Required"),
});

type TreatmentValues = z.infer<typeof treatmentSchema>;

const TODAY = new Date().toISOString().slice(0, 10);

interface Props {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  patientId:      string;
  appointmentId:  string;
  treatment:      Treatment | null;
  onSaved:        (treatment: Treatment) => void;
}

export function TreatmentFormDialog({
  open,
  onOpenChange,
  patientId,
  appointmentId,
  treatment,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TreatmentValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      tooth_number:   "general",
      procedure_name: "",
      status:         "completed",
      performed_date: TODAY,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (treatment) {
      reset({
        tooth_number:   treatment.tooth_number,
        procedure_name: treatment.procedure_name,
        procedure_code: treatment.procedure_code ?? "",
        description:    treatment.description ?? "",
        amount:         treatment.amount != null ? String(treatment.amount) : "",
        status:         treatment.status,
        performed_date: treatment.performed_date,
      });
    } else {
      reset({
        tooth_number:   "general",
        procedure_name: "",
        procedure_code: "",
        description:    "",
        amount:         "",
        status:         "completed",
        performed_date: TODAY,
      });
    }
  }, [open, treatment, reset]);

  const onSubmit = async (data: TreatmentValues) => {
    const payload = {
      patient_id:     patientId,
      appointment_id: appointmentId,
      tooth_number:   data.tooth_number.trim().toLowerCase() === "general"
        ? "general"
        : data.tooth_number.trim(),
      procedure_name: data.procedure_name,
      procedure_code: data.procedure_code || undefined,
      description:    data.description    || undefined,
      amount:         data.amount         ? Number(data.amount) : undefined,
      status:         data.status,
      performed_date: data.performed_date,
    };

    try {
      if (treatment) {
        const res = await apiClient.put<Treatment>(`/treatments/${treatment.id}`, payload);
        toast.success("Treatment updated");
        onSaved(res.data);
      } else {
        const res = await apiClient.post<Treatment>("/treatments", payload);
        toast.success("Treatment recorded");
        onSaved(res.data);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save treatment";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{treatment ? "Edit Treatment" : "Record Treatment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Tooth Number <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("tooth_number")}
                placeholder="e.g. 36 or general"
              />
              {errors.tooth_number ? (
                <p className="text-xs text-destructive">{errors.tooth_number.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">FDI (11–48) or "general"</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={treatment?.status ?? "completed"}
                onValueChange={(v) =>
                  setValue("status", v as TreatmentValues["status"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Procedure Name <span className="text-destructive">*</span>
            </Label>
            <Input {...register("procedure_name")} placeholder="e.g. Composite filling" />
            {errors.procedure_name && (
              <p className="text-xs text-destructive">{errors.procedure_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Procedure Code</Label>
              <Input {...register("procedure_code")} placeholder="e.g. D2391" />
            </div>

            <div className="space-y-1.5">
              <Label>Amount (INR)</Label>
              <Input
                {...register("amount")}
                type="number"
                min={0}
                step="0.01"
                placeholder="Optional"
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Date Performed <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              {...register("performed_date")}
              max={TODAY}
            />
            {errors.performed_date && (
              <p className="text-xs text-destructive">{errors.performed_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              {...register("description")}
              rows={2}
              placeholder="Optional notes about this procedure"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {treatment ? "Update Treatment" : "Save Treatment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
