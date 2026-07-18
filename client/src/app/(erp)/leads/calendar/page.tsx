"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchLeadCalendar, fetchLeads } from "@/lib/api/leads";
import { formatDate } from "@/lib/format";

export default function LeadsCalendarPage() {
  const [data, setData] = useState<{
    appointments: Array<{ id: string; title: string; scheduledAt: string; leadName: string; assignedToName?: string }>;
    followUps: Array<{ id: string; dueAt: string; note?: string; leadName: string; assignedToName?: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedToId, setAssignedToId] = useState("");
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    fetchLeads()
      .then((leads) => {
        const map = new Map<string, string>();
        for (const lead of leads) {
          if (lead.assignedToId && lead.assignedToName) {
            map.set(lead.assignedToId, lead.assignedToName);
          }
        }
        setStaffOptions(
          [...map.entries()].map(([id, name]) => ({ id, name })),
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLeadCalendar(assignedToId || undefined)
      .then(setData)
      .finally(() => setLoading(false));
  }, [assignedToId]);

  const filteredAppointments = useMemo(
    () => data?.appointments ?? [],
    [data],
  );
  const filteredFollowUps = useMemo(() => data?.followUps ?? [], [data]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content space-y-4">
      <PageHeader
        title="Leads Calendar"
        subtitle="Upcoming appointments and follow-ups"
        action={
          <Link href="/leads" className="btn-secondary text-sm">
            ← Pipeline
          </Link>
        }
      />

      <div className="filter-bar mb-4">
        <select
          className="filter-select"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
        >
          <option value="">All assigned staff</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Appointments</h2>
          <ul className="space-y-2">
            {filteredAppointments.map((a) => (
              <li key={a.id} className="text-sm border-b border-zinc-100 py-2">
                <p className="font-medium">{a.title}</p>
                <p className="text-zinc-600">{a.leadName}</p>
                <p className="text-xs text-zinc-400">{formatDate(a.scheduledAt)}</p>
              </li>
            ))}
            {filteredAppointments.length === 0 && (
              <p className="text-sm text-zinc-400">No upcoming appointments.</p>
            )}
          </ul>
        </div>

        <div className="surface-card rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Follow-ups due</h2>
          <ul className="space-y-2">
            {filteredFollowUps.map((f) => (
              <li key={f.id} className="text-sm border-b border-zinc-100 py-2">
                <p className="font-medium">{f.leadName}</p>
                {f.note && <p className="text-zinc-600">{f.note}</p>}
                <p className="text-xs text-zinc-400">{formatDate(f.dueAt)}</p>
              </li>
            ))}
            {filteredFollowUps.length === 0 && (
              <p className="text-sm text-zinc-400">No pending follow-ups.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
