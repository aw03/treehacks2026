"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type Service = {
  id: string;
  name: string;
  // Decimal comes back as string (or may come back as object depending on serializer),
  // but in our APIs we return raw Prisma value. We'll handle both.
  price: any;
  durationMin: number;
};

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  client: Client;
  service: Service;
};

function moneyToString(x: any) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  // Prisma Decimal sometimes serializes as { s, e, d } depending on versions,
  // but most commonly becomes a string. This is a safe fallback:
  if (typeof x === "object" && typeof x.toString === "function") return x.toString();
  return String(x);
}

export default function DashboardPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Quick-add forms
  const [clientName, setClientName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("50.00");
  const [serviceDuration, setServiceDuration] = useState("60");

  const [apptClientId, setApptClientId] = useState("");
  const [apptServiceId, setApptServiceId] = useState("");
  const [apptStart, setApptStart] = useState("");
  const [apptEnd, setApptEnd] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    setBusinessId(id);
  }, []);

  const canLoad = useMemo(() => !!businessId, [businessId]);

  async function loadAll() {
    if (!businessId) return;
    setLoading(true);
    setErr(null);
    try {
      const [cRes, sRes, aRes] = await Promise.all([
        fetch(`/api/clients?businessId=${businessId}`),
        fetch(`/api/services?businessId=${businessId}`),
        fetch(`/api/appointments?businessId=${businessId}`),
      ]);

      const cJson = await cRes.json();
      const sJson = await sRes.json();
      const aJson = await aRes.json();

      if (!cRes.ok) throw new Error(cJson?.error ?? "Failed to load clients");
      if (!sRes.ok) throw new Error(sJson?.error ?? "Failed to load services");
      if (!aRes.ok) throw new Error(aJson?.error ?? "Failed to load appointments");

      setClients(cJson.clients ?? []);
      setServices(sJson.services ?? []);
      setAppointments(aJson.appointments ?? []);

      // default select values for appointment creation
      if (!apptClientId && (cJson.clients?.[0]?.id)) setApptClientId(cJson.clients[0].id);
      if (!apptServiceId && (sJson.services?.[0]?.id)) setApptServiceId(sJson.services[0].id);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (businessId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function addClient() {
    if (!businessId) return;
    setErr(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name: clientName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create client");
      setClientName("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  async function addService() {
    if (!businessId) return;
    setErr(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: serviceName,
          price: servicePrice,
          durationMin: Number(serviceDuration),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create service");
      setServiceName("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  async function addAppointment() {
    if (!businessId) return;
    setErr(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          clientId: apptClientId,
          serviceId: apptServiceId,
          startTime: apptStart,
          endTime: apptEnd,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create appointment");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    }
  }

  if (!businessId) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ marginTop: 10 }}>
          No <code>businessId</code> found in localStorage.
        </p>
        <a href="/setup" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Go to Setup →
        </a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Business Dashboard</h1>
          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>
            businessId: {businessId}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadAll} disabled={!canLoad || loading} style={buttonStyle}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <a href="/setup" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Setup
          </a>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f5c2c7", background: "#f8d7da", borderRadius: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 20 }}>
        {/* Clients */}
        <section style={cardStyle}>
          <h2 style={h2Style}>Clients</h2>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Add client name…"
              style={inputStyle}
            />
            <button onClick={addClient} style={buttonStyle} disabled={!clientName.trim()}>
              Add
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {clients.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No clients yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {clients.map((c) => (
                  <li key={c.id} style={{ marginBottom: 6 }}>
                    <strong>{c.name}</strong>{" "}
                    <span style={{ opacity: 0.7, fontFamily: "monospace", fontSize: 12 }}>
                      {c.id.slice(0, 8)}…
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Services */}
        <section style={cardStyle}>
          <h2 style={h2Style}>Services</h2>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr auto", marginTop: 10 }}>
            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Service name"
              style={inputStyle}
            />
            <input
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
              placeholder="Price"
              style={inputStyle}
            />
            <input
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
              placeholder="Minutes"
              style={inputStyle}
            />
            <button onClick={addService} style={buttonStyle} disabled={!serviceName.trim()}>
              Add
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {services.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No services yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {services.map((s) => (
                  <li key={s.id} style={{ marginBottom: 6 }}>
                    <strong>{s.name}</strong> — ${moneyToString(s.price)} · {s.durationMin} min
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Appointments */}
        <section style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <h2 style={h2Style}>Appointments</h2>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr 1fr auto", marginTop: 10 }}>
            <select value={apptClientId} onChange={(e) => setApptClientId(e.target.value)} style={inputStyle}>
              <option value="" disabled>
                Select client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select value={apptServiceId} onChange={(e) => setApptServiceId(e.target.value)} style={inputStyle}>
              <option value="" disabled>
                Select service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              value={apptStart}
              onChange={(e) => setApptStart(e.target.value)}
              placeholder="Start (ISO) e.g. 2026-02-15T13:00:00Z"
              style={inputStyle}
            />
            <input
              value={apptEnd}
              onChange={(e) => setApptEnd(e.target.value)}
              placeholder="End (ISO) e.g. 2026-02-15T14:00:00Z"
              style={inputStyle}
            />

            <button
              onClick={addAppointment}
              style={buttonStyle}
              disabled={!apptClientId || !apptServiceId || !apptStart || !apptEnd}
            >
              Add
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {appointments.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No appointments yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Client</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td style={tdStyle}>
                        {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                      </td>
                      <td style={tdStyle}>{a.client?.name}</td>
                      <td style={tdStyle}>{a.service?.name}</td>
                      <td style={tdStyle}>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            Tip: for quick demo, paste ISO times like <code>2026-02-15T13:00:00Z</code>. We can upgrade this to a nice datetime picker next.
          </p>
        </section>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 16,
};

const h2Style: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
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

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  verticalAlign: "top",
};
