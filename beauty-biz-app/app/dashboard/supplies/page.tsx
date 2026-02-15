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
    <main className="page-bg">
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div className="stack-16">
            <h1 style={{ fontSize: 34 }}>Supplies</h1>
            <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>
              ← Back
            </button>
          </div>

          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div className="alert alert-danger" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}

        {/* Add supply */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Add supply</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
              gap: 10,
              marginTop: 12,
            }}
          >
            <input
              placeholder="Name (e.g., Shampoo)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <input
              placeholder="Reorder at"
              value={reorderAt}
              onChange={(e) => setReorderAt(e.target.value)}
            />
            <input
              placeholder="Cost/unit"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
            <button className="btn btn-primary" disabled={!name.trim()} onClick={addSupply}>
              Add
            </button>
          </div>
        </section>

        {/* Inventory */}
        <section className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2>Inventory</h2>
            <div className="small" style={{ alignSelf: "end" }}>
              Edit values inline — changes save immediately.
            </div>
          </div>

          {supplies.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No supplies yet.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Reorder at</th>
                    <th>Cost/unit</th>
                    <th style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 800, verticalAlign: "top" }}>{s.name}</td>

                      <td style={{ verticalAlign: "top", minWidth: 130 }}>
                        <input
                          value={s.unit ?? ""}
                          onChange={(e) => updateSupply(s.id, { unit: e.target.value })}
                          placeholder="unit"
                          style={{ padding: "10px 12px" }}
                        />
                      </td>

                      <td style={{ verticalAlign: "top", minWidth: 140 }}>
                        <input
                          value={asStr(s.quantity)}
                          onChange={(e) => updateSupply(s.id, { quantity: e.target.value as any })}
                          style={{ padding: "10px 12px" }}
                        />
                      </td>

                      <td style={{ verticalAlign: "top", minWidth: 160 }}>
                        <input
                          value={asStr(s.reorderAt)}
                          onChange={(e) => updateSupply(s.id, { reorderAt: e.target.value as any })}
                          placeholder="optional"
                          style={{ padding: "10px 12px" }}
                        />
                      </td>

                      <td style={{ verticalAlign: "top", minWidth: 160 }}>
                        <input
                          value={asStr(s.costPerUnit)}
                          onChange={(e) => updateSupply(s.id, { costPerUnit: e.target.value as any })}
                          placeholder="optional"
                          style={{ padding: "10px 12px" }}
                        />
                      </td>

                      <td style={{ textAlign: "right", verticalAlign: "top" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => deleteSupply(s.id)}
                          style={{
                            borderColor: "rgba(244, 33, 46, 0.45)",
                            color: "var(--danger)",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="small" style={{ marginTop: 12 }}>
            Next: we’ll connect “Update supplies per service” to decrement these based on CV/chatbot estimates.
          </div>
        </section>
      </div>
    </main>
  );
}
