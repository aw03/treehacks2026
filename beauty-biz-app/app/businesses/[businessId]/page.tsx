"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Service = { id: string; name: string; price: string; durationMin: number };

type Business = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  walkInEnabled: boolean;
  walkInStartMin: number;
  walkInEndMin: number;
};

type WalkIn = { openNow: boolean; closesInMin?: number; reason?: string };

export default function BusinessPage() {
  const router = useRouter();
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [walkIn, setWalkIn] = useState<WalkIn | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state (naive)
  const [serviceId, setServiceId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:MM
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        if (!businessId) throw new Error("Missing businessId from URL.");

        const res = await fetch(`/api/businesses/${businessId}`);
        const text = await res.text();
        if (!text) throw new Error("Empty response from business details API.");

        const data = JSON.parse(text);
        if (!res.ok) throw new Error(data?.error ?? "Failed to load business");

        if (cancelled) return;

        setBusiness(data.business);
        setServices(data.services ?? []);
        setWalkIn(data.walkIn ?? null);

        const first = (data.services ?? [])[0];
        if (first?.id) setServiceId(first.id);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  function WalkInBadge() {
    if (!walkIn) return null;

    const open = walkIn.openNow;

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          marginTop: 12,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: open ? "var(--success)" : "var(--danger)",
            display: "inline-block",
          }}
        />
        <span style={{ fontWeight: 900 }}>
          Walk-ins:{" "}
          <span style={{ color: open ? "var(--success)" : "var(--danger)" }}>
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>

        <span className="small" style={{ opacity: 0.9 }}>
          {open
            ? walkIn.closesInMin != null
              ? `closes in ${walkIn.closesInMin} min`
              : ""
            : walkIn.reason
            ? walkIn.reason
            : ""}
        </span>
      </div>
    );
  }

  async function submitAppointment() {
    setErr(null);
    setSuccessMsg(null);

    if (!businessId) return setErr("Missing businessId.");
    if (!serviceId) return setErr("Pick a service.");
    if (!selectedService) return setErr("Selected service not found.");
    if (!clientName.trim()) return setErr("Client name is required.");
    if (!clientPhone.trim()) return setErr("Client phone is required (naive mode).");
    if (!date || !time) return setErr("Pick a date and time.");

    const start = new Date(`${date}T${time}:00`);
    if (isNaN(start.getTime())) return setErr("Invalid date/time.");

    const end = new Date(start.getTime() + selectedService.durationMin * 60 * 1000);

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          client: { name: clientName.trim(), phone: clientPhone.trim() },
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      });

      const text = await res.text();
      if (!text) throw new Error("Empty response from appointment API.");
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data?.error ?? "Failed to create appointment");

      setSuccessMsg("Appointment scheduled ✅");
      setNotes("");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-bg">
      <div className="container">
        <button className="btn btn-ghost" onClick={() => router.push("/businesses")}>
          ← Back to businesses
        </button>

        {loading ? (
          <div className="small" style={{ marginTop: 16 }}>
            Loading…
          </div>
        ) : err ? (
          <div className="alert alert-danger" style={{ marginTop: 16 }}>
            {err}
          </div>
        ) : !business ? (
          <div className="small" style={{ marginTop: 16 }}>
            Business not found.
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 34, margin: "14px 0 0 0" }}>{business.name}</h1>

            <div className="small" style={{ marginTop: 10 }}>
              {business.phone ?? "No phone"} • {business.email ?? "No email"} • {business.timezone}
            </div>

            <WalkInBadge />

            {/* Services */}
            <section className="card" style={{ marginTop: 16 }}>
              <h2>Services</h2>

              {services.length === 0 ? (
                <div className="small" style={{ marginTop: 12 }}>
                  No services listed for this business yet.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {services.map((s) => (
                    <div key={s.id} className="card-tight" style={{ background: "var(--surface)" }}>
                      <div style={{ fontWeight: 900 }}>{s.name}</div>
                      <div className="small" style={{ marginTop: 6 }}>
                        ${s.price} • {s.durationMin} min
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Schedule appointment */}
            <section className="card" style={{ marginTop: 16 }}>
              <h2>Schedule appointment</h2>

              <div className="small" style={{ marginTop: 10 }}>
                This version doesn’t check business hours — it creates an appointment.
                (Your API does check conflicts for scheduled appointments.)
              </div>

              {successMsg && (
                <div className="alert alert-accent" style={{ marginTop: 12 }}>
                  {successMsg}
                </div>
              )}
              {err && (
                <div className="alert alert-danger" style={{ marginTop: 12 }}>
                  {err}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <Field label="Service">
                  <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (${s.price}, {s.durationMin}m)
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Client name">
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Aaliyah"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="e.g., 6175551234"
                  />
                </Field>

                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>

                <Field label="Time">
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </Field>

                <Field label="Notes (optional)">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything they should know"
                  />
                </Field>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div className="small" style={{ opacity: 0.9 }}>
                  {selectedService ? `Selected: ${selectedService.name}` : ""}
                </div>

                <button
                  onClick={submitAppointment}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Scheduling…" : "Schedule appointment"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="stack-16" style={{ gap: 8 }}>
      <div className="small" style={{ fontWeight: 900, color: "var(--text)" }}>
        {label}
      </div>
      {children}
    </label>
  );
}
