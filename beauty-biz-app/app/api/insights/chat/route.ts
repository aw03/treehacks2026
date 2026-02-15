import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "";
  return `${proto}://${host}`;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const businessId = body.businessId as string | undefined;
    const message = body.message as string | undefined;
    const history = (body.history as ChatMsg[] | undefined) ?? [];
    const start = body.start as string | undefined; // ISO optional
    const end = body.end as string | undefined;     // ISO optional

    if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    if (!message || typeof message !== "string") return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
    const anthropicVersion = process.env.ANTHROPIC_VERSION ?? "2023-06-01";
    if (!apiKey) return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });

    // Fetch metrics fresh each turn (so insights are grounded)
    const baseUrl = getBaseUrl(req);
    const qs = new URLSearchParams({ businessId });
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);

    const metricsUrl = `${baseUrl}/api/report/metrics?${qs.toString()}`;
    const metricsRes = await fetch(metricsUrl, { method: "GET" });
    const metricsText = await metricsRes.text();
    const metrics = metricsText ? JSON.parse(metricsText) : null;

    // Keep history short to avoid token blowups
    const trimmedHistory = history.slice(-12);

    const system =
      "You are an operations + growth copilot for a service business (beauty/personal care). " +
      "You will be given structured metrics from the database. " +
      "Always anchor insights in the provided numbers. " +
      "Be concise, specific, and action-oriented. " +
      "When asked about: booking-in-advance, busiest days/hours, or popular services, " +
      "use the bookingInsights fields and topServices. " +
      "If something isn't available, say what's missing and suggest what to track next. " +
      "No markdown code blocks. Prefer short bullets or tight paragraphs.";

    // Anthropic messages: include metrics as the first user message each request (simple + reliable)
    const messages = [
      {
        role: "user",
        content:
          "BUSINESS_METRICS_JSON:\n" +
          JSON.stringify(metrics ?? { error: "No metrics available" }, null, 2) +
          "\n\nRespond to the user's request using these metrics.",
      },
      ...trimmedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.35,
        system,
        messages,
      }),
    });

    const raw = await resp.text();
    if (!resp.ok) return NextResponse.json({ error: raw }, { status: 500 });

    const json = JSON.parse(raw);
    const textOut = json?.content?.find?.((c: any) => c?.type === "text")?.text ?? "";

    return NextResponse.json({ reply: textOut });
  } catch (e: any) {
    console.error("INSIGHTS_CHAT_ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Insights chat crashed" }, { status: 500 });
  }
}