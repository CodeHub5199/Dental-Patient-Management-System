const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const API_BASE = `${BACKEND_URL}/api/v1`;

// Server-side fetcher (no auth token — used in Server Components that don't need auth)
async function serverFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSummary() {
  return serverFetch("/dashboard/summary");
}

export async function fetchTodayAppointments() {
  const today = new Date().toISOString().split("T")[0];
  return serverFetch(`/appointments?date=${today}&per_page=50`);
}
