"use client";

import { cn } from "@/lib/utils";
import type { DocumentType } from "@/types";

const FILTER_OPTIONS: { value: DocumentType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "xray", label: "X-Ray" },
  { value: "photo", label: "Photo" },
  { value: "consent_form", label: "Consent" },
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "other", label: "Other" },
];

interface DocumentTypeFilterProps {
  value: DocumentType | "all";
  onChange: (value: DocumentType | "all") => void;
}

export function DocumentTypeFilter({ value, onChange }: DocumentTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            value === opt.value
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
