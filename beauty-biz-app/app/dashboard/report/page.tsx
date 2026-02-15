"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportPage() {
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    if (!id) router.push("/setup");
  }, [router]);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Report</h1>
      <button onClick={() => router.push("/dashboard")} style={{ marginTop: 12, ...buttonStyle }}>
        ← Back
      </button>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Next step: generate “business insights” using your chatbot (Poke/Claude/etc).
        </p>

        <ul style={{ marginTop: 12 }}>
          <li>Total customers (appointments count)</li>
          <li>Most popular services</li>
          <li>Revenue trend (if you store priceAtBooking)</li>
          <li>Suggested price adjustments (careful wording)</li>
          <li>Inventory cost pressure (if cost/unit is filled)</li>
        </ul>

        <div style={{ marginTop: 10, opacity: 0.75 }}>
          We’ll add an endpoint like <code>/api/report/summary</code> that returns a natural-language report.
        </div>
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #ccc",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 700,
};
