"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? "", email: user?.email ?? "" },
  });

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    setProfileLoading(true);
    try {
      const res = await apiClient.put<User>("/auth/me", data);
      updateUser(res.data);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setPasswordLoading(true);
    try {
      await apiClient.put("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success("Password changed successfully");
      resetPassword();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account information
        </p>
      </div>

      {/* Personal Information */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Personal information</h2>
          <p className="text-sm text-gray-500">
            Role:{" "}
            <span className="capitalize font-medium text-gray-700">
              {user?.role}
            </span>
          </p>
        </div>

        <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              {...regProfile("full_name")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {profileErrors.full_name && (
              <p className="text-xs text-red-500 mt-1">{profileErrors.full_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              {...regProfile("email")}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {profileErrors.email && (
              <p className="text-xs text-red-500 mt-1">{profileErrors.email.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {profileLoading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Change password</h2>
          <p className="text-sm text-gray-500">
            Use at least 8 characters for your new password
          </p>
        </div>

        <form onSubmit={handlePassword(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              {...regPassword("current_password")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
            {passwordErrors.current_password && (
              <p className="text-xs text-red-500 mt-1">
                {passwordErrors.current_password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              {...regPassword("new_password")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
            {passwordErrors.new_password && (
              <p className="text-xs text-red-500 mt-1">
                {passwordErrors.new_password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              {...regPassword("confirm_password")}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
            {passwordErrors.confirm_password && (
              <p className="text-xs text-red-500 mt-1">
                {passwordErrors.confirm_password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {passwordLoading ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
