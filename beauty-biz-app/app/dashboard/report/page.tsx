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
        period: (metrics as any).period,
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
    <main className="page-bg">
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="stack-16">
            <h1 style={{ fontSize: 34 }}>Report</h1>
            <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>
              ← Back
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={loadMetrics} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh metrics"}
            </button>

            <button
              className="btn btn-primary"
              onClick={generateSummary}
              disabled={loadingSummary || !metrics}
              style={{ opacity: loadingSummary || !metrics ? 0.6 : 1 }}
            >
              {loadingSummary ? "Generating..." : "Generate AI summary"}
            </button>
          </div>
        </div>

        {err && <Box kind="error">{err}</Box>}
        {msg && <Box kind="ok">{msg}</Box>}

        {/* Overview */}
        <section
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            marginTop: 16,
          }}
        >
          <MetricCard title="Completed appointments" value={String(completedCount)} subtitle="Completed" />
          <MetricCard title="Scheduled appointments" value={String(scheduledCount)} subtitle="Upcoming" />
          <MetricCard title="Canceled appointments" value={String(canceledCount)} subtitle="Canceled" />
          <MetricCard title="Inventory items" value={String(metrics?.totals.supplies ?? 0)} subtitle="Supplies tracked" />
        </section>

        {/* Top services */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Top services (completed)</h2>

          {!metrics ? (
            <div className="small" style={{ marginTop: 12 }}>
              Loading…
            </div>
          ) : metrics.topServices.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No completed services yet.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Count</th>
                    <th>Price (current)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topServices.map((s) => (
                    <tr key={s.serviceId}>
                      <td style={{ fontWeight: 800 }}>{s.name}</td>
                      <td>{s.count}</td>
                      <td>{s.price ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="small" style={{ marginTop: 10 }}>
                Counts are based on completed appointments.
              </div>
            </div>
          )}
        </section>

        {/* Low supplies */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Low inventory</h2>

          {!metrics ? (
            <div className="small" style={{ marginTop: 12 }}>
              Loading…
            </div>
          ) : metrics.lowSupplies.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No supplies below reorder threshold.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Supply</th>
                    <th>Quantity left</th>
                    <th>Reorder at</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.lowSupplies.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 800 }}>{s.name}</td>
                      <td>
                        {s.quantity} {s.unit ?? ""}
                      </td>
                      <td>
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
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Most-used supplies (from logs)</h2>

          {!metrics ? (
            <div className="small" style={{ marginTop: 12 }}>
              Loading…
            </div>
          ) : metrics.topUsage.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No usage logs yet. Use “Update supplies per service” to generate logs.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Supply</th>
                    <th>Used</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topUsage.map((u) => (
                    <tr key={u.supplyId}>
                      <td style={{ fontWeight: 800 }}>{u.name}</td>
                      <td>
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
        <section className="card" style={{ marginTop: 16 }}>
          <h2>AI summary</h2>

          <div className="small" style={{ marginTop: 10 }}>
            Click “Generate AI summary” to get a short, actionable summary based on your real metrics + inventory.
          </div>

          {summary ? (
            <div
              className="card-tight"
              style={{
                marginTop: 12,
                whiteSpace: "pre-line",
                lineHeight: 1.6,
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              {summary}
            </div>
          ) : (
            <div className="small" style={{ marginTop: 12 }}>
              No summary yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="card">
      <div style={{ fontWeight: 900, color: "var(--text)" }}>{title}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>{value}</div>
      {subtitle && (
        <div className="small" style={{ marginTop: 6 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Box({ kind, children }: { kind: "error" | "ok"; children: any }) {
  const className = kind === "error" ? "alert alert-danger" : "alert alert-accent";
  return (
    <div className={className} style={{ marginTop: 14 }}>
      {children}
    </div>
  );
}
