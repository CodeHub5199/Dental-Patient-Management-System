"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { CancellationDialog } from "./CancellationDialog";
import type { AppointmentWithPatient, AppointmentStatus } from "@/types";

interface NextAction {
  status: AppointmentStatus;
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

const NEXT_ACTIONS: Record<string, NextAction[]> = {
  scheduled: [
    { status: "confirmed",  label: "Confirm Appointment", variant: "default" },
    { status: "cancelled",  label: "Cancel",              variant: "destructive" },
  ],
  confirmed: [
    { status: "checked_in", label: "Check In Patient",    variant: "default" },
    { status: "no_show",    label: "Mark No Show",        variant: "secondary" },
    { status: "cancelled",  label: "Cancel",              variant: "destructive" },
  ],
  checked_in: [
    { status: "in_progress", label: "Start Treatment",   variant: "default" },
    { status: "cancelled",   label: "Cancel",            variant: "destructive" },
  ],
  in_progress: [
    { status: "completed", label: "Complete Appointment", variant: "default" },
  ],
  completed: [],
  cancelled: [
    { status: "scheduled", label: "Reopen & Reschedule", variant: "outline" },
  ],
  no_show: [
    { status: "scheduled", label: "Reopen & Reschedule", variant: "outline" },
  ],
};

interface Props {
  appointment: AppointmentWithPatient;
  onStatusChanged: (updated: AppointmentWithPatient) => void;
}

export function StatusWorkflowPanel({ appointment, onStatusChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const actions = NEXT_ACTIONS[appointment.status] ?? [];

  const applyTransition = async (targetStatus: AppointmentStatus, cancellationReason?: string) => {
    setLoading(true);
    try {
      await apiClient.patch(`/appointments/${appointment.id}/status`, {
        status: targetStatus,
        cancellation_reason: cancellationReason,
      });
      // Reload full appointment to get updated data
      const res = await apiClient.get<AppointmentWithPatient>(`/appointments/${appointment.id}`);
      onStatusChanged(res.data);
      toast.success(`Status updated to ${targetStatus.replace("_", " ")}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to update status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: NextAction) => {
    if (action.status === "cancelled") {
      setCancelDialogOpen(true);
    } else {
      applyTransition(action.status);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    setCancelDialogOpen(false);
    await applyTransition("cancelled", reason);
  };

  if (actions.length === 0 && appointment.status === "completed") {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
        <StatusBadge status="completed" />
        <span className="text-sm text-green-700 font-medium">
          This appointment is complete — no further changes allowed.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current status:</span>
          <StatusBadge status={appointment.status} />
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                disabled={loading}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {appointment.status === "cancelled" && appointment.cancellation_reason && (
          <p className="text-xs text-muted-foreground">
            Reason: <span className="text-foreground">{appointment.cancellation_reason}</span>
          </p>
        )}
      </div>

      <CancellationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelConfirm}
        isInProgress={appointment.status === "in_progress"}
        loading={loading}
      />
    </>
  );
}
