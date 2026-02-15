"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("businessId");
}

export default function InsightsPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);

  const [start, setStart] = useState(""); // YYYY-MM-DD
  const [end, setEnd] = useState(""); // YYYY-MM-DD

  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I’m your Insights Copilot. Ask me about bookings, busiest days/hours, popular services, no-shows, and inventory.",
    },
  ]);

  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = getBusinessId();
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  const hasBusiness = useMemo(() => Boolean(businessId), [businessId]);

  function toIsoStart(d: string) {
    return new Date(d + "T00:00:00").toISOString();
  }
  function toIsoEnd(d: string) {
    return new Date(d + "T23:59:59").toISOString();
  }

  async function send() {
    setErr(null);
    if (!businessId) return;
    const text = input.trim();
    if (!text) return;

    const nextHistory: Msg[] = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const payload = {
        businessId,
        message: text,
        history: nextHistory.slice(-12),
        start: start ? toIsoStart(start) : undefined,
        end: end ? toIsoEnd(end) : undefined,
      };

      const res = await fetch("/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      if (!raw) throw new Error("Empty response from insights API.");
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data?.error ?? "Failed to get insights");

      setHistory((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setErr(null);
    setHistory([
      {
        role: "assistant",
        content:
          "Reset ✅ Ask me about bookings, busiest days/hours, popular services, no-shows, and inventory.",
      },
    ]);
  }

  const suggested = [
    "What % of bookings are same-day vs booked ahead? What should I change?",
    "What are my busiest days and busiest hours this week?",
    "Which services are most popular, and what should I promote next week?",
    "Any low inventory risks based on top usage + reorder thresholds?",
    "Do you see any operational bottlenecks or no-show risk signals?",
  ];

  return (
    <main className="page-bg">
      <div className="container" style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 34, margin: 0 }}>Insights</h1>
            <div className="small" style={{ marginTop: 10 }}>
              Open a chat that uses your real metrics + conversation history.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/dashboard")} className="btn btn-ghost">
              ← Back
            </button>
            <button onClick={() => setOpen(true)} disabled={!hasBusiness} className="btn btn-primary">
              Get insights
            </button>
          </div>
        </div>

        {/* Date range */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Optional date range</h2>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr 1fr auto",
              alignItems: "end",
            }}
          >
            <label className="stack-16" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 900, color: "var(--text)" }}>
                Start
              </div>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>

            <label className="stack-16" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 900, color: "var(--text)" }}>
                End
              </div>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>

            <button
              onClick={() => {
                setStart("");
                setEnd("");
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            If empty, insights default to your last 7 days.
          </div>
        </section>

        {/* Suggested */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Suggested questions</h2>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {suggested.map((q) => (
              <button
                key={q}
                className="chip"
                onClick={() => {
                  setOpen(true);
                  setInput(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Drawer */}
        {open && (
          <div
            className="drawer-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div className="drawer" onClick={(e) => e.stopPropagation()}>
              {/* Drawer header */}
              <div className="drawer-header">
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Insights Copilot</div>
                  <div className="small">Uses your real metrics + chat history</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={resetChat} className="btn btn-secondary" style={{ padding: "8px 10px" }}>
                    Reset
                  </button>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost" style={{ padding: "8px 10px" }}>
                    Close
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="drawer-body">
                {history.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div className={m.role === "user" ? "bubble bubble-user" : "bubble bubble-ai"}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && <div className="small" style={{ opacity: 0.8 }}>Thinking…</div>}
                {err && <div className="alert alert-danger" style={{ marginTop: 10 }}>{err}</div>}
              </div>

              {/* Composer */}
              <div className="drawer-footer">
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about bookings, busiest hours, inventory..."
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) send();
                    }}
                  />
                  <button onClick={send} disabled={loading || !input.trim()} className="btn btn-primary">
                    Send
                  </button>
                </div>
                <div className="small" style={{ marginTop: 8, opacity: 0.75 }}>
                  Tip: ask for “numbers + recommendation” to get crisp answers.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
