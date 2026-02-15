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

type Instance = any;

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

  const [aiText, setAiText] = useState<string>("");

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
    setAiText("");
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
      setAiText("");
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
      {
        supplyId: supplies[0]?.id ?? "",
        quantityUsed: "0",
        method: "manual",
        rawInput: "",
        unit: supplies[0]?.unit ?? "",
      },
    ]);
  }

  function updateRow(i: number, patch: Partial<UsageRow>) {
    setUsageRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setUsageRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generateFromAI() {
    if (!businessId) return;
    if (!instance) return;

    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/usage/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          text: aiText,
          serviceName: instance?.service?.name ?? "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "AI parse failed");

      const usages = data.usages ?? [];

      setUsageRows(
        usages.map((u: any) => ({
          supplyId: u.supplyId,
          quantityUsed: String(u.quantityUsed),
          unit: u.unit ?? "",
          method: u.method ?? "llm",
          rawInput: aiText,
        }))
      );

      setMsg("AI filled supplies ✅ (review + Save draft)");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
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
      await loadBasics();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
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
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="stack-16">
            <h1 style={{ fontSize: 34 }}>Update supplies per service</h1>
            <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>
              ← Back
            </button>
          </div>

          <button className="btn btn-secondary" onClick={loadBasics} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && <Box kind="error">{err}</Box>}
        {msg && <Box kind="ok">{msg}</Box>}

        {/* Step 1 */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>1) Choose what you’re reviewing</h2>

          {/* Mode switch (Twitter-ish pills) */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              className={mode === "APPOINTMENT" ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => {
                setMode("APPOINTMENT");
                resetEditor();
              }}
              style={{ opacity: mode === "APPOINTMENT" ? 1 : 0.85 }}
            >
              Completed appointment
            </button>

            <button
              className={mode === "WALK_IN" ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => {
                setMode("WALK_IN");
                resetEditor();
              }}
              style={{ opacity: mode === "WALK_IN" ? 1 : 0.85 }}
            >
              Walk-in
            </button>
          </div>

          {mode === "APPOINTMENT" ? (
            <div style={{ marginTop: 14 }}>
              <div className="small" style={{ fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                Select completed appointment
              </div>

              <select value={selectedApptId} onChange={(e) => setSelectedApptId(e.target.value)}>
                <option value="">-- choose --</option>
                {candidates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.startTime).toLocaleString()} • {a.client.name} • {a.service.name}
                  </option>
                ))}
              </select>

              {selectedAppt && (
                <div className="card-tight" style={{ marginTop: 12, background: "var(--surface)" }}>
                  <div>
                    <strong>Client:</strong> {selectedAppt.client.name}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Service:</strong> {selectedAppt.service.name}
                  </div>
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>
                    <strong style={{ color: "var(--text)" }}>Booked lead time:</strong>{" "}
                    {Math.round(
                      (new Date(selectedAppt.startTime).getTime() - new Date(selectedAppt.createdAt).getTime()) /
                        (1000 * 60)
                    )}{" "}
                    min
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <div className="small" style={{ fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                Select service
              </div>

              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
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
            className="btn btn-primary"
            style={{ marginTop: 14, opacity: loading ? 0.7 : 1 }}
            disabled={loading || (mode === "APPOINTMENT" ? !selectedApptId : !selectedServiceId)}
          >
            Start review →
          </button>
        </section>

        {/* Step 2 */}
        {instance && (
          <section className="card" style={{ marginTop: 16 }}>
            <h2>2) Log what actually happened</h2>

            <div className="small" style={{ marginTop: 10 }}>
              <div>
                <strong style={{ color: "var(--text)" }}>Service:</strong>{" "}
                <span style={{ color: "var(--muted)" }}>{instance.service?.name ?? "(unknown)"}</span>
              </div>
              {instance.appointment && (
                <div style={{ marginTop: 6 }}>
                  <strong style={{ color: "var(--text)" }}>Appointment:</strong>{" "}
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(instance.appointment.startTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 2fr", marginTop: 14 }}>
              <label className="stack-16" style={{ gap: 8 }}>
                <div className="small" style={{ fontWeight: 800, color: "var(--text)" }}>
                  Actual duration (min)
                </div>
                <input
                  value={actualDurationMin}
                  onChange={(e) => setActualDurationMin(e.target.value)}
                  placeholder="e.g. 55"
                />
              </label>

              <label className="stack-16" style={{ gap: 8 }}>
                <div className="small" style={{ fontWeight: 800, color: "var(--text)" }}>
                  Notes
                </div>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations…"
                />
              </label>
            </div>

            {/* AI parsing */}
            <div className="card-tight" style={{ marginTop: 16, background: "var(--surface)" }}>
              <div style={{ fontWeight: 900 }}>Quick input (AI)</div>

              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={`Example: "Used 2 pumps of gel and ~10ml of spray. Also 1 alcohol wipe."`}
                style={{ marginTop: 10, minHeight: 92 }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={generateFromAI} disabled={loading || !aiText.trim()}>
                  Generate supply usage
                </button>
                <button className="btn btn-ghost" onClick={() => setAiText("")} disabled={loading}>
                  Clear
                </button>
              </div>

              <div className="small" style={{ marginTop: 10 }}>
                AI will map your note to your existing supplies and fill the table below.
              </div>
            </div>

            {/* Supplies used */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0, fontWeight: 900, letterSpacing: "-0.01em" }}>Supplies used</h3>
              <button className="btn btn-secondary" onClick={addUsageRow}>
                + Add supply
              </button>
            </div>

            {usageRows.length === 0 ? (
              <div className="small" style={{ marginTop: 12 }}>
                No supplies logged yet.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {usageRows.map((r, i) => (
                  <div className="card-tight" key={i} style={{ background: "var(--surface)" }}>
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr 1fr 1fr auto" }}>
                      <select
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
                        value={r.quantityUsed}
                        onChange={(e) => updateRow(i, { quantityUsed: e.target.value })}
                        placeholder="Qty used"
                      />

                      <input
                        value={r.unit ?? ""}
                        onChange={(e) => updateRow(i, { unit: e.target.value })}
                        placeholder="unit"
                      />

                      <select value={r.method ?? "manual"} onChange={(e) => updateRow(i, { method: e.target.value })}>
                        <option value="manual">manual</option>
                        <option value="llm">llm</option>
                        <option value="cv">cv</option>
                      </select>

                      <button
                        className="btn btn-secondary"
                        onClick={() => removeRow(i)}
                        style={{ borderColor: "rgba(244, 33, 46, 0.45)", color: "var(--danger)" }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="small" style={{ fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                        Raw input (optional)
                      </div>
                      <input
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
              <button className="btn btn-secondary" onClick={saveDraft} disabled={loading}>
                Save draft
              </button>
              <button className="btn btn-primary" onClick={finalize} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                Finalize (updates inventory)
              </button>
            </div>

            <div className="small" style={{ marginTop: 12 }}>
              Finalize will decrement SupplyItem.quantity based on what you logged above.
            </div>
          </section>
        )}
      </div>
    </main>
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
