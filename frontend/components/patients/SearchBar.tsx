"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface QuickResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  last_visit_date: string | null;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get("/patients/search/quick", { params: { q, limit: 10 } });
      setResults(res.data.data ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/patients/${id}`);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    clearTimeout(timerRef.current);
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search patients..."
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50 overflow-hidden">
          {results.length > 0 ? (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex justify-between items-center gap-4"
                onMouseDown={() => handleSelect(p.id)}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.phone}</p>
                </div>
                {p.last_visit_date && (
                  <p className="text-xs text-muted-foreground shrink-0">
                    Last: {formatDate(p.last_visit_date)}
                  </p>
                )}
              </button>
            ))
          ) : !loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No patients found</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
