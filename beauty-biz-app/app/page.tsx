import Link from "next/link";

export default function Home() {
  return (
    <main className="page-bg">
      <div className="container-narrow">
        <h1>BusinessBuddy</h1>

        <p>
          A smarter way to run and book small business services. Manage appointments,
          track inventory, and grow your business — all in one place.
        </p>

        <div className="stack-24" style={{ marginTop: 28 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/setup" className="btn btn-primary">
              I’m a Business →
            </Link>

            <Link href="/businesses" className="btn btn-secondary">
              Book a Service →
            </Link>
          </div>

          <div className="card">
            <h2>Built for modern entrepreneurs providing services</h2>
            <ul>
              <li>Centralized scheduling</li>
              <li>Inventory tracking</li>
              <li>Service profitability insights</li>
              <li>AI-powered trend summaries</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
