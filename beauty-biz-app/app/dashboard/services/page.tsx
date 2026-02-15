"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  price: any;
  durationMin: number;
  createdAt?: string;
};

function moneyToString(x: any) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return x.toFixed(2);
  if (typeof x === "object" && typeof x.toString === "function") return x.toString();
  return String(x);
}

export default function ServicesPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("50.00");
  const [durationMin, setDurationMin] = useState("60");

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
      const res = await fetch(`/api/services?businessId=${businessId}`);
      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data?.error ?? "Failed to load services");
      setServices(data.services ?? []);
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

  async function addService() {
    if (!businessId) return;
    setErr(null);

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name,
          price,
          durationMin: Number(durationMin),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create service");

      setName("");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  async function deleteService(id: string) {
    if (!id) {
        setErr("Tried to delete service but id was empty.");
        return;
    }
    setErr(null);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete service");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <Header title="Services" onBack={() => router.push("/dashboard")} />

      {err && <ErrorBox msg={err} />}

      <section style={cardStyle}>
        <h2 style={h2Style}>Add a service</h2>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginTop: 10 }}>
          <input style={inputStyle} placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={inputStyle} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input
            style={inputStyle}
            placeholder="Minutes"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
          <button style={buttonStyle} disabled={!name.trim()} onClick={addService}>
            Add
          </button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
          Price is stored safely in the DB (Decimal) even if you pass it as a string.
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={h2Style}>Your services</h2>
          <button style={buttonStyle} onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {services.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No services yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}><strong>{s.name}</strong></td>
                  <td style={tdStyle}>${moneyToString(s.price)}</td>
                  <td style={tdStyle}>{s.durationMin} min</td>
                  <td style={tdStyleRight}>
                    <button style={dangerStyle} onClick={() => deleteService(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

/** UI bits */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{title}</h1>
        <button onClick={onBack} style={{ ...buttonStyle, marginTop: 10 }}>
          ← Back
        </button>
      </div>
    </div>
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
const dangerStyle: React.CSSProperties = { ...buttonStyle, background: "#fff", borderColor: "#e0a0a0" };
const thStyle: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px", fontWeight: 800 };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "10px 8px" };
const tdStyleRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
