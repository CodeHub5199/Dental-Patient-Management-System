"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppointmentWithPatient } from "@/types";
import { StatusBadge } from "./StatusBadge";

const WORK_START_MIN = 9 * 60;    // 09:00 in minutes from midnight
const WORK_END_MIN   = 17 * 60;   // 17:00
const WORK_RANGE_MIN = WORK_END_MIN - WORK_START_MIN;   // 480 min
const PX_PER_MIN     = 1.5;
const TOTAL_HEIGHT   = WORK_RANGE_MIN * PX_PER_MIN;     // 720 px
const GRID_INTERVAL  = 30;                               // grid lines every 30 min

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 || 12;
  return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface Props {
  appointments: AppointmentWithPatient[];
  onSlotClick?: (startTime: string) => void;
}

export function DayViewCalendar({ appointments, onSlotClick }: Props) {
  const router = useRouter();

  const gridSlots = useMemo(() => {
    const slots: number[] = [];
    for (let m = WORK_START_MIN; m <= WORK_END_MIN; m += GRID_INTERVAL) {
      slots.push(m);
    }
    return slots;
  }, []);

  const positioned = useMemo(() =>
    appointments.map((appt) => {
      const startMin = timeToMinutes(appt.start_time);
      const endMin   = timeToMinutes(appt.end_time);
      const clampedStart = Math.max(startMin, WORK_START_MIN);
      const clampedEnd   = Math.min(endMin,   WORK_END_MIN);
      const top    = (clampedStart - WORK_START_MIN) * PX_PER_MIN;
      const height = Math.max((clampedEnd - clampedStart) * PX_PER_MIN, 20);
      return { appt, top, height };
    }),
  [appointments]);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-appointment]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesOffset = Math.floor(clickY / PX_PER_MIN / GRID_INTERVAL) * GRID_INTERVAL;
    const totalMin = WORK_START_MIN + Math.max(0, Math.min(minutesOffset, WORK_RANGE_MIN - GRID_INTERVAL));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    onSlotClick?.(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="flex border rounded-lg overflow-hidden bg-white select-none">
      {/* Time axis */}
      <div className="w-16 shrink-0 border-r bg-muted/20 relative" style={{ height: TOTAL_HEIGHT }}>
        {gridSlots.map((min) => (
          <span
            key={min}
            className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2"
            style={{ top: (min - WORK_START_MIN) * PX_PER_MIN }}
          >
            {minutesToLabel(min)}
          </span>
        ))}
      </div>

      {/* Grid + appointments */}
      <div
        className="flex-1 relative cursor-pointer"
        style={{ height: TOTAL_HEIGHT }}
        onClick={handleGridClick}
      >
        {/* Grid lines */}
        {gridSlots.map((min, i) => (
          <div
            key={min}
            className={cn(
              "absolute left-0 right-0 border-t",
              i % 2 === 0 ? "border-border/60" : "border-border/25 border-dashed",
            )}
            style={{ top: (min - WORK_START_MIN) * PX_PER_MIN }}
          />
        ))}

        {/* Appointment blocks */}
        {positioned.map(({ appt, top, height }) => (
          <div
            key={appt.id}
            data-appointment
            role="button"
            tabIndex={0}
            className="absolute left-1 right-1 rounded px-2 py-0.5 overflow-hidden cursor-pointer transition-opacity hover:opacity-90 shadow-sm"
            style={{
              top: top + 1,
              height: height - 2,
              backgroundColor: appt.color ?? "#6B7280",
              opacity: appt.status === "cancelled" ? 0.45 : 1,
            }}
            onClick={(e) => { e.stopPropagation(); router.push(`/appointments/${appt.id}`); }}
            onKeyDown={(e) => { if (e.key === "Enter") router.push(`/appointments/${appt.id}`); }}
          >
            <p className="text-white text-xs font-semibold leading-tight truncate">
              {appt.patient_name}
            </p>
            {height > 32 && (
              <p className="text-white/80 text-[10px] leading-tight truncate capitalize">
                {appt.appointment_type}
              </p>
            )}
            {height > 52 && (
              <div className="mt-0.5">
                <StatusBadge status={appt.status} size="xs" />
              </div>
            )}
          </div>
        ))}

        {appointments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">
              No appointments — click a time slot to book one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
