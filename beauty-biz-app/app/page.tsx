import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Beauty Biz App</h1>
      <p style={{ marginTop: 12 }}>
        <Link href="/dashboard">Go to dashboard →</Link>
      </p>
    </main>
  );
}