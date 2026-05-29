"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Patient } from "@/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  mode: "deactivate" | "reactivate";
  onSuccess: (updated: Patient) => void;
}

export function DeactivatePatientDialog({ open, onOpenChange, patient, mode, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === "deactivate") {
        await apiClient.delete(`/patients/${patient.id}`);
        toast.success("Patient record deactivated");
        onSuccess({ ...patient, is_active: false });
      } else {
        const res = await apiClient.post(`/patients/${patient.id}/reactivate`);
        toast.success("Patient record reactivated");
        onSuccess(res.data);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fullName = `${patient.first_name} ${patient.last_name}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "deactivate" ? "Deactivate Patient?" : "Reactivate Patient?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "deactivate" ? (
              <>
                This will deactivate <strong>{fullName}</strong>. They will no longer appear in
                standard search results or be available for new appointments. Their full clinical
                history is preserved.
              </>
            ) : (
              <>
                This will reactivate <strong>{fullName}</strong>. They will appear in search results
                and become available for scheduling again.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button
            variant={mode === "deactivate" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "deactivate" ? "Deactivate" : "Reactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
