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
    <main className="page-bg">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 34 }}>Business Portal</h1>

        <div className="small" style={{ marginTop: 10 }}>
          Mock auth for hackathon: register or log in with an email to enter the dashboard.
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          {/* Mode Switch */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              className={mode === "register" ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setMode("register")}
              style={{ opacity: mode === "register" ? 1 : 0.85 }}
            >
              Register
            </button>

            <button
              className={mode === "login" ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setMode("login")}
              style={{ opacity: mode === "login" ? 1 : 0.85 }}
            >
              Login
            </button>
          </div>

          {mode === "register" && (
            <label className="stack-16" style={{ gap: 8 }}>
              <div className="small" style={{ fontWeight: 900, color: "var(--text)" }}>
                Business name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Salon"
              />
            </label>
          )}

          <label className="stack-16" style={{ gap: 8, marginTop: 14 }}>
            <div className="small" style={{ fontWeight: 900, color: "var(--text)" }}>
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@mysalon.com"
            />
          </label>

          <button
            onClick={submit}
            disabled={loading || !email.trim() || (mode === "register" && !name.trim())}
            className="btn btn-primary"
            style={{ marginTop: 18, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Working..." : mode === "login" ? "Login →" : "Register →"}
          </button>

          {msg && (
            <div className="alert alert-danger" style={{ marginTop: 14 }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
