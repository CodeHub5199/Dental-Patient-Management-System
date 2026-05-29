"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, KeyRound, UserX, UserCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";

interface PaginatedUsers {
  data: User[];
  pagination: { total: number };
}

/* ── Create user form ────────────────────────────────────────────── */
const createSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["dentist", "receptionist"]),
});

type CreateForm = z.infer<typeof createSchema>;

/* ── Admin reset password form ───────────────────────────────────── */
const resetSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetForm = z.infer<typeof resetSchema>;

/* ── Role badge ──────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        role === "dentist"
          ? "bg-blue-100 text-blue-800"
          : "bg-purple-100 text-purple-800"
      }`}
    >
      {role === "dentist" ? "Dentist" : "Receptionist"}
    </span>
  );
}

/* ── Status badge ────────────────────────────────────────────────── */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ── Modal wrapper ───────────────────────────────────────────────── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div ref={ref} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Role guard
  useEffect(() => {
    if (!isLoading && currentUser?.role !== "dentist") {
      router.replace("/dashboard");
    }
  }, [currentUser, isLoading, router]);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res = await apiClient.get<PaginatedUsers>("/users", {
        params: { per_page: 50 },
      });
      setUsers(res.data.data);
      setTotal(res.data.pagination.total);
    } catch {
      toast.error("Failed to load staff accounts");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && currentUser?.role === "dentist") {
      fetchUsers();
    }
  }, [isLoading, currentUser, fetchUsers]);

  /* ── Create user ─────────────────────────────────────────────── */
  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onCreateUser = async (data: CreateForm) => {
    setCreateLoading(true);
    try {
      await apiClient.post("/users", data);
      toast.success(`Account created for ${data.full_name}`);
      setShowCreateModal(false);
      resetCreate();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── Toggle active/inactive ──────────────────────────────────── */
  const toggleActive = async (u: User) => {
    setToggleLoading(u.id);
    try {
      if (u.is_active) {
        await apiClient.delete(`/users/${u.id}`);
        toast.success(`${u.full_name} deactivated`);
      } else {
        await apiClient.put(`/users/${u.id}`, { is_active: true });
        toast.success(`${u.full_name} reactivated`);
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Action failed");
    } finally {
      setToggleLoading(null);
    }
  };

  /* ── Admin reset password ────────────────────────────────────── */
  const {
    register: regReset,
    handleSubmit: handleReset,
    reset: resetResetForm,
    formState: { errors: resetErrors },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onAdminReset = async (data: ResetForm) => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      await apiClient.post(`/users/${resetTarget.id}/reset-password`, {
        new_password: data.new_password,
      });
      toast.success(`Password reset for ${resetTarget.full_name}`);
      setResetTarget(null);
      resetResetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  if (isLoading || currentUser?.role !== "dentist") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} account{total !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          New account
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {fetching ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No staff accounts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={u.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setResetTarget(u)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Reset password"
                        >
                          <KeyRound size={15} />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={toggleLoading === u.id}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                            title={u.is_active ? "Deactivate" : "Reactivate"}
                          >
                            {u.is_active ? (
                              <UserX size={15} />
                            ) : (
                              <UserCheck size={15} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create user modal */}
      {showCreateModal && (
        <Modal title="New staff account" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate(onCreateUser)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                {...regCreate("full_name")}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Jane Smith"
              />
              {createErrors.full_name && (
                <p className="text-xs text-red-500 mt-1">{createErrors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...regCreate("email")}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="jane@clinic.com"
              />
              {createErrors.email && (
                <p className="text-xs text-red-500 mt-1">{createErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...regCreate("password")}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Min. 8 characters"
              />
              {createErrors.password && (
                <p className="text-xs text-red-500 mt-1">{createErrors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                {...regCreate("role")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="receptionist">Receptionist</option>
                <option value="dentist">Dentist</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {createLoading ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin reset password modal */}
      {resetTarget && (
        <Modal
          title={`Reset password — ${resetTarget.full_name}`}
          onClose={() => setResetTarget(null)}
        >
          <form onSubmit={handleReset(onAdminReset)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                {...regReset("new_password")}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Min. 8 characters"
              />
              {resetErrors.new_password && (
                <p className="text-xs text-red-500 mt-1">{resetErrors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                {...regReset("confirm_password")}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              {resetErrors.confirm_password && (
                <p className="text-xs text-red-500 mt-1">{resetErrors.confirm_password.message}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {resetLoading ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
