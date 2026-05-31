"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Calendar, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DayViewCalendar } from "@/components/scheduling/DayViewCalendar";
import { WeekViewCalendar } from "@/components/scheduling/WeekViewCalendar";
import { DailySummaryBar } from "@/components/scheduling/DailySummaryBar";
import { NewAppointmentDialog } from "@/components/scheduling/NewAppointmentDialog";
import type { AppointmentWithPatient, ClinicSettings, User } from "@/types";

export const dynamic = "force-dynamic";

// ── Working-hours helpers ─────────────────────────────────────────────────────

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

function getWorkHoursForDate(
  settings: ClinicSettings | null,
  date: Date,
): { workStartMin: number; workEndMin: number } {
  const dayName = DAY_NAMES[date.getDay()];
  const hours = settings?.working_hours
    ? (settings.working_hours as Record<string, { start: string; end: string } | null>)[dayName]
    : null;
  if (!hours) return { workStartMin: 9 * 60, workEndMin: 17 * 60 };
  const [sh, sm] = hours.start.split(":").map(Number);
  const [eh, em] = hours.end.split(":").map(Number);
  return { workStartMin: sh * 60 + sm, workEndMin: eh * 60 + em };
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart]     = useState<Date>(() => getMonday(new Date()));

  const [appointments,   setAppointments]   = useState<AppointmentWithPatient[]>([]);
  const [statusCounts,   setStatusCounts]   = useState<Record<string, number>>({});
  const [loading,        setLoading]        = useState(true);
  const [dentist,        setDentist]        = useState<User | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [initialTime,    setInitialTime]    = useState<string | undefined>();

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // ── Fetch dentist on mount ────────────────────────────────────────────────

  useEffect(() => {
    apiClient.get<User[]>("/users/dentists")
      .then((res) => { if (res.data.length > 0) setDentist(res.data[0]); })
      .catch(() => {});
    apiClient.get<ClinicSettings>("/settings/clinic")
      .then((res) => setClinicSettings(res.data))
      .catch(() => {});
  }, []);

  // ── Fetch appointments ────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (view === "day") {
        const res = await apiClient.get<{ appointments: AppointmentWithPatient[] }>(
          "/appointments/calendar",
          { params: { start_date: dateKey(currentDate), end_date: dateKey(currentDate) } },
        );
        const appts = res.data.appointments ?? [];
        setAppointments(appts);

        const counts: Record<string, number> = {};
        for (const a of appts) {
          counts[a.status] = (counts[a.status] ?? 0) + 1;
        }
        setStatusCounts(counts);
      } else {
        const end = addDays(weekStart, 6);
        const res = await apiClient.get<{ appointments: AppointmentWithPatient[] }>(
          "/appointments/calendar",
          { params: { start_date: dateKey(weekStart), end_date: dateKey(end) } },
        );
        setAppointments(res.data.appointments ?? []);
        setStatusCounts({});
      }
    } catch {
      if (!silent) toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [view, currentDate, weekStart]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Auto-refresh every 60 s ───────────────────────────────────────────────

  useEffect(() => {
    clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(() => fetchAppointments(true), 60_000);
    return () => clearInterval(refreshIntervalRef.current);
  }, [fetchAppointments]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigateDay = (dir: -1 | 1) => {
    setCurrentDate((d) => addDays(d, dir));
  };

  const navigateWeek = (dir: -1 | 1) => {
    setWeekStart((d) => addDays(d, dir * 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setWeekStart(getMonday(new Date()));
  };

  // When clicking a slot in Day view, open the dialog with pre-filled time
  const handleSlotClick = (startTime: string) => {
    setInitialTime(startTime);
    setDialogOpen(true);
  };

  // When clicking a day in Week view, switch to Day view for that date
  const handleDayClick = (dateStr: string) => {
    setCurrentDate(new Date(dateStr + "T12:00:00"));
    setView("day");
  };

  const handleNewAppointment = (appt: AppointmentWithPatient) => {
    fetchAppointments();
    router.push(`/appointments/${appt.id}`);
  };

  const isToday = dateKey(currentDate) === dateKey(new Date());

  const { workStartMin, workEndMin } = getWorkHoursForDate(clinicSettings, currentDate);
  const calendarHeight = (workEndMin - workStartMin) * 1.5;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {view === "day" ? formatDisplayDate(currentDate) : formatWeekRange(weekStart)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => fetchAppointments()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            disabled={isToday && view === "day"}
          >
            Today
          </Button>
          <Button
            size="sm"
            onClick={() => { setInitialTime(undefined); setDialogOpen(true); }}
            disabled={!dentist}
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Appointment
          </Button>
        </div>
      </div>

      {/* View toggle + navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => view === "day" ? navigateDay(-1) : navigateWeek(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => view === "day" ? navigateDay(1) : navigateWeek(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
          <TabsList>
            <TabsTrigger value="day">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Day
            </TabsTrigger>
            <TabsTrigger value="week">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Week
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary bar (day view only) */}
      {view === "day" && !loading && (
        <DailySummaryBar counts={statusCounts} />
      )}
      {view === "day" && loading && (
        <Skeleton className="h-10 rounded-lg" />
      )}

      {/* Calendar */}
      {loading ? (
        <Skeleton className="rounded-lg" style={{ height: calendarHeight }} />
      ) : view === "day" ? (
        <DayViewCalendar
          appointments={appointments}
          onSlotClick={handleSlotClick}
          workStartMin={workStartMin}
          workEndMin={workEndMin}
        />
      ) : (
        <WeekViewCalendar
          weekStart={weekStart}
          appointments={appointments}
          onDayClick={handleDayClick}
        />
      )}

      {/* New appointment dialog */}
      {dentist && (
        <NewAppointmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dentistId={dentist.id}
          initialDate={view === "day" ? dateKey(currentDate) : undefined}
          initialTime={initialTime}
          onSuccess={handleNewAppointment}
        />
      )}
    </div>
  );
}
