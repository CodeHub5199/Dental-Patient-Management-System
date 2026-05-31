"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/communications", label: "Communications", icon: MessageSquare },
];

const dentistNavItems = [
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "Staff", icon: UserCog },
];

const NAV_BG = "#0A1628";
const ACTIVE_BG = "#1d6fd6";
const HOVER_BG = "rgba(255,255,255,0.07)";

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isDentist = user?.role === "dentist";
  const navItems = isDentist ? [...baseNavItems, ...dentistNavItems] : baseNavItems;

  const [clinicName, setClinicName] = useState("Dental Suite");
  useEffect(() => {
    apiClient.get<{ clinic_name: string }>("/settings/clinic")
      .then((res) => { if (res.data.clinic_name) setClinicName(res.data.clinic_name); })
      .catch(() => { /* keep fallback */ });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const avatarInitials = (user?.full_name ?? "?")
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="w-60 shrink-0 flex flex-col select-none"
      style={{ backgroundColor: NAV_BG }}
    >
      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div
        className="h-16 flex items-center gap-3 px-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #2979ff 0%, #0d47a1 100%)",
            boxShadow: "0 2px 8px rgba(29,111,214,0.45)",
          }}
        >
          {/* Tooth silhouette icon */}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M12 3C9.79 3 8 4.79 8 7c0 1.3.56 2.47 1.45 3.28C8.56 11.42 8 12.7 8 14c0 1.85.42 3.56 1.11 5.05.28.61.56 1.28.89 1.95h4c.33-.67.61-1.34.89-1.95C15.58 17.56 16 15.85 16 14c0-1.3-.56-2.58-1.45-3.72C15.44 9.47 16 8.3 16 7c0-2.21-1.79-4-4-4z"
              fill="white"
              opacity="0.95"
            />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-wide">
            DPMS
          </p>
          <p
            className="text-xs leading-tight truncate max-w-[130px]"
            style={{ color: "rgba(255,255,255,0.35)" }}
            title={clinicName}
          >
            {clinicName}
          </p>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p
          className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          Menu
        </p>
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                style={{
                  backgroundColor: active ? ACTIVE_BG : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.52)",
                  boxShadow: active
                    ? "0 2px 8px rgba(29,111,214,0.35)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = HOVER_BG;
                    e.currentTarget.style.color = "rgba(255,255,255,0.88)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.52)";
                  }
                }}
              >
                <Icon
                  size={16}
                  style={{
                    color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.38)",
                    flexShrink: 0,
                  }}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── User footer ────────────────────────────────────────────────────── */}
      <div
        className="px-3 pb-4 pt-3 space-y-0.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
      >
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 w-full"
          style={{
            backgroundColor: isActive("/profile") ? ACTIVE_BG : "transparent",
            color: isActive("/profile") ? "#fff" : "rgba(255,255,255,0.6)",
          }}
          onMouseEnter={(e) => {
            if (!isActive("/profile")) {
              e.currentTarget.style.backgroundColor = HOVER_BG;
              e.currentTarget.style.color = "rgba(255,255,255,0.88)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive("/profile")) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
            }
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #2979ff, #1565c0)" }}
          >
            {avatarInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-semibold leading-none" style={{ color: "rgba(255,255,255,0.82)" }}>
              {user?.full_name ?? "Profile"}
            </span>
            <span className="text-[10px] capitalize mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
              {user?.role}
            </span>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.38)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = HOVER_BG;
            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.38)";
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
