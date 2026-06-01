"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users, CheckCircle2, DollarSign, RefreshCw, AlertCircle, CreditCard, TrendingDown } from "lucide-react";
import type { DashboardSummary, AppointmentWithPatient, AppointmentStatus } from "@/types";

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled:   "Scheduled",
  confirmed:   "Confirmed",
  checked_in:  "Checked In",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  no_show:     "No Show",
};

const STATUS_PILL: Record<AppointmentStatus, string> = {
  scheduled:   "bg-slate-100 text-slate-600",
  confirmed:   "bg-blue-100 text-blue-700",
  checked_in:  "bg-amber-100 text-amber-800",
  in_progress: "bg-orange-100 text-orange-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-gray-100 text-gray-500",
  no_show:     "bg-red-100 text-red-600",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled:   "bg-slate-400",
  confirmed:   "bg-blue-500",
  checked_in:  "bg-amber-500",
  in_progress: "bg-orange-500",
  completed:   "bg-emerald-500",
  cancelled:   "bg-gray-400",
  no_show:     "bg-red-500",
};

const STATUS_ORDER: AppointmentStatus[] = [
  "scheduled", "confirmed", "checked_in",
  "in_progress", "completed", "cancelled", "no_show",
];

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
  "#EF4444", "#06B6D4", "#EC4899", "#6366F1",
];

function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function nameInitials(name: string): string {
  return name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2);
}

// ── Procedure Mix Panel ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  checkup:      "#3B82F6",
  cleaning:     "#10B981",
  filling:      "#F59E0B",
  extraction:   "#EF4444",
  root_canal:   "#8B5CF6",
  consultation: "#6B7280",
};

const FALLBACK_COLORS = ["#06B6D4", "#EC4899", "#6366F1", "#84CC16", "#F97316"];

function typeColor(type: string, idx: number): string {
  return TYPE_COLORS[type] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

interface ProcedureMixPanelProps {
  appointments: AppointmentWithPatient[];
  loading: boolean;
}

function ProcedureMixPanel({ appointments, loading }: ProcedureMixPanelProps) {
  if (loading) return <Skeleton className="flex-1 rounded-2xl min-h-[200px]" />;

  const typeCounts = appointments.reduce<Record<string, number>>((acc, appt) => {
    acc[appt.appointment_type] = (acc[appt.appointment_type] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);
  const total   = appointments.length;
  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-800">Today&apos;s Procedure Mix</p>
        <p className="text-xs text-gray-400 mt-0.5">Appointment types scheduled today</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarDays size={28} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">No appointments today</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sorted.map(([type, count], idx) => {
            const color    = typeColor(type, idx);
            const pct      = Math.round((count / total) * 100);
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium text-gray-700 capitalize">
                      {type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct}%</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums w-4 text-right">
                      {count}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {sorted.length} procedure {sorted.length === 1 ? "type" : "types"}
          </span>
          <span className="text-xs font-semibold text-gray-600 tabular-nums">
            {total} total
          </span>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  badge?: { text: string; color: string };
  loading?: boolean;
  error?: boolean;
}

function KpiCard({ icon, iconBg, label, value, badge, loading, error }: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="mt-3 h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-20" />
        <Skeleton className="mt-2 h-5 w-24 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex items-center gap-3">
        <AlertCircle size={18} className="text-red-400 shrink-0" />
        <p className="text-xs text-red-400">Failed to load</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {badge && (
        <span
          className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: badge.color + "18", color: badge.color }}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setSummaryError(false);
    setAppointmentsError(false);

    const today = new Date().toISOString().split("T")[0];

    const [summaryResult, appointmentsResult] = await Promise.allSettled([
      apiClient.get<DashboardSummary>("/dashboard/summary"),
      apiClient.get<{ data: AppointmentWithPatient[] }>(
        `/appointments?date=${today}&per_page=50`
      ),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value.data);
    } else {
      setSummaryError(true);
    }

    if (appointmentsResult.status === "fulfilled") {
      setAppointments(appointmentsResult.value.data.data ?? []);
    } else {
      setAppointmentsError(true);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Derived stats for KPI badges
  const total      = summary?.appointments.total ?? 0;
  const completed  = summary?.appointments.completed ?? 0;
  const confirmed  = summary?.appointments.confirmed ?? 0;
  const newMonth   = summary?.new_patients_this_month ?? 0;
  const completePct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-blue-500" : ""}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── 5-column KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={<CalendarDays size={20} className="text-blue-600" />}
          iconBg="#EFF6FF"
          label="Today's Appointments"
          value={total.toString()}
          badge={
            confirmed > 0
              ? { text: `${confirmed} confirmed`, color: "#2563eb" }
              : undefined
          }
          loading={loading}
          error={summaryError}
        />
        <KpiCard
          icon={<Users size={20} className="text-violet-600" />}
          iconBg="#F5F3FF"
          label="Active Patients"
          value={(summary?.total_active_patients ?? 0).toLocaleString()}
          badge={{ text: `+${newMonth} this month`, color: "#7c3aed" }}
          loading={loading}
          error={summaryError}
        />
        <KpiCard
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="#ECFDF5"
          label="Completed Today"
          value={completed.toString()}
          badge={
            total > 0
              ? {
                  text: `${completePct}% completion`,
                  color: completePct >= 75 ? "#059669" : completePct >= 40 ? "#d97706" : "#6b7280",
                }
              : undefined
          }
          loading={loading}
          error={summaryError}
        />
        <KpiCard
          icon={<DollarSign size={20} className="text-amber-600" />}
          iconBg="#FFFBEB"
          label="Billed Today"
          value={summary ? formatCurrency(summary.revenue_today) : formatCurrency(0)}
          badge={{ text: "Treatment fees", color: "#b45309" }}
          loading={loading}
          error={summaryError}
        />
        <KpiCard
          icon={<CreditCard size={20} className="text-emerald-600" />}
          iconBg="#ECFDF5"
          label="Collected Today"
          value={summary ? formatCurrency(summary.collected_today) : formatCurrency(0)}
          badge={
            summary
              ? {
                  text: summary.collected_today >= summary.revenue_today
                    ? "Fully settled"
                    : summary.collected_today > 0
                    ? "Partial"
                    : "None collected",
                  color: summary.collected_today >= summary.revenue_today
                    ? "#059669"
                    : summary.collected_today > 0
                    ? "#d97706"
                    : "#6b7280",
                }
              : undefined
          }
          loading={loading}
          error={summaryError}
        />
      </div>

      {/* ── Main two-column content ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left: status bar + schedule table (spans 2/3) ─────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Status summary bar */}
          {!loading && !summaryError && summary && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                Appointment Status Breakdown
              </p>
              {summary.appointments.total === 0 ? (
                <p className="text-sm text-gray-400">No appointments scheduled for today.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((status) => {
                    const count = summary.appointments[status as keyof typeof summary.appointments] as number;
                    return (
                      <div
                        key={status}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${STATUS_PILL[status]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                        {STATUS_LABELS[status]}
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {loading && <Skeleton className="h-[72px] rounded-2xl" />}

          {/* Schedule table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Today&apos;s Schedule</p>
              {!loading && appointments.length > 0 && (
                <span className="text-xs text-gray-400">{appointments.length} appointments</span>
              )}
            </div>

            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : appointmentsError ? (
              <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-red-400">
                <AlertCircle size={16} />
                Unable to load appointments. Please refresh.
              </div>
            ) : appointments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CalendarDays size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Patient
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Time
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointments.map((appt) => {
                      const bg = avatarBg(appt.patient_name);
                      const initls = nameInitials(appt.patient_name);
                      return (
                        <tr
                          key={appt.id}
                          onClick={() => router.push(`/appointments/${appt.id}`)}
                          className="cursor-pointer hover:bg-gray-50 transition-colors duration-100"
                        >
                          {/* Patient avatar + name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ backgroundColor: bg }}
                                aria-hidden="true"
                              >
                                {initls}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 leading-tight">
                                  {appt.patient_name}
                                </p>
                                <p className="text-xs text-gray-400 leading-tight mt-0.5">
                                  {appt.patient_phone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-sm text-gray-600 tabular-nums">
                              {formatTime(appt.start_time)}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              – {formatTime(appt.end_time)}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-gray-600 capitalize">
                              {appt.appointment_type.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Status pill */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                STATUS_PILL[appt.status] ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  STATUS_DOT[appt.status] ?? "bg-gray-400"
                                }`}
                              />
                              {STATUS_LABELS[appt.status] ?? appt.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: analytics panel (spans 1/3) ─────────────────────────────── */}
        <div className="flex flex-col gap-4">

          <ProcedureMixPanel appointments={appointments} loading={loading} />

          {/* Live activity mini-card */}
          {!loading && !summaryError && summary && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                Live Activity
              </p>
              <div className="space-y-2.5">
                {(["checked_in", "in_progress", "confirmed"] as AppointmentStatus[]).map((status) => {
                  const count = summary.appointments[status as keyof typeof summary.appointments] as number;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                        <span className="text-xs text-gray-600">{STATUS_LABELS[status]}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{count}</span>
                    </div>
                  );
                })}
                <div
                  className="pt-2.5 mt-0.5 flex items-center justify-between"
                  style={{ borderTop: "1px solid #f1f5f9" }}
                >
                  <span className="text-xs font-semibold text-gray-500">No-shows</span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: summary.appointments.no_show > 0 ? "#ef4444" : "#6b7280" }}
                  >
                    {summary.appointments.no_show}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding balance card */}
          {!loading && !summaryError && summary && (
            <div
              className="rounded-2xl border shadow-sm p-5"
              style={{
                backgroundColor: summary.total_outstanding > 0 ? "#FFF7F7" : "#F0FDF4",
                borderColor:     summary.total_outstanding > 0 ? "#FECACA" : "#BBF7D0",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown
                  size={15}
                  style={{ color: summary.total_outstanding > 0 ? "#dc2626" : "#16a34a" }}
                />
                <p className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: summary.total_outstanding > 0 ? "#dc2626" : "#16a34a" }}
                >
                  Total Outstanding
                </p>
              </div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: summary.total_outstanding > 0 ? "#dc2626" : "#16a34a" }}
              >
                {formatCurrency(summary.total_outstanding)}
              </p>
              <p className="text-xs mt-1" style={{ color: summary.total_outstanding > 0 ? "#ef4444" : "#22c55e" }}>
                {summary.total_outstanding > 0
                  ? "Unpaid balances across all patients"
                  : "All balances settled"}
              </p>
            </div>
          )}
          {loading && <Skeleton className="h-28 rounded-2xl" />}
          {loading && <Skeleton className="h-40 rounded-2xl" />}
        </div>
      </div>
    </div>
  );
}
