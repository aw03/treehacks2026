"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Supply = {
  id: string;
  name: string;
  unit: string | null;
  quantity: any;
  reorderAt: any;
  costPerUnit: any;
};

function asStr(x: any) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object" && typeof x.toString === "function") return x.toString();
  return String(x);
}

export default function SuppliesPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // add form
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("ml");
  const [quantity, setQuantity] = useState("0");
  const [reorderAt, setReorderAt] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

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
      const res = await fetch(`/api/supplies?businessId=${businessId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load supplies");
      setSupplies(data.supplies ?? []);
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

  async function addSupply() {
    if (!businessId) return;
    setErr(null);

    try {
      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name,
          unit,
          quantity,
          reorderAt: reorderAt.trim() ? reorderAt : null,
          costPerUnit: costPerUnit.trim() ? costPerUnit : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create supply");

      setName("");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  async function updateSupply(id: string, patch: Partial<Supply>) {
    setErr(null);
    try {
      const res = await fetch(`/api/supplies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update supply");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  async function deleteSupply(id: string) {
    setErr(null);
    try {
      const res = await fetch(`/api/supplies/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete supply");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Supplies</h1>
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
        <h2 style={h2Style}>Add supply</h2>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 10, marginTop: 10 }}>
          <input style={inputStyle} placeholder="Name (e.g., Shampoo)" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={inputStyle} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input style={inputStyle} placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <input style={inputStyle} placeholder="Reorder at" value={reorderAt} onChange={(e) => setReorderAt(e.target.value)} />
          <input style={inputStyle} placeholder="Cost/unit" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
          <button style={buttonStyle} disabled={!name.trim()} onClick={addSupply}>Add</button>
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={h2Style}>Inventory</h2>

        {supplies.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No supplies yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Reorder at</th>
                <th style={thStyle}>Cost/unit</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}><strong>{s.name}</strong></td>
                  <td style={tdStyle}>
                    <input
                      style={miniInput}
                      value={s.unit ?? ""}
                      onChange={(e) => updateSupply(s.id, { unit: e.target.value })}
                      placeholder="unit"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={miniInput}
                      value={asStr(s.quantity)}
                      onChange={(e) => updateSupply(s.id, { quantity: e.target.value as any })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={miniInput}
                      value={asStr(s.reorderAt)}
                      onChange={(e) => updateSupply(s.id, { reorderAt: e.target.value as any })}
                      placeholder="optional"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={miniInput}
                      value={asStr(s.costPerUnit)}
                      onChange={(e) => updateSupply(s.id, { costPerUnit: e.target.value as any })}
                      placeholder="optional"
                    />
                  </td>
                  <td style={tdStyleRight}>
                    <button style={dangerStyle} onClick={() => deleteSupply(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
          Next: we’ll connect “Update supplies per service” to decrement these based on CV/chatbot estimates.
        </div>
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
const miniInput: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 10 };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer", fontWeight: 700 };
const dangerStyle: React.CSSProperties = { ...buttonStyle, background: "#fff", borderColor: "#e0a0a0" };
const thStyle: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px", fontWeight: 800 };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "10px 8px", verticalAlign: "top" };
const tdStyleRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
