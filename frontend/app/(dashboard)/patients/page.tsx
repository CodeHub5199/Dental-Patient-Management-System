"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import type { Patient, PaginatedResponse } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/patients/SearchBar";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
import { NewAppointmentDialog } from "@/components/scheduling/NewAppointmentDialog";

type SortField = "last_name" | "created_at" | "registration_date";

export default function PatientsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<Patient> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPatient, setBookingPatient] = useState<Patient | null>(null);
  const [dentistId, setDentistId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/patients", {
        params: {
          page,
          per_page: 20,
          is_active: !showInactive,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
      });
      setData(res.data);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, showInactive]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    apiClient.get<{ id: string }[]>("/users/dentists").then((res) => {
      if (res.data.length > 0) setDentistId(res.data[0].id);
    }).catch(() => {});
  }, []);

  const handleBookAppointment = (patient: Patient) => {
    setBookingPatient(patient);
    setBookingOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handlePatientCreated = (patient: Patient) => {
    fetchPatients();
    router.push(`/patients/${patient.id}`);
  };

  const patients = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {pagination.total.toLocaleString()} {showInactive ? "inactive" : "active"} patient
              {pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <SearchBar />
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
            className="rounded border-input"
          />
          Show inactive patients
        </label>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort("last_name")}
                >
                  Name
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort("registration_date")}
                >
                  Registered
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                  </tr>
                ))
              : patients.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No patients found
                    </td>
                  </tr>
                )
              : patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {p.first_name} {p.last_name}
                        </span>
                        {p.medical_notes && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.registration_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "success" : "secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={pagination.page >= pagination.total_pages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* New patient form */}
      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handlePatientCreated}
        onBookAppointment={dentistId ? handleBookAppointment : undefined}
      />

      {/* Book appointment for newly registered patient */}
      {dentistId && bookingPatient && (
        <NewAppointmentDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          dentistId={dentistId}
          preselectedPatient={{
            id: bookingPatient.id,
            first_name: bookingPatient.first_name,
            last_name: bookingPatient.last_name,
            phone: bookingPatient.phone,
          }}
          onSuccess={() => {
            setBookingOpen(false);
            toast.success("Appointment booked successfully");
            router.push("/appointments");
          }}
        />
      )}
    </div>
  );
}
