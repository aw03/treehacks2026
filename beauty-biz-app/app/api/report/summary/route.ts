import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const anthropicVersion = process.env.ANTHROPIC_VERSION ?? "2023-06-01";

  if (!apiKey) return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 400 });

  const system = `
You are a business intelligence assistant for a service-based beauty business.

Goal: generate a weekly report that is specific, numeric, and decision-oriented.

Rules:
- Output MUST be plain text (no markdown code blocks).
- Keep it under ~220 words.
- Use the exact section headings below.
- Use numbers from the provided metrics. Do not invent data.
- If a section has no data, say "Not enough data this week."

Format (exact headings):
WEEKLY BUSINESS REPORT
BOOKINGS
PEAK TIMES
TOP SERVICES
INVENTORY
NEXT ACTIONS

In NEXT ACTIONS: give 2-3 actions, each tied to the metrics.
`;


  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": anthropicVersion,
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      temperature: 0.3,
      system,
      messages: [
        {
          role: "user",
          content:
            "Use the data below to fill the report format exactly.\n\n" +
            JSON.stringify(body, null, 2),
        },
      ],
    }),
  });

  const raw = await resp.text();
  if (!resp.ok) return NextResponse.json({ error: raw }, { status: 500 });

  const json = JSON.parse(raw);
  const textOut = json?.content?.find?.((c: any) => c?.type === "text")?.text ?? "";
  return NextResponse.json({ summary: textOut });
}
