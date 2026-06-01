"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import type { Payment } from "@/types";
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

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Amount must be greater than 0"),
  payment_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "card", "bank_transfer", "insurance", "other"]),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  insurance: "Insurance",
  other: "Other",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onSuccess: (payment: Payment) => void;
}

export function PaymentDialog({ open, onOpenChange, patientId, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: today,
      payment_method: "cash",
    },
  });

  const paymentMethod = watch("payment_method");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post<Payment>("/payments", {
        patient_id: patientId,
        amount: parseFloat(values.amount),
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        notes: values.notes || null,
      });
      toast.success("Payment recorded");
      onSuccess(res.data);
      reset({ payment_date: today, payment_method: "cash" });
      onOpenChange(false);
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="pay-amount"
                  {...register("amount")}
                  placeholder="0.00"
                  className="pl-6"
                  type="number"
                  step="0.01"
                  min="0.01"
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date *</Label>
              <Input
                id="pay-date"
                {...register("payment_date")}
                type="date"
                max={today}
              />
              {errors.payment_date && (
                <p className="text-xs text-destructive">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) =>
                setValue("payment_method", v as FormValues["payment_method"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              {...register("notes")}
              placeholder="Optional notes about this payment…"
              rows={2}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
