"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("businessId");
    if (!id) router.push("/setup");
    setBusinessId(id);
  }, [router]);

  function logout() {
    localStorage.removeItem("businessId");
    router.push("/setup");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "50px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800 }}>Dashboard</h1>
          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 12, opacity: 0.75 }}>
            businessId: {businessId ?? "(loading...)"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={buttonStyle} onClick={() => router.push("/setup")}>Account</button>
          <button style={buttonStyle} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 22 }}>
        <Card
          title="Add a service"
          desc="Create services with price + duration."
          onClick={() => router.push("/dashboard/services")}
        />
        <Card
          title="View appointments"
          desc="See upcoming appointments and status."
          onClick={() => router.push("/dashboard/appointments")}
        />
        <Card
          title="Add supplies"
          desc="Track inventory + reorder thresholds."
          onClick={() => router.push("/dashboard/supplies")}
        />
        <Card
          title="Update supplies per service"
          desc="Use chatbot/CV to estimate product usage."
          onClick={() => router.push("/dashboard/usage")}
        />
        <Card
          title="View report"
          desc="Customers, revenue trends, popular services (chatbot summary)."
          onClick={() => router.push("/dashboard/report")}
        />
      </div>
    </main>
  );
}

function Card({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={cardStyle}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 6, opacity: 0.8 }}>{desc}</div>
      <div style={{ marginTop: 10, fontWeight: 700 }}>Open →</div>
    </button>
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

const cardStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 18,
  borderRadius: 16,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};
