"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsagePage() {
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    if (!id) router.push("/setup");
  }, [router]);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Update supplies per service</h1>
      <button onClick={() => router.push("/dashboard")} style={{ marginTop: 12, ...buttonStyle }}>
        ← Back
      </button>

      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Next step: upload a product photo / service photo and use CV + chatbot to estimate how much product was used,
          then decrement inventory.
        </p>

        <ul style={{ marginTop: 12 }}>
          <li>Input: appointment/service + optional uploaded image</li>
          <li>CV: estimate amount used (ml / grams / count)</li>
          <li>Chatbot: convert that to supply decrements + explanation</li>
          <li>Write: update SupplyItem.quantity</li>
        </ul>

        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Want this page to be “Upload → Suggested usage → Confirm” or “Chat style conversation”?
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
