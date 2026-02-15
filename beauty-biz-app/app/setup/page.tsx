"use client";

import { useEffect, useState } from "react";

export default function SetupPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [name, setName] = useState("Demo Business");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem("businessId");
    if (existing) setBusinessId(existing);
  }, []);

  async function bootstrap() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Bootstrap failed");

      localStorage.setItem("businessId", data.businessId);
      setBusinessId(data.businessId);
      setMsg(data.created ? "Created business ✅" : "Business already exists ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    localStorage.removeItem("businessId");
    setBusinessId(null);
    setMsg("Cleared local businessId.");
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Setup</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        This creates (or reuses) a Business and stores <code>businessId</code> in localStorage.
      </p>

      <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <div style={{ fontWeight: 600 }}>Business name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="My Salon"
            />
          </label>

          <label>
            <div style={{ fontWeight: 600 }}>Email (optional)</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="owner@mysalon.com"
            />
          </label>

          <label>
            <div style={{ fontWeight: 600 }}>Phone (optional)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="(555) 555-5555"
            />
          </label>

          <div>
            <div style={{ fontWeight: 600 }}>Current businessId</div>
            <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>
              {businessId ?? "(none yet)"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={bootstrap} disabled={loading} style={buttonStyle}>
            {loading ? "Working..." : "Create / Fetch Business"}
          </button>

          <a href="/dashboard" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Go to Dashboard →
          </a>

          <button onClick={clear} style={{ ...buttonStyle, background: "#fff" }}>
            Clear local businessId
          </button>
        </div>

        {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: 10,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #ccc",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 600,
};
