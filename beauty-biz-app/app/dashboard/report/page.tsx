"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  period?: { start: string; end: string };
  appointmentCounts: { status: string; count: number }[];
  bookingInsights?: {
    avgLeadDays: number | null;
    medianLeadDays: number | null;
    sameDayPct: number | null;
    advanceBuckets: { bucket: string; count: number }[];
    busiestDays: { day: string; count: number }[];
    busiestHours: { hour: number; label: string; count: number }[];
  };
  topServices: { serviceId: string; name: string; count: number; price: string | null }[];
  lowSupplies: { id: string; name: string; quantity: string; unit: string | null; reorderAt: string | null }[];
  topUsage: { supplyId: string; name: string; used: string; unit: string | null }[];
  totals: { services: number; supplies: number };
};


function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("businessId");
}

export default function ReportPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [summary, setSummary] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = getBusinessId();
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  const completedCount = useMemo(() => {
    if (!metrics) return 0;
    return metrics.appointmentCounts.find((r) => r.status === "COMPLETED")?.count ?? 0;
  }, [metrics]);

  const scheduledCount = useMemo(() => {
    if (!metrics) return 0;
    return metrics.appointmentCounts.find((r) => r.status === "SCHEDULED")?.count ?? 0;
  }, [metrics]);

  const canceledCount = useMemo(() => {
    if (!metrics) return 0;
    return metrics.appointmentCounts.find((r) => r.status === "CANCELED")?.count ?? 0;
  }, [metrics]);

  async function loadMetrics() {
    if (!businessId) return;
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/report/metrics?businessId=${businessId}`);
      // const data = await res.json();
      const text = await res.text();
      if (!text) throw new Error("Metrics API returned an empty response (route likely crashed).");

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Metrics API returned non-JSON (likely crashed). Response: " + text.slice(0, 120));
      }

      if (!res.ok) throw new Error(data?.error ?? "Failed to load metrics");
      setMetrics(data);
      if (!res.ok) throw new Error(data?.error ?? "Failed to load metrics");

      setMetrics(data);
      setMsg("Loaded report metrics ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    if (!businessId) return;
    if (!metrics) {
      setErr("Load metrics first.");
      return;
    }

    setErr(null);
    setMsg(null);
    setLoadingSummary(true);

    try {
      const payload = {
        businessId,
        period: (metrics as any).period, // because Metrics type doesn’t include it yet
        metrics: {
          appointmentCounts: metrics.appointmentCounts,
          bookingInsights: (metrics as any).bookingInsights,
          topServices: metrics.topServices,
          lowSupplies: metrics.lowSupplies,
          topUsage: metrics.topUsage,
          totals: metrics.totals,
        },
      };

      const res = await fetch("/api/report/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate summary");

      setSummary(data.summary ?? "");
      setMsg("Generated AI summary ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    if (businessId) loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Report</h1>
          <button onClick={() => router.push("/dashboard")} style={{ marginTop: 12, ...buttonStyle }}>
            ← Back
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={loadMetrics} disabled={loading} style={buttonStyle}>
            {loading ? "Refreshing..." : "Refresh metrics"}
          </button>
          <button onClick={generateSummary} disabled={loadingSummary || !metrics} style={{ ...buttonStyle, background: "#eef6ff" }}>
            {loadingSummary ? "Generating..." : "Generate AI summary"}
          </button>
        </div>
      </div>

      {err && <Box kind="error">{err}</Box>}
      {msg && <Box kind="ok">{msg}</Box>}

      {/* Overview cards */}
      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 16 }}>
        <Card title="Completed appointments" value={String(completedCount)} subtitle="Completed" />
        <Card title="Scheduled appointments" value={String(scheduledCount)} subtitle="Upcoming" />
        <Card title="Canceled appointments" value={String(canceledCount)} subtitle="Canceled" />
        <Card title="Inventory items" value={String(metrics?.totals.supplies ?? 0)} subtitle="Supplies tracked" />
      </section>

      {/* Top services */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Top services (completed)</h2>
        {!metrics ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Loading…</div>
        ) : metrics.topServices.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No completed services yet.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Count</th>
                  <th style={thStyle}>Price (current)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topServices.map((s) => (
                  <tr key={s.serviceId}>
                    <td style={tdStyle}>{s.name}</td>
                    <td style={tdStyle}>{s.count}</td>
                    <td style={tdStyle}>{s.price ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
              Counts are based on completed appointments.
            </div>
          </div>
        )}
      </section>

      {/* Low supplies */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Low inventory</h2>
        {!metrics ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Loading…</div>
        ) : metrics.lowSupplies.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No supplies below reorder threshold.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Supply</th>
                  <th style={thStyle}>Quantity left</th>
                  <th style={thStyle}>Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {metrics.lowSupplies.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.name}</td>
                    <td style={tdStyle}>
                      {s.quantity} {s.unit ?? ""}
                    </td>
                    <td style={tdStyle}>
                      {s.reorderAt ?? "—"} {s.unit ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top usage */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Most-used supplies (from logs)</h2>
        {!metrics ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Loading…</div>
        ) : metrics.topUsage.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>
            No usage logs yet. Use “Update supplies per service” to generate logs.
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Supply</th>
                  <th style={thStyle}>Used</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topUsage.map((u) => (
                  <tr key={u.supplyId}>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>
                      {u.used} {u.unit ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI summary */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>AI summary</h2>
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          Click “Generate AI summary” to get a short, actionable summary based on your real metrics + inventory.
        </div>

        <div style={{ marginTop: 12 }}>
        {summary ? (
  <div
    style={{
      marginTop: 10,
      whiteSpace: "pre-line",
      padding: 14,
      borderRadius: 12,
      border: "1px solid #eee",
      background: "#fafafa",
      lineHeight: 1.5,
      fontSize: 14,
    }}
  >
    {summary}
  </div>
) : (
  <div style={{ marginTop: 10, opacity: 0.7 }}>No summary yet.</div>
)}

        </div>
      </section>
    </main>
  );
}

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>{value}</div>
      {subtitle && <div style={{ marginTop: 4, opacity: 0.75 }}>{subtitle}</div>}
    </div>
  );
}

function Box({ kind, children }: { kind: "error" | "ok"; children: any }) {
  const style =
    kind === "error"
      ? { border: "1px solid #f5c2c7", background: "#f8d7da" }
      : { border: "1px solid #cfe2ff", background: "#e7f1ff" };

  return (
    <div style={{ marginTop: 14, padding: 12, borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 14, padding: 16 };
const h2Style: React.CSSProperties = { fontSize: 18, fontWeight: 900, margin: 0 };

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #ccc",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 800,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #ddd",
  fontWeight: 900,
  opacity: 0.85,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
};

// const preStyle: React.CSSProperties = {
//   whiteSpace: "pre-wrap",
//   padding: 12,
//   borderRadius: 12,
//   border: "1px solid #eee",
//   background: "#fafafa",
//   margin: 0,
// };
