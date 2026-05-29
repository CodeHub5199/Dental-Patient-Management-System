"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DashboardSummary, AppointmentWithPatient, AppointmentStatus } from "@/types";

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  checked_in: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  no_show: "bg-red-100 text-red-600",
};

const STATUS_ORDER: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="text-sm text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── Quick Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : summaryError ? (
          <div className="col-span-3 rounded-xl border border-red-100 bg-red-50 px-4 py-5 text-center">
            <p className="text-sm text-red-500">
              Unable to load statistics. Please refresh the page or contact support.
            </p>
          </div>
        ) : (
          <>
            <StatCard
              title="Total Active Patients"
              value={summary?.total_active_patients?.toLocaleString() ?? "0"}
            />
            <StatCard
              title="New Patients This Month"
              value={summary?.new_patients_this_month?.toString() ?? "0"}
            />
            <StatCard
              title="Revenue Today"
              value={summary ? formatCurrency(summary.revenue_today) : formatCurrency(0)}
              subtitle="Based on logged treatment fees. Not an accounting figure."
            />
          </>
        )}
      </div>

      {/* ── Appointment Status Summary Bar ── */}
      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : !summaryError && summary ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Today&apos;s Appointments —{" "}
            <span className="text-gray-900 font-bold">
              {summary.appointments.total} total
            </span>
          </h2>
          {summary.appointments.total === 0 ? (
            <p className="text-sm text-gray-400">No appointments scheduled for today.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => (
                <span
                  key={status}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
                >
                  {STATUS_LABELS[status]}:{" "}
                  {summary.appointments[status as keyof typeof summary.appointments]}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ── Today's Appointment List ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Today&apos;s Schedule</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : appointmentsError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-500">
              Unable to load today&apos;s appointments. Please refresh.
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No appointments scheduled for today.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Patient</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    onClick={() => router.push(`/appointments/${appt.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {appt.patient_name}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {appt.appointment_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs leading-tight text-gray-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4">
        <Skeleton className="h-3 w-36" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Skeleton className="mt-1 h-8 w-28" />
      </CardContent>
    </Card>
  );
}
