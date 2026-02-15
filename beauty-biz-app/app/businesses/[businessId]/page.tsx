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

        // default service selection
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

  function walkInBadge() {
    if (!walkIn) return null;

    const open = walkIn.openNow;
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid #ddd",
          background: open ? "#e7f8ef" : "#f8e7e7",
          fontWeight: 900,
          marginTop: 10,
        }}
      >
        Walk-ins: {open ? "OPEN" : "CLOSED"}
        <span style={{ fontWeight: 700, opacity: 0.75 }}>
          {open
            ? walkIn.closesInMin != null
              ? `(closes in ${walkIn.closesInMin} min)`
              : ""
            : walkIn.reason
            ? `(${walkIn.reason})`
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

    // Naive: interpret as local browser time and send ISO.
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
          startTime: start.toISOString(), // ✅ correct key
          endTime: end.toISOString(),     // ✅ required by API
          // This requires the "client object" patch in /api/appointments.
          // If you didn't apply it yet, you must send clientId instead.
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
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <button
        onClick={() => router.push("/businesses")}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid #ccc",
          background: "#f5f5f5",
          cursor: "pointer",
          fontWeight: 900,
        }}
      >
        ← Back to businesses
      </button>

      {loading ? (
        <div style={{ marginTop: 16, opacity: 0.75 }}>Loading…</div>
      ) : err ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f5c2c7",
            background: "#f8d7da",
          }}
        >
          {err}
        </div>
      ) : !business ? (
        <div style={{ marginTop: 16, opacity: 0.75 }}>Business not found.</div>
      ) : (
        <>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: "16px 0 0 0" }}>
            {business.name}
          </h1>
          <div style={{ marginTop: 6, opacity: 0.75 }}>
            {business.phone ?? "No phone"} • {business.email ?? "No email"} •{" "}
            {business.timezone}
          </div>

          {walkInBadge()}

          {/* Services */}
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              marginTop: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Services</h2>

            {services.length === 0 ? (
              <div style={{ marginTop: 10, opacity: 0.7 }}>
                No services listed for this business yet.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {services.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{s.name}</div>
                    <div style={{ marginTop: 4, opacity: 0.75 }}>
                      ${s.price} • {s.durationMin} min
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Schedule appointment */}
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              marginTop: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>
              Schedule appointment (naive)
            </h2>
            <div style={{ marginTop: 8, opacity: 0.75 }}>
              This version doesn’t check business hours — it creates an appointment.
              (Your API does check conflicts for scheduled appointments.)
            </div>

            {successMsg && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cfe2ff",
                  background: "#e7f1ff",
                }}
              >
                {successMsg}
              </div>
            )}
            {err && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #f5c2c7",
                  background: "#f8d7da",
                }}
              >
                {err}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div>
                <label style={{ fontWeight: 900 }}>Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.price}, {s.durationMin}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 900 }}>Client name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Aaliyah"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900 }}>Phone</label>
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g., 6175551234"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900 }}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900 }}>Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 900 }}>Notes (optional)</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything they should know"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ opacity: 0.75 }}>
                {selectedService ? `Selected: ${selectedService.name}` : ""}
              </div>
              <button
                onClick={submitAppointment}
                disabled={submitting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#eef6ff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                {submitting ? "Scheduling…" : "Schedule appointment"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
