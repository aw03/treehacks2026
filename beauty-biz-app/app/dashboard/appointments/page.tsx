"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  client: { name: string } | null;
  service: { name: string } | null;
};

const STATUS_OPTIONS: AppointmentStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
];

export default function AppointmentsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // filters (YYYY-MM-DD)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // local edits (appointmentId -> status)
  const [draftStatus, setDraftStatus] = useState<Record<string, AppointmentStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  async function load() {
    if (!businessId) return;
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const qs = new URLSearchParams({ businessId });
      if (from) qs.set("from", new Date(from + "T00:00:00").toISOString());
      if (to) qs.set("to", new Date(to + "T23:59:59").toISOString());

      const res = await fetch(`/api/appointments?${qs.toString()}`);
      const text = await res.text();
      if (!text) throw new Error("Empty response from appointments API.");
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data?.error ?? "Failed to load appointments");

      const list: Appointment[] = data.appointments ?? [];
      setAppointments(list);

      // initialize draft statuses from server statuses
      const nextDraft: Record<string, AppointmentStatus> = {};
      for (const a of list) nextDraft[a.id] = a.status;
      setDraftStatus(nextDraft);

      setMsg("Loaded appointments ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (businessId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const hasChanges = useMemo(() => {
    return appointments.some((a) => draftStatus[a.id] && draftStatus[a.id] !== a.status);
  }, [appointments, draftStatus]);

  async function saveStatus(appointmentId: string) {
    setErr(null);
    setMsg(null);

    const newStatus = draftStatus[appointmentId];
    const current = appointments.find((a) => a.id === appointmentId);
    if (!current) return;

    if (!newStatus) return setErr("Pick a status.");
    if (newStatus === current.status) return;

    setSavingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const text = await res.text();
      if (!text) throw new Error("Empty response from status update API.");
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data?.error ?? "Failed to update status");

      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );

      setMsg(`Updated status → ${newStatus} ✅`);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setDraftStatus((prev) => ({ ...prev, [appointmentId]: current.status }));
    } finally {
      setSavingId(null);
    }
  }

  async function saveAll() {
    setErr(null);
    setMsg(null);

    const changed = appointments
      .filter((a) => draftStatus[a.id] && draftStatus[a.id] !== a.status)
      .map((a) => a.id);

    if (changed.length === 0) return;

    for (const id of changed) {
      // eslint-disable-next-line no-await-in-loop
      await saveStatus(id);
    }
  }

  return (
    <main className="page-bg">
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div className="stack-16">
            <h1 style={{ fontSize: 34 }}>Appointments</h1>
            <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>
              ← Back
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              className="btn btn-primary"
              onClick={saveAll}
              disabled={!hasChanges || savingId !== null}
              style={{
                opacity: !hasChanges || savingId !== null ? 0.6 : 1,
              }}
            >
              Save all changes
            </button>
          </div>
        </div>

        {/* Alerts */}
        {err && (
          <div className="alert alert-danger" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}
        {msg && (
          <div className="alert alert-accent" style={{ marginTop: 14 }}>
            {msg}
          </div>
        )}

        {/* Filter */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Filter</h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr 1fr auto",
              marginTop: 12,
              alignItems: "end",
            }}
          >
            <label className="stack-16" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 800, color: "var(--text)" }}>
                From
              </div>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>

            <label className="stack-16" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 800, color: "var(--text)" }}>
                To
              </div>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>

            <button className="btn btn-secondary" onClick={load}>
              Apply
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Upcoming / recent</h2>

          {appointments.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No appointments yet.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Update</th>
                  </tr>
                </thead>

                <tbody>
                  {appointments.map((a) => {
                    const draft = draftStatus[a.id] ?? a.status;
                    const dirty = draft !== a.status;

                    return (
                      <tr key={a.id}>
                        <td style={{ verticalAlign: "top" }}>
                          {new Date(a.startTime).toLocaleString()} →{" "}
                          {new Date(a.endTime).toLocaleString()}
                        </td>
                        <td style={{ verticalAlign: "top" }}>{a.client?.name ?? "-"}</td>
                        <td style={{ verticalAlign: "top" }}>{a.service?.name ?? "-"}</td>

                        <td style={{ verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <select
                              value={draft}
                              onChange={(e) =>
                                setDraftStatus((prev) => ({
                                  ...prev,
                                  [a.id]: e.target.value as AppointmentStatus,
                                }))
                              }
                              style={{ maxWidth: 220 }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            {dirty && (
                              <span className="small" style={{ color: "var(--muted)" }}>
                                Unsaved
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ textAlign: "right", verticalAlign: "top" }}>
                          <button
                            className={dirty ? "btn btn-primary" : "btn btn-secondary"}
                            onClick={() => saveStatus(a.id)}
                            disabled={savingId !== null && savingId !== a.id}
                            style={{
                              opacity: savingId === a.id ? 0.7 : 1,
                            }}
                          >
                            {savingId === a.id ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
