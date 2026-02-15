"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { name: string } | null;
  service: { name: string } | null;
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // filters (YYYY-MM-DD)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  async function load() {
    if (!businessId) return;
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams({ businessId });
      if (from) qs.set("from", new Date(from + "T00:00:00").toISOString());
      if (to) qs.set("to", new Date(to + "T23:59:59").toISOString());

      const res = await fetch(`/api/appointments?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load appointments");

      setAppointments(data.appointments ?? []);
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

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Appointments</h1>
          <button onClick={() => router.push("/dashboard")} style={{ ...buttonStyle, marginTop: 10 }}>
            ← Back
          </button>
        </div>

        <button onClick={load} disabled={loading} style={buttonStyle}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && <ErrorBox msg={err} />}

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
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td style={tdStyle}>
                    {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                  </td>
                  <td style={tdStyle}>{a.client?.name ?? "-"}</td>
                  <td style={tdStyle}>{a.service?.name ?? "-"}</td>
                  <td style={tdStyle}>{a.status}</td>
                </tr>
              ))}
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

const cardStyle: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 14, padding: 16 };
const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: 0 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 10 };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontWeight: 700 };
const thStyle: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px", fontWeight: 800 };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "10px 8px", verticalAlign: "top" };
