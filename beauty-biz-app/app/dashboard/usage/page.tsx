"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CandidateAppt = {
  id: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  client: { id: string; name: string };
  service: { id: string; name: string; durationMin: number };
};

type Supply = {
  id: string;
  name: string;
  unit: string | null;
  quantity: any;
};

type Instance = any; // keep hackathon-simple; backend returns nested

type UsageRow = {
  supplyId: string;
  quantityUsed: string;
  unit?: string;
  method?: string;
  rawInput?: string;
};

function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("businessId");
}

export default function UsagePage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<CandidateAppt[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  const [mode, setMode] = useState<"APPOINTMENT" | "WALK_IN">("APPOINTMENT");
  const [selectedApptId, setSelectedApptId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [instance, setInstance] = useState<Instance | null>(null);

  const [actualDurationMin, setActualDurationMin] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = getBusinessId();
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  const selectedAppt = useMemo(
    () => candidates.find((c) => c.id === selectedApptId) ?? null,
    [candidates, selectedApptId]
  );

  async function loadBasics() {
    if (!businessId) return;
    setErr(null);
    setLoading(true);
    try {
      const [candRes, supRes, svcRes] = await Promise.all([
        fetch(`/api/usage/candidates?businessId=${businessId}`),
        fetch(`/api/supplies?businessId=${businessId}`),
        fetch(`/api/services?businessId=${businessId}`),
      ]);

      const candJson = await candRes.json();
      const supJson = await supRes.json();
      const svcJson = await svcRes.json();

      if (!candRes.ok) throw new Error(candJson?.error ?? "Failed to load candidates");
      if (!supRes.ok) throw new Error(supJson?.error ?? "Failed to load supplies");
      if (!svcRes.ok) throw new Error(svcJson?.error ?? "Failed to load services");

      setCandidates(candJson.appointments ?? []);
      setSupplies(supJson.supplies ?? []);
      setServices((svcJson.services ?? []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (businessId) loadBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function resetEditor() {
    setInstance(null);
    setActualDurationMin("");
    setNotes("");
    setUsageRows([]);
    setMsg(null);
  }

  async function startReview() {
    if (!businessId) return;
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const payload =
        mode === "APPOINTMENT"
          ? { businessId, appointmentId: selectedApptId }
          : { businessId, serviceId: selectedServiceId, source: "WALK_IN" };

      const res = await fetch("/api/usage/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create/load instance");

      const inst = data.instance;
      setInstance(inst);

      setActualDurationMin(inst.actualDurationMin?.toString?.() ?? "");
      setNotes(inst.notes ?? "");

      const rows: UsageRow[] =
        (inst.supplyUsages ?? []).map((u: any) => ({
          supplyId: u.supplyId,
          quantityUsed: String(u.quantityUsed),
          unit: u.unit ?? u.supply?.unit ?? "",
          method: u.method ?? "manual",
          rawInput: u.rawInput ?? "",
        })) ?? [];

      setUsageRows(rows.length ? rows : []);
      setMsg("Loaded review record ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function addUsageRow() {
    setUsageRows((prev) => [
      ...prev,
      { supplyId: supplies[0]?.id ?? "", quantityUsed: "0", method: "manual", rawInput: "", unit: supplies[0]?.unit ?? "" },
    ]);
  }

  function updateRow(i: number, patch: Partial<UsageRow>) {
    setUsageRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setUsageRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveDraft() {
    if (!instance?.id) return;
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/usage/instance/${instance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualDurationMin: actualDurationMin.trim() ? Number(actualDurationMin) : null,
          notes,
          supplyUsages: usageRows
            .filter((r) => r.supplyId && r.quantityUsed !== "")
            .map((r) => ({
              supplyId: r.supplyId,
              quantityUsed: r.quantityUsed,
              unit: r.unit,
              method: r.method,
              rawInput: r.rawInput,
            })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");

      setInstance(data.instance);
      setMsg("Saved draft ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function finalize() {
    if (!instance?.id) return;
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/usage/instance/${instance.id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Finalize failed");

      setMsg("Finalized + inventory updated ✅");
      await loadBasics(); // refresh candidates list etc.
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Update supplies per service</h1>
          <button onClick={() => router.push("/dashboard")} style={{ ...buttonStyle, marginTop: 10 }}>
            ← Back
          </button>
        </div>

        <button onClick={loadBasics} disabled={loading} style={buttonStyle}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && <Box kind="error">{err}</Box>}
      {msg && <Box kind="ok">{msg}</Box>}

      {/* Step 1: choose appointment or walk-in */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>1) Choose what you’re reviewing</h2>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setMode("APPOINTMENT");
              resetEditor();
            }}
            style={{ ...buttonStyle, background: mode === "APPOINTMENT" ? "#eee" : "#fff" }}
          >
            Completed appointment
          </button>
          <button
            onClick={() => {
              setMode("WALK_IN");
              resetEditor();
            }}
            style={{ ...buttonStyle, background: mode === "WALK_IN" ? "#eee" : "#fff" }}
          >
            Walk-in
          </button>
        </div>

        {mode === "APPOINTMENT" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Select completed appointment</div>
            <select value={selectedApptId} onChange={(e) => setSelectedApptId(e.target.value)} style={inputStyle}>
              <option value="">-- choose --</option>
              {candidates.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Date(a.startTime).toLocaleString()} • {a.client.name} • {a.service.name}
                </option>
              ))}
            </select>

            {selectedAppt && (
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                <div><strong>Client:</strong> {selectedAppt.client.name}</div>
                <div><strong>Service:</strong> {selectedAppt.service.name}</div>
                <div>
                  <strong>Booked lead time:</strong>{" "}
                  {Math.round((new Date(selectedAppt.startTime).getTime() - new Date(selectedAppt.createdAt).getTime()) / (1000 * 60))} min
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Select service</div>
            <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} style={inputStyle}>
              <option value="">-- choose --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={startReview}
          style={{ ...buttonStyle, marginTop: 12 }}
          disabled={
            loading ||
            (mode === "APPOINTMENT" ? !selectedApptId : !selectedServiceId)
          }
        >
          Start review →
        </button>
      </section>

      {/* Step 2: edit instance */}
      {instance && (
        <section style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={h2Style}>2) Log what actually happened</h2>

          <div style={{ marginTop: 10, opacity: 0.85 }}>
            <div><strong>Service:</strong> {instance.service?.name ?? "(unknown)"}</div>
            {instance.appointment && (
              <div><strong>Appointment:</strong> {new Date(instance.appointment.startTime).toLocaleString()}</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 2fr", marginTop: 12 }}>
            <label>
              <div style={{ fontWeight: 800 }}>Actual duration (min)</div>
              <input
                style={inputStyle}
                value={actualDurationMin}
                onChange={(e) => setActualDurationMin(e.target.value)}
                placeholder="e.g. 55"
              />
            </label>

            <label>
              <div style={{ fontWeight: 800 }}>Notes</div>
              <input
                style={inputStyle}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations…"
              />
            </label>
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Supplies used</h3>
            <button onClick={addUsageRow} style={buttonStyle}>
              + Add supply
            </button>
          </div>

          {usageRows.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.75 }}>No supplies logged yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {usageRows.map((r, i) => (
                <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr 1fr 1fr auto" }}>
                    <select
                      style={inputStyle}
                      value={r.supplyId}
                      onChange={(e) => {
                        const supply = supplies.find((s) => s.id === e.target.value);
                        updateRow(i, { supplyId: e.target.value, unit: supply?.unit ?? "" });
                      }}
                    >
                      <option value="">Select supply</option>
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (left: {String(s.quantity)} {s.unit ?? ""})
                        </option>
                      ))}
                    </select>

                    <input
                      style={inputStyle}
                      value={r.quantityUsed}
                      onChange={(e) => updateRow(i, { quantityUsed: e.target.value })}
                      placeholder="Qty used"
                    />

                    <input
                      style={inputStyle}
                      value={r.unit ?? ""}
                      onChange={(e) => updateRow(i, { unit: e.target.value })}
                      placeholder="unit"
                    />

                    <select
                      style={inputStyle}
                      value={r.method ?? "manual"}
                      onChange={(e) => updateRow(i, { method: e.target.value })}
                    >
                      <option value="manual">manual</option>
                      <option value="llm">llm</option>
                      <option value="cv">cv</option>
                    </select>

                    <button onClick={() => removeRow(i)} style={dangerStyle}>
                      Remove
                    </button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Raw input (optional)</div>
                    <input
                      style={inputStyle}
                      value={r.rawInput ?? ""}
                      onChange={(e) => updateRow(i, { rawInput: e.target.value })}
                      placeholder='e.g. "used ~2 pumps", or notes from CV'
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={saveDraft} style={buttonStyle} disabled={loading}>
              Save draft
            </button>
            <button onClick={finalize} style={{ ...buttonStyle, background: "#eef6ff" }} disabled={loading}>
              Finalize (updates inventory)
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            Finalize will decrement SupplyItem.quantity based on what you logged above.
          </div>
        </section>
      )}
    </main>
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
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 10 };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontWeight: 800 };
const dangerStyle: React.CSSProperties = { ...buttonStyle, background: "#fff", borderColor: "#e0a0a0" };
