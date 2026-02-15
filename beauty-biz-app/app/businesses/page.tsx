import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, phone: true, walkInEnabled: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page-bg">
      <div className="container">
        <h1 style={{ fontSize: 34, margin: 0 }}>All Businesses</h1>
        <div className="small" style={{ marginTop: 10 }}>
          Pick a business to view services and schedule an appointment.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {businesses.map((b) => (
            <div key={b.id} className="card">
              <div style={{ fontWeight: 900, fontSize: 16 }}>{b.name}</div>

              <div className="small" style={{ marginTop: 8 }}>
                {b.phone ?? "No phone listed"}
              </div>

              <div className="small" style={{ marginTop: 10 }}>
                Walk-ins:{" "}
                <span style={{ color: b.walkInEnabled ? "var(--success)" : "var(--muted)", fontWeight: 800 }}>
                  {b.walkInEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <Link href={`/businesses/${b.id}`} className="btn btn-primary">
                  View business →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {businesses.length === 0 && (
          <div className="small" style={{ marginTop: 16 }}>
            No businesses yet. Create one via your setup flow.
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <Link href="/" className="btn btn-ghost">
            ← Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
