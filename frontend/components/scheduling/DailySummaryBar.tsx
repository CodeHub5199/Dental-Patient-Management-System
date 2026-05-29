import { cn } from "@/lib/utils";

interface Props {
  counts: Record<string, number>;
  total?: number;
}

const STATUS_DISPLAY = [
  { key: "scheduled",   label: "Scheduled",   dot: "bg-slate-400" },
  { key: "confirmed",   label: "Confirmed",   dot: "bg-blue-500" },
  { key: "checked_in",  label: "Checked In",  dot: "bg-amber-500" },
  { key: "in_progress", label: "In Progress", dot: "bg-orange-500" },
  { key: "completed",   label: "Completed",   dot: "bg-green-500" },
  { key: "cancelled",   label: "Cancelled",   dot: "bg-red-400" },
  { key: "no_show",     label: "No Show",     dot: "bg-gray-400" },
];

export function DailySummaryBar({ counts, total }: Props) {
  const derivedTotal = total ?? Object.values(counts).reduce((s, n) => s + n, 0);

  if (derivedTotal === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 rounded-lg text-sm text-muted-foreground">
        No appointments scheduled for today
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 bg-muted/40 rounded-lg">
      <span className="text-sm font-semibold text-foreground">
        {derivedTotal} appointment{derivedTotal !== 1 ? "s" : ""}
      </span>
      {STATUS_DISPLAY.map(({ key, label, dot }) => {
        const count = counts[key] ?? 0;
        if (count === 0) return null;
        return (
          <span key={key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
            <span className="font-medium text-foreground">{count}</span> {label}
          </span>
        );
      })}
    </div>
  );
}
