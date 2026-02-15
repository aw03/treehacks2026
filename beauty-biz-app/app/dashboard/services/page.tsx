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
    <main className="page-bg">
      <div className="container">
        <Header title="Services" onBack={() => router.push("/dashboard")} />

        {err && (
          <div className="alert alert-danger" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}

        {/* Add service */}
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Add a service</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 10,
              marginTop: 12,
            }}
          >
            <input
              placeholder="Service name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              placeholder="Minutes"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
            <button className="btn btn-primary" disabled={!name.trim()} onClick={addService}>
              Add
            </button>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            Price is stored safely in the DB (Decimal) even if you pass it as a string.
          </div>
        </section>

        {/* List services */}
        <section className="card" style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h2>Your services</h2>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {services.length === 0 ? (
            <div className="small" style={{ marginTop: 12 }}>
              No services yet.
            </div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 800 }}>{s.name}</td>
                      <td>${moneyToString(s.price)}</td>
                      <td>{s.durationMin} min</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => deleteService(s.id)}
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
        </section>
      </div>
    </main>
  );
}

/** UI bits */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
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
        <h1 style={{ fontSize: 34 }}>{title}</h1>
        <button className="btn btn-ghost" onClick={onBack} style={{ paddingLeft: 6, paddingRight: 10 }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
