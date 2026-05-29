"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { AppointmentWithPatient } from "@/types";

interface Props {
  weekStart: Date;
  appointments: AppointmentWithPatient[];
  onDayClick?: (date: string) => void;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekViewCalendar({ weekStart, appointments, onDayClick }: Props) {
  const router = useRouter();
  const today = dateKey(new Date());

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return { date: d, key: dateKey(d), label: DAY_NAMES[i] };
    }),
  [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithPatient[]>();
    for (const appt of appointments) {
      const list = map.get(appt.appointment_date) ?? [];
      list.push(appt);
      map.set(appt.appointment_date, list);
    }
    return map;
  }, [appointments]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map(({ date, key, label }) => {
          const isToday = key === today;
          return (
            <div
              key={key}
              className={cn(
                "py-2 px-1 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
                isToday && "bg-blue-50",
              )}
              onClick={() => onDayClick?.(key)}
            >
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "text-sm font-semibold mt-0.5",
                  isToday ? "text-blue-600" : "text-foreground",
                )}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Appointment chips row */}
      <div className="grid grid-cols-7 min-h-[160px]">
        {days.map(({ key, date }) => {
          const dayAppts = (byDay.get(key) ?? []).sort((a, b) =>
            a.start_time.localeCompare(b.start_time),
          );
          const isToday = key === today;
          return (
            <div
              key={key}
              className={cn(
                "p-1 border-r last:border-r-0 space-y-0.5 min-h-[160px]",
                isToday && "bg-blue-50/40",
              )}
            >
              {dayAppts.length === 0 && (
                <button
                  type="button"
                  className="w-full h-full min-h-[140px] flex items-center justify-center text-[11px] text-muted-foreground/60 hover:bg-muted/30 rounded transition-colors"
                  onClick={() => onDayClick?.(key)}
                />
              )}
              {dayAppts.map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  className={cn(
                    "w-full text-left rounded px-1.5 py-1 text-[11px] leading-tight transition-opacity hover:opacity-80",
                    appt.status === "cancelled" && "opacity-40",
                  )}
                  style={{ backgroundColor: appt.color ?? "#6B7280" }}
                  onClick={() => router.push(`/appointments/${appt.id}`)}
                >
                  <p className="text-white font-semibold truncate">{appt.patient_name}</p>
                  <p className="text-white/80 truncate">
                    {formatTime(appt.start_time)} · {appt.appointment_type}
                  </p>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
