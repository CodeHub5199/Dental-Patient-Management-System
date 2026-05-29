# Design Plan: Dashboard

**Document Version:** 1.0
**Feature:** Dashboard (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Implement the landing page of the DPMS — a read-only operational summary that gives any logged-in staff member an instant view of today's clinic state: appointment counts by status, a chronological appointment list, and three key-performance indicators (total active patients, new patients this month, today's revenue). The page must load quickly (under 1 second initial render), update automatically every 60 seconds, and handle empty-state conditions gracefully. No data is created or modified from this screen.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Two dedicated dashboard/analytics endpoints |
| **ORM** | SQLAlchemy 2.x async | Aggregation queries for stats; appointment list with joins |
| **Database** | Supabase PostgreSQL | Aggregation: `COUNT`, `SUM`, `GROUP BY`, date filtering |
| **Frontend** | Next.js 14 App Router (Server + Client Components) | Server Component for initial SSR load; Client Component for auto-refresh |
| **UI Components** | shadcn/ui `Card`, `Badge`, `Skeleton`, `Table` | Stat cards, status badges, appointment table, loading states |
| **Auto-Refresh** | `useEffect` + `setInterval` + `router.refresh()` | Polls for new data every 60 seconds without full page reload |
| **Date Handling** | `date-fns` (frontend), Python `date.today()` (backend) | Current date computation in clinic timezone |
| **Loading States** | shadcn/ui `Skeleton` | Skeleton placeholders during data fetch |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                                                                  │
│  /dashboard (Server Component — SSR on initial load)             │
│  ├─ DashboardClient (Client Component — wraps entire page)       │
│  │   ├─ useAutoRefresh(60000) ──► router.refresh() on tick       │
│  │   │                                                           │
│  │   ├─ QuickStatCards                                           │
│  │   │   ├─ StatCard "Total Active Patients"                     │
│  │   │   ├─ StatCard "New This Month"                            │
│  │   │   └─ StatCard "Revenue Today"                             │
│  │   │                                                           │
│  │   ├─ AppointmentSummaryBar                                    │
│  │   │   └─ StatusCount × 7 (Scheduled/Confirmed/…)             │
│  │   │                                                           │
│  │   └─ TodayAppointmentTable                                    │
│  │       ├─ columns: Time | Patient | Type | Status              │
│  │       └─ row click ──► /appointments/{id}                     │
│  │                                                               │
│  └─ ManualRefreshButton ──► router.refresh()                     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS (two parallel requests on load)
                         ┌────────┴────────┐
                         ▼                 ▼
              GET /dashboard/summary    GET /appointments
              (stats + counts)          ?date=today&per_page=50
                         │                 │
                         └────────┬────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND                            │
│                                                                  │
│  GET /dashboard/summary                                          │
│  ├─ appointment status counts (today)                            │
│  ├─ total active patients                                        │
│  ├─ new patients this month                                      │
│  └─ revenue today (sum of completed treatment amounts)           │
│                                                                  │
│  GET /appointments?date=today                                    │
│  └─ (reuses existing appointments list endpoint)                 │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ asyncpg
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL                            │
│                                                                  │
│  Single aggregation query:                                       │
│  ├─ COUNT appointments by status WHERE date = today              │
│  ├─ COUNT patients WHERE is_active = true                        │
│  ├─ COUNT patients WHERE registration_date >= first_of_month     │
│  └─ SUM treatments.amount WHERE performed_date = today           │
│        AND status = 'completed'                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

The dashboard has **no dedicated tables**. It reads from existing tables:

| Stat | Source Table | Query |
|---|---|---|
| Appointment counts by status | `appointments` | `SELECT status, COUNT(*) GROUP BY status WHERE appointment_date = $today` |
| Total active patients | `patients` | `SELECT COUNT(*) WHERE is_active = TRUE` |
| New patients this month | `patients` | `SELECT COUNT(*) WHERE registration_date >= date_trunc('month', NOW())` |
| Revenue today | `treatments` | `SELECT COALESCE(SUM(amount), 0) WHERE performed_date = $today AND status = 'completed'` |
| Today's appointment list | `appointments` + `patients` JOIN | `SELECT … JOIN patients WHERE appointment_date = $today ORDER BY start_time` |

### Aggregation Query for `/dashboard/summary`

The entire summary is computed in a **single round-trip** using a CTE (Common Table Expression):

```sql
WITH
appointment_counts AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled')   AS scheduled,
        COUNT(*) FILTER (WHERE status = 'confirmed')   AS confirmed,
        COUNT(*) FILTER (WHERE status = 'checked_in')  AS checked_in,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')   AS cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show')     AS no_show,
        COUNT(*)                                        AS total
    FROM appointments
    WHERE appointment_date = $today
),
patient_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE is_active = TRUE)                           AS total_active,
        COUNT(*) FILTER (WHERE registration_date >= date_trunc('month', NOW()) AND is_active = TRUE) AS new_this_month
    FROM patients
),
revenue AS (
    SELECT COALESCE(SUM(amount), 0) AS total_amount_today
    FROM treatments
    WHERE performed_date = $today AND status = 'completed'
)
SELECT
    ac.*,
    ps.total_active,
    ps.new_this_month,
    rv.total_amount_today
FROM appointment_counts ac, patient_stats ps, revenue rv;
```

### Response Schema

```python
class AppointmentCounts(BaseModel):
    total:       int
    scheduled:   int
    confirmed:   int
    checked_in:  int
    in_progress: int
    completed:   int
    cancelled:   int
    no_show:     int

class DashboardSummary(BaseModel):
    date:                    date
    appointments:            AppointmentCounts
    total_active_patients:   int
    new_patients_this_month: int
    revenue_today:           Decimal
```

---

## 5. Core Design Decisions

### 5.1 Single CTE Query for All Stats

**Decision:** All summary statistics (appointment counts, patient totals, revenue) are computed in a single SQL query using CTEs rather than four separate queries.

**Rationale:** Reduces latency from 4 × round-trip to 1 × round-trip. On PostgreSQL, the query planner can execute the independent CTEs in parallel internally. The endpoint response time target is under 100ms.

### 5.2 Server-Rendered Initial Load + Client-Side Polling

**Decision:** The dashboard page is a Next.js Server Component that fetches data server-side on the initial request (SSR). A thin Client Component wrapper adds the 60-second `setInterval` + `router.refresh()` for subsequent updates.

**Rationale:** SSR gives the fastest time-to-first-meaningful-paint — the user sees real data immediately with no loading spinner. Client-side polling handles updates without a WebSocket infrastructure. `router.refresh()` re-runs the Server Component's data fetch, updating all props without a full page navigation.

```typescript
// DashboardClient.tsx (Client Component)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}
```

### 5.3 Parallel Data Fetching in Server Component

**Decision:** The dashboard Server Component fetches `/dashboard/summary` and `/appointments?date=today` in parallel using `Promise.all`, not sequentially.

**Rationale:** The two data sets are independent. Sequential fetching would add ~100ms latency unnecessarily.

```typescript
// dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  const [summary, appointments] = await Promise.all([
    fetchSummary(),           // GET /dashboard/summary
    fetchTodayAppointments(), // GET /appointments?date=today
  ]);
  return (
    <DashboardClient>
      <QuickStatCards summary={summary} />
      <AppointmentSummaryBar counts={summary.appointments} />
      <TodayAppointmentTable appointments={appointments} />
    </DashboardClient>
  );
}
```

### 5.4 Revenue Disclaimer in UI

**Decision:** The "Revenue Today" stat card displays a subtitle: *"Based on logged treatment fees. Not an accounting figure."*

**Rationale:** The revenue figure is derived from treatment `amount` fields, which are optional and entered by the dentist. It does not reflect payments received, insurance adjustments, or unpaid invoices. This disclaimer prevents the practitioner from misinterpreting the figure as confirmed income.

### 5.5 Skeleton Loading During Refresh

**Decision:** During the 60-second auto-refresh cycle, skeleton placeholders replace the stat card values and table rows while data is re-fetching, rather than showing stale data with a spinner overlay.

**Rationale:** Skeleton loading communicates clearly that data is being refreshed without blocking the user from reading the current (stale) state. Implementation uses shadcn/ui `Skeleton` components with matching dimensions to the real content.

---

## 6. Core Functional Flows

### 6.1 Dashboard Initial Load (SSR)

```
Browser                         Next.js Server               FastAPI               PostgreSQL
  │                                  │                            │                      │
  ├─ GET /dashboard ────────────────►│                            │                      │
  │                                  ├─ Promise.all([             │                      │
  │                                  │   fetch /dashboard/summary,│                      │
  │                                  │   fetch /appointments?date │                      │
  │                                  │  ]) ───────────────────────►│                     │
  │                                  │                            ├─ CTE aggregation ───►│
  │                                  │                            │◄─── summary data ───-┤
  │                                  │                            ├─ appointments query ►│
  │                                  │                            │◄─── appt list ───────┤
  │                                  │◄──── {summary, appointments}                      │
  │                                  │                            │                      │
  │                                  ├─ render full HTML (SSR)    │                      │
  │◄─ HTML with data ────────────────┤                            │                      │
  │  (no loading spinner needed)     │                            │                      │
```

### 6.2 Auto-Refresh Cycle

```
DashboardClient (60s interval)    Next.js Server               FastAPI
  │                                  │                            │
  ├─ router.refresh() ──────────────►│                            │
  │  (no full navigation)            ├─ re-run Server Component   │
  │                                  ├─ Promise.all([...]) ──────►│
  │  (skeleton shown during fetch)   │◄──── fresh data ───────────┤
  │                                  ├─ send updated React tree   │
  │◄─ updated stat cards + table ────┤                            │
```

### 6.3 Empty State (No Appointments Today)

```
FastAPI /dashboard/summary (today = Sunday, clinic closed)

DB returns:
  appointment_counts: all zeros
  patient_stats: 1050 total active, 3 new this month
  revenue: 0.00

Response:
{
  "date": "2026-05-31",
  "appointments": { "total": 0, "scheduled": 0, ... },
  "total_active_patients": 1050,
  "new_patients_this_month": 3,
  "revenue_today": 0.00
}

Frontend renders:
  ├─ AppointmentSummaryBar: all counts show 0
  ├─ TodayAppointmentTable: "No appointments scheduled for today."
  ├─ StatCard "Total Active Patients": 1,050
  ├─ StatCard "New This Month": 3
  └─ StatCard "Revenue Today": $0.00
```

---

## 7. Development Plan

### Sprint 7 — Week 2: Backend

| Task | Detail | Est. |
|---|---|---|
| `GET /dashboard/summary` endpoint | CTE aggregation query; response schema; unit tests with date mocking | 1.5d |
| Edge case handling | `NULL` revenue → 0.00; empty appointment set → all-zero counts | 0.5d |
| Timezone handling | Accept optional `timezone` param; default to clinic settings timezone | 0.5d |

*(The `/appointments?date=today` call reuses the existing appointments endpoint — no new work required.)*

### Sprint 7 — Week 2: Frontend

| Task | Detail | Est. |
|---|---|---|
| Dashboard page (`/dashboard`) | Server Component structure; parallel `Promise.all` fetches | 1d |
| `DashboardClient` wrapper | `useEffect` + `setInterval` + `router.refresh()` | 0.5d |
| `QuickStatCards` component | Three shadcn/ui `Card` components with icons, values, subtitles | 1d |
| `AppointmentSummaryBar` component | 7-status count badges, colour-coded by status category | 0.5d |
| `TodayAppointmentTable` component | Sortable by time, clickable rows, status `Badge`, empty state | 1.5d |
| `Skeleton` loading states | Skeleton placeholders for all three cards + table rows | 0.5d |
| Revenue disclaimer | Subtitle text on stat card | 0.25d |
| Integration tests | Load with appointments, load with no appointments, refresh cycle | 0.5d |

### Definition of Done

- [ ] Dashboard loads with real data (no loading spinner) within 1 second on initial page visit.
- [ ] All appointment counts match the raw values in the `appointments` table for `appointment_date = today`.
- [ ] Revenue Today correctly sums only `completed` treatments with a non-null `amount` for today's date.
- [ ] When there are no appointments, all counts display as 0 and the table shows an empty-state message.
- [ ] Clicking an appointment row navigates to `/appointments/{id}`.
- [ ] Auto-refresh updates data within 60–65 seconds of a status change made elsewhere.
- [ ] Manual refresh button re-fetches immediately.
- [ ] Revenue Today stat card displays the disclaimer subtitle.
- [ ] No data creation or modification is possible from the dashboard page (no forms or action buttons).
- [ ] Skeleton loading components appear during the refresh cycle and are replaced by updated values on completion.
