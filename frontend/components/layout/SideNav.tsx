"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  UserCog,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

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

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isDentist = user?.role === "dentist";
  const navItems = isDentist ? [...baseNavItems, ...dentistNavItems] : baseNavItems;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <span className="text-lg font-bold text-primary">DPMS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary text-primary-foreground"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-2 space-y-1 border-t border-gray-200 pt-2">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
            isActive("/profile")
              ? "bg-primary text-primary-foreground"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <UserCircle size={16} />
          <div className="flex flex-col min-w-0">
            <span className="truncate">{user?.full_name ?? "Profile"}</span>
            <span className="text-xs opacity-60 capitalize">{user?.role}</span>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
