"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, CalendarPlus, User } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Patient } from "@/types";
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

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => new Date(v) < new Date(), "Date of birth cannot be today or in the future"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say", ""]).optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email format"
    ),
  address: z.string().optional(),
  medical_notes: z.string().max(5000, "Notes cannot exceed 5,000 characters").optional(),
  ec_name: z.string().optional(),
  ec_phone: z.string().optional(),
  ec_relationship: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  onSuccess: (patient: Patient) => void;
  onBookAppointment?: (patient: Patient) => void;
}

export function PatientFormDialog({ open, onOpenChange, patient, onSuccess, onBookAppointment }: Props) {
  const isEdit = !!patient;
  const [loading, setLoading] = useState(false);
  const [savedPatient, setSavedPatient] = useState<Patient | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      setSavedPatient(null);
      reset({
        first_name: patient?.first_name ?? "",
        last_name: patient?.last_name ?? "",
        date_of_birth: patient?.date_of_birth ?? "",
        gender: (patient?.gender as FormData["gender"]) ?? "",
        phone: patient?.phone ?? "",
        email: patient?.email ?? "",
        address: patient?.address ?? "",
        medical_notes: patient?.medical_notes ?? "",
        ec_name: patient?.emergency_contact?.name ?? "",
        ec_phone: patient?.emergency_contact?.phone ?? "",
        ec_relationship: patient?.emergency_contact?.relationship ?? "",
      });
    }
  }, [open, patient, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const ec =
        data.ec_name || data.ec_phone || data.ec_relationship
          ? {
              name: data.ec_name ?? "",
              phone: data.ec_phone ?? "",
              relationship: data.ec_relationship ?? "",
            }
          : null;

      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender || null,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        medical_notes: data.medical_notes || null,
        emergency_contact: ec,
      };

      const res = isEdit
        ? await apiClient.put(`/patients/${patient.id}`, payload)
        : await apiClient.post("/patients", payload);

      if (isEdit) {
        toast.success("Patient updated successfully");
        onSuccess(res.data);
        onOpenChange(false);
      } else {
        setSavedPatient(res.data);
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const genderValue = watch("gender");

  if (savedPatient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Patient Registered</h2>
              <p className="text-muted-foreground text-sm">
                {savedPatient.first_name} {savedPatient.last_name} has been added successfully.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full pt-2">
              {onBookAppointment && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    onBookAppointment(savedPatient);
                  }}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onSuccess(savedPatient);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                View Patient Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Patient" : "Register New Patient"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Personal details */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Personal Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" {...register("first_name")} />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" {...register("last_name")} />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
                {errors.date_of_birth && (
                  <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={genderValue ?? ""}
                  onValueChange={(v) =>
                    setValue("gender", v as FormData["gender"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Contact Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" {...register("phone")} />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} />
              </div>
            </div>
          </div>

          {/* Emergency contact */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Emergency Contact
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ec_name">Name</Label>
                <Input id="ec_name" {...register("ec_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec_phone">Phone</Label>
                <Input id="ec_phone" type="tel" {...register("ec_phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec_relationship">Relationship</Label>
                <Input id="ec_relationship" {...register("ec_relationship")} />
              </div>
            </div>
          </div>

          {/* Medical notes */}
          <div className="space-y-1.5">
            <Label htmlFor="medical_notes">Medical Notes / Alerts</Label>
            <Textarea
              id="medical_notes"
              rows={4}
              placeholder="Allergies, medications, conditions, clinical alerts..."
              {...register("medical_notes")}
            />
            {errors.medical_notes && (
              <p className="text-xs text-destructive">{errors.medical_notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Register Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
