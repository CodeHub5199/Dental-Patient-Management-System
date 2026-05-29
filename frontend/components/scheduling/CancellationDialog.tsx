"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isInProgress?: boolean;
  loading?: boolean;
}

export function CancellationDialog({ open, onOpenChange, onConfirm, isInProgress, loading }: Props) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setReason("");
    onOpenChange(v);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
          <AlertDialogDescription>
            {isInProgress
              ? "This appointment is currently in progress. Are you sure you want to cancel it?"
              : "This will mark the appointment as cancelled. The record will be preserved with your reason."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="cancel-reason">
            Cancellation reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder='e.g. "Patient called to cancel", "Dentist sick leave"…'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          {!reason.trim() && (
            <p className="text-xs text-muted-foreground">A reason is required to cancel.</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? "Cancelling…" : "Cancel Appointment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
