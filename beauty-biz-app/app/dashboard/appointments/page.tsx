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

const STATUS_OPTIONS: AppointmentStatus[] = ["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"];

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
    if (newStatus === current.status) return; // nothing to do

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

      // update local list
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );

      setMsg(`Updated status → ${newStatus} ✅`);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      // revert draft to current if error
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

    // Save sequentially (simple + safe)
    for (const id of changed) {
      // eslint-disable-next-line no-await-in-loop
      await saveStatus(id);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Appointments</h1>
          <button onClick={() => router.push("/dashboard")} style={{ ...buttonStyle, marginTop: 10 }}>
            ← Back
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading} style={buttonStyle}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={saveAll}
            disabled={!hasChanges || savingId !== null}
            style={{ ...buttonStyle, background: hasChanges ? "#eef6ff" : "#f5f5f5" }}
          >
            Save all changes
          </button>
        </div>
      </div>

      {err && <ErrorBox msg={err} />}
      {msg && <OkBox msg={msg} />}

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Filter</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr auto", marginTop: 10 }}>
          <label>
            <div style={{ fontWeight: 800 }}>From</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div style={{ fontWeight: 800 }}>To</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </label>
          <button style={{ ...buttonStyle, alignSelf: "end" }} onClick={load}>
            Apply
          </button>
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Upcoming / recent</h2>

        {appointments.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No appointments yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Update</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const draft = draftStatus[a.id] ?? a.status;
                const dirty = draft !== a.status;

                return (
                  <tr key={a.id}>
                    <td style={tdStyle}>
                      {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                    </td>
                    <td style={tdStyle}>{a.client?.name ?? "-"}</td>
                    <td style={tdStyle}>{a.service?.name ?? "-"}</td>

                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <select
                          value={draft}
                          onChange={(e) =>
                            setDraftStatus((prev) => ({
                              ...prev,
                              [a.id]: e.target.value as AppointmentStatus,
                            }))
                          }
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #ccc",
                            fontWeight: 700,
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        {dirty && <span style={{ fontSize: 12, opacity: 0.7 }}>Unsaved</span>}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => saveStatus(a.id)}
                        disabled={savingId !== null && savingId !== a.id}
                        style={{
                          ...buttonStyle,
                          background: dirty ? "#eef6ff" : "#f5f5f5",
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
        )}
      </section>
    </main>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ marginTop: 14, padding: 12, border: "1px solid #f5c2c7", background: "#f8d7da", borderRadius: 12 }}>
      {msg}
    </div>
  );
}

function OkBox({ msg }: { msg: string }) {
  return (
    <div style={{ marginTop: 14, padding: 12, border: "1px solid #cfe2ff", background: "#e7f1ff", borderRadius: 12 }}>
      {msg}
    </div>
  );
}

const cardStyle: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 14, padding: 16 };
const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: 0 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 10 };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontWeight: 700 };
const thStyle: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px", fontWeight: 800 };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "10px 8px", verticalAlign: "top" };
