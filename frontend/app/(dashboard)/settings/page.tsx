"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Save,
  Plus,
  Pencil,
  Building2,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";
import type { ClinicSettings, Procedure, WorkingDayHours } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Working-hours form helpers ───────────────────────────────────────────────

type DayHours = { open: boolean; start: string; end: string };
type WorkingHoursForm = Record<Day, DayHours>;

const DEFAULT_DAY: DayHours = { open: false, start: "09:00", end: "17:00" };

function toFormHours(api: ClinicSettings["working_hours"]): WorkingHoursForm {
  const result = {} as WorkingHoursForm;
  for (const day of DAYS) {
    const h = (api as Record<string, WorkingDayHours | null>)?.[day];
    result[day] = h ? { open: true, start: h.start, end: h.end } : { ...DEFAULT_DAY };
  }
  return result;
}

function toApiHours(form: WorkingHoursForm): Record<string, WorkingDayHours | null> {
  const result: Record<string, WorkingDayHours | null> = {};
  for (const day of DAYS) {
    result[day] = form[day].open ? { start: form[day].start, end: form[day].end } : null;
  }
  return result;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
        checked ? "bg-blue-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Procedure dialog ─────────────────────────────────────────────────────────

interface ProcedureDialogProps {
  open: boolean;
  procedure: Procedure | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProcedureDialog({ open, procedure, onClose, onSaved }: ProcedureDialogProps) {
  const isEdit = !!procedure;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "",
    default_amount: "",
    default_duration_minutes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      procedure
        ? {
            name: procedure.name,
            code: procedure.code ?? "",
            category: procedure.category ?? "",
            default_amount:
              procedure.default_amount != null ? String(procedure.default_amount) : "",
            default_duration_minutes:
              procedure.default_duration_minutes != null
                ? String(procedure.default_duration_minutes)
                : "",
            is_active: procedure.is_active,
          }
        : {
            name: "",
            code: "",
            category: "",
            default_amount: "",
            default_duration_minutes: "",
            is_active: true,
          }
    );
  }, [open, procedure]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Procedure name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        category: form.category.trim() || null,
        default_amount: form.default_amount ? parseFloat(form.default_amount) : null,
        default_duration_minutes: form.default_duration_minutes
          ? parseInt(form.default_duration_minutes)
          : null,
        ...(isEdit && { is_active: form.is_active }),
      };
      if (isEdit) {
        await apiClient.put(`/settings/procedures/${procedure!.id}`, payload);
      } else {
        await apiClient.post("/settings/procedures", payload);
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save procedure. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Procedure" : "Add Procedure"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="p-name">
              Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Composite Filling"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-code">Code</Label>
              <Input
                id="p-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. D2391"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-category">Category</Label>
              <Input
                id="p-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Restorative"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-amount">Default Fee (₹)</Label>
              <Input
                id="p-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.default_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-duration">Duration (min)</Label>
              <Input
                id="p-duration"
                type="number"
                min="1"
                value={form.default_duration_minutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_duration_minutes: e.target.value }))
                }
                placeholder="30"
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3 pt-1">
              <Toggle
                checked={form.is_active}
                onChange={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              />
              <span className="text-sm text-gray-600">Active</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Procedure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const isDentist = user?.role === "dentist";

  // ── Clinic settings ──
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [slotDuration, setSlotDuration] = useState(30);
  const [workingHours, setWorkingHours] = useState<WorkingHoursForm>(() => {
    const r = {} as WorkingHoursForm;
    for (const d of DAYS) r[d] = { ...DEFAULT_DAY };
    return r;
  });

  // ── Procedures ──
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  // ── Loaders ──
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(false);
    try {
      const res = await apiClient.get<ClinicSettings>("/settings/clinic");
      const s = res.data;
      setClinicName(s.clinic_name ?? "");
      setPhone(s.phone ?? "");
      setEmail(s.email ?? "");
      setAddress(s.address ?? "");
      setTimezone(s.timezone ?? "America/New_York");
      setSlotDuration(s.slot_duration_minutes ?? 30);
      setWorkingHours(toFormHours(s.working_hours));
    } catch {
      setSettingsError(true);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadProcedures = useCallback(async () => {
    setProceduresLoading(true);
    try {
      const res = await apiClient.get<{ data: Procedure[] }>("/settings/procedures");
      setProcedures(res.data.data ?? []);
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadProcedures();
  }, [loadSettings, loadProcedures]);

  // ── Save clinic settings ──
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicName.trim()) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await apiClient.put("/settings/clinic", {
        clinic_name: clinicName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        timezone,
        slot_duration_minutes: slotDuration,
        working_hours: toApiHours(workingHours),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateDay(day: Day, patch: Partial<DayHours>) {
    setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage clinic configuration and procedure catalog
        </p>
      </div>

      <Tabs defaultValue="clinic">
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger
            value="clinic"
            className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"
          >
            <Building2 size={14} /> Clinic Information
          </TabsTrigger>
          <TabsTrigger
            value="procedures"
            className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"
          >
            <Stethoscope size={14} /> Procedures
          </TabsTrigger>
        </TabsList>

        {/* ── Clinic Information tab ── */}
        <TabsContent value="clinic" className="mt-5">
          {settingsLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
          ) : settingsError ? (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-50 rounded-xl p-4 border border-red-100">
              <AlertCircle size={16} className="shrink-0" />
              Failed to load settings. Please refresh the page.
            </div>
          ) : (
            <form onSubmit={handleSaveSettings}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8">

                {/* Clinic Details */}
                <Section
                  title="Clinic Details"
                  description="Basic information about your practice"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="clinic-name">
                        Clinic Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="clinic-name"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        disabled={!isDentist}
                        placeholder="Smile Dental Clinic"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="clinic-phone">Phone</Label>
                      <Input
                        id="clinic-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!isDentist}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="clinic-email">Email</Label>
                      <Input
                        id="clinic-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isDentist}
                        placeholder="clinic@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="clinic-address">Address</Label>
                      <Textarea
                        id="clinic-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={!isDentist}
                        placeholder="123 Main St, City, State 12345"
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </Section>

                <Separator />

                {/* Schedule Settings */}
                <Section
                  title="Schedule Settings"
                  description="Timezone and default appointment slot length"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Timezone</Label>
                      <Select
                        value={timezone}
                        onValueChange={setTimezone}
                        disabled={!isDentist}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Appointment Slot Duration</Label>
                      <Select
                        value={String(slotDuration)}
                        onValueChange={(v) => setSlotDuration(Number(v))}
                        disabled={!isDentist}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SLOT_DURATIONS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} minutes
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Section>

                <Separator />

                {/* Working Hours */}
                <Section
                  title="Working Hours"
                  description="Set the days and hours the clinic is open"
                >
                  <div className="space-y-1">
                    {DAYS.map((day) => {
                      const dh = workingHours[day];
                      return (
                        <div
                          key={day}
                          className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <Toggle
                            checked={dh.open}
                            onChange={() =>
                              isDentist && updateDay(day, { open: !dh.open })
                            }
                            disabled={!isDentist}
                          />
                          <span className="w-24 text-sm font-medium text-gray-700 shrink-0">
                            {DAY_LABELS[day]}
                          </span>
                          {dh.open ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={dh.start}
                                onValueChange={(v) => updateDay(day, { start: v })}
                                disabled={!isDentist}
                              >
                                <SelectTrigger className="w-28 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((t) => (
                                    <SelectItem key={t} value={t}>{formatTime12h(t)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-gray-400">to</span>
                              <Select
                                value={dh.end}
                                onValueChange={(v) => updateDay(day, { end: v })}
                                disabled={!isDentist}
                              >
                                <SelectTrigger className="w-28 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((t) => (
                                    <SelectItem key={t} value={t}>{formatTime12h(t)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* Save bar — dentist only */}
                {isDentist && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {saveSuccess && (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <CheckCircle2 size={14} /> Settings saved successfully.
                          </span>
                        )}
                        {saveError && (
                          <span className="flex items-center gap-1.5 text-red-500">
                            <AlertCircle size={14} /> {saveError}
                          </span>
                        )}
                      </div>
                      <Button
                        type="submit"
                        disabled={saving || !clinicName.trim()}
                        className="gap-2"
                      >
                        <Save size={15} />
                        {saving ? "Saving…" : "Save Settings"}
                      </Button>
                    </div>
                  </>
                )}

                {/* Read-only notice for receptionist */}
                {!isDentist && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Only the dentist can modify clinic settings.
                  </p>
                )}
              </div>
            </form>
          )}
        </TabsContent>

        {/* ── Procedures tab ── */}
        <TabsContent value="procedures" className="mt-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Procedure Catalog</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Procedures available for selection in treatment records
                </p>
              </div>
              {isDentist && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditingProcedure(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus size={14} /> Add Procedure
                </Button>
              )}
            </div>

            {proceduresLoading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : procedures.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Stethoscope size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No procedures added yet.</p>
                {isDentist && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => {
                      setEditingProcedure(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus size={14} /> Add your first procedure
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Name
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Category
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Default Fee
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Duration
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>
                      {isDentist && (
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400" />
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {procedures.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors duration-100"
                      >
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-medium text-gray-900">{p.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-gray-500 font-mono">
                            {p.code ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-gray-600">{p.category ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-gray-600 tabular-nums">
                            {p.default_amount != null
                              ? `₹${Number(p.default_amount).toFixed(2)}`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-gray-600 tabular-nums">
                            {p.default_duration_minutes != null
                              ? `${p.default_duration_minutes} min`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={
                              p.is_active
                                ? "bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-50"
                                : "bg-gray-100 text-gray-500 border-0 hover:bg-gray-100"
                            }
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        {isDentist && (
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setEditingProcedure(p);
                                setDialogOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ProcedureDialog
        open={dialogOpen}
        procedure={editingProcedure}
        onClose={() => setDialogOpen(false)}
        onSaved={loadProcedures}
      />
    </div>
  );
}
