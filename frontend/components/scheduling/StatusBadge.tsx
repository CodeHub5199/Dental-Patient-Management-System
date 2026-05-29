import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  scheduled:   { label: "Scheduled",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  confirmed:   { label: "Confirmed",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  checked_in:  { label: "Checked In",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", className: "bg-orange-100 text-orange-700 border-orange-200" },
  completed:   { label: "Completed",   className: "bg-green-100 text-green-700 border-green-200" },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-600 border-red-200" },
  no_show:     { label: "No Show",     className: "bg-gray-100 text-gray-500 border-gray-200" },
};

interface Props {
  status: AppointmentStatus | string;
  size?: "sm" | "xs";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: Props) {
  const config = STATUS_CONFIG[status as AppointmentStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
