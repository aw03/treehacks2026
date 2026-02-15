import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, phone: true, walkInEnabled: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>All Businesses</h1>
      <div style={{ marginTop: 8, opacity: 0.75 }}>
        Pick a business to view services and schedule an appointment.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 16 }}>
        {businesses.map((b) => (
          <div key={b.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{b.name}</div>
            <div style={{ marginTop: 6, opacity: 0.75 }}>{b.phone ?? "No phone listed"}</div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
              Walk-ins: {b.walkInEnabled ? "Enabled" : "Disabled"}
            </div>

            <Link
              href={`/businesses/${b.id}`}
              style={{
                display: "inline-block",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ccc",
                background: "#f5f5f5",
                fontWeight: 900,
                textDecoration: "none",
                color: "black",
              }}
            >
              View business →
            </Link>
          </div>
        ))}
      </div>

      {businesses.length === 0 && (
        <div style={{ marginTop: 16, opacity: 0.7 }}>
          No businesses yet. Create one via your setup flow.
        </div>
      )}
    </main>
  );
}
