"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("businessId");
    if (existing) router.push("/dashboard");
  }, [router]);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");

      localStorage.setItem("businessId", data.businessId);
      router.push("/dashboard");
    } catch (e: any) {
      setMsg(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>Business Portal</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Mock auth for hackathon: register or log in with an email to enter the dashboard.
      </p>

      <div style={{ marginTop: 20, padding: 18, border: "1px solid #ddd", borderRadius: 14 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => setMode("register")}
            style={{ ...buttonStyle, background: mode === "register" ? "#eee" : "#fff" }}
          >
            Register
          </button>
          <button
            onClick={() => setMode("login")}
            style={{ ...buttonStyle, background: mode === "login" ? "#eee" : "#fff" }}
          >
            Login
          </button>
        </div>

        {mode === "register" && (
          <label>
            <div style={{ fontWeight: 700 }}>Business name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="My Salon" />
          </label>
        )}

        <label style={{ display: "block", marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="owner@mysalon.com" />
        </label>

        <button
          onClick={submit}
          disabled={loading || !email.trim() || (mode === "register" && !name.trim())}
          style={{ ...buttonStyle, marginTop: 14 }}
        >
          {loading ? "Working..." : mode === "login" ? "Login →" : "Register →"}
        </button>

        {msg && <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div>}
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
  fontWeight: 700,
};
