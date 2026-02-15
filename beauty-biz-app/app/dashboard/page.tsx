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
    <main className="page-bg">
      <div className="container">
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="stack-16">
            <h1 style={{ fontSize: 34 }}>Dashboard</h1>
            <div className="small" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              businessId: {businessId ?? "(loading...)"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => router.push("/setup")}>
              Account
            </button>
            <button className="btn btn-secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {/* Action cards */}
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 22,
          }}
        >
          <ActionCard
            title="Add a service"
            desc="Create services with price + duration."
            onClick={() => router.push("/dashboard/services")}
          />
          <ActionCard
            title="View appointments"
            desc="See upcoming appointments and status."
            onClick={() => router.push("/dashboard/appointments")}
          />
          <ActionCard
            title="Add supplies"
            desc="Track inventory + reorder thresholds."
            onClick={() => router.push("/dashboard/supplies")}
          />
          <ActionCard
            title="Update supplies per service"
            desc="Use chatbot/CV to estimate product usage."
            onClick={() => router.push("/dashboard/usage")}
          />
            <ActionCard
              title="View report"
              desc="Customers, revenue trends, popular services (chatbot summary)."
              onClick={() => router.push("/dashboard/report")}
            />
            <ActionCard
  title="Insights Copilot"
  desc="Interactive AI chat powered by your real metrics and appointment data."
  onClick={() => router.push("/dashboard/insights")}
/>
        </div>
      </div>
    </main>
  );
}

function ActionCard({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        textAlign: "left",
        width: "100%",
        transition: "background 0.15s ease, transform 0.04s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
    >
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <div style={{ marginTop: 6, color: "var(--muted)", lineHeight: 1.5 }}>
        {desc}
      </div>
      <div style={{ marginTop: 12, fontWeight: 800, color: "var(--accent)" }}>
        Open →
      </div>
    </button>
  );
}
