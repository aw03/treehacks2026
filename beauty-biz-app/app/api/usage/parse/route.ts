import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParsedUsage = {
  supplyId: string;
  quantityUsed: string; // Decimal-safe string
  unit?: string | null;
  method?: string | null;
  rawInput?: string | null;
};

function clampNonNegative(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const requestId = `usage-parse-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log(`[${requestId}] POST /api/usage/parse start`);

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      console.warn(`[${requestId}] Invalid JSON body`);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const businessId = typeof body.businessId === "string" ? body.businessId : null;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const serviceName = typeof body.serviceName === "string" ? body.serviceName.trim() : "";

    console.log(`[${requestId}] businessId=${businessId} serviceName="${serviceName}" textLen=${text.length}`);

    if (!businessId) {
      console.warn(`[${requestId}] Missing businessId`);
      return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    }
    if (!text) {
      console.warn(`[${requestId}] Missing text`);
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const supplies = await prisma.supplyItem.findMany({
      where: { businessId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: "asc" },
    });

    console.log(`[${requestId}] suppliesLoaded=${supplies.length}`);

    if (supplies.length === 0) {
      console.warn(`[${requestId}] No supplies in DB for businessId=${businessId}`);
      return NextResponse.json({ error: "No supplies exist yet for this business." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
    const anthropicVersion = process.env.ANTHROPIC_VERSION ?? "2023-06-01";

    console.log(
      `[${requestId}] anthropicKeyPresent=${!!apiKey} model=${model} anthropicVersion=${anthropicVersion}`
    );

    // Fallback if no key
    if (!apiKey) {
      console.warn(`[${requestId}] ANTHROPIC_API_KEY missing, using fallback parser`);
      const fallback: ParsedUsage[] = [];
      const lower = text.toLowerCase();
      for (const s of supplies) {
        if (lower.includes(s.name.toLowerCase())) {
          const m = lower.match(/(\d+(\.\d+)?)/);
          fallback.push({
            supplyId: s.id,
            quantityUsed: String(m ? clampNonNegative(Number(m[1])) : 1),
            unit: s.unit,
            method: "fallback",
            rawInput: text,
          });
        }
      }
      console.log(`[${requestId}] fallbackUsages=${fallback.length}`);
      return NextResponse.json({ usages: fallback });
    }

    const supplyOptions = supplies.map((s) => ({
      id: s.id,
      name: s.name,
      unit: s.unit ?? null,
    }));

    const system = [
      "You extract structured supply usage from stylist notes.",
      "You MUST return valid JSON ONLY (no markdown, no commentary).",
      "Use ONLY supplies from the provided list. If none match, return an empty array.",
      "Quantities must be numeric and non-negative. Prefer decimals (e.g., 1.5).",
      "If the note uses vague amounts (e.g., 'a little', 'some'), make a reasonable estimate (small).",
      "If units are mentioned (ml, oz, pumps, pieces), map to the supply's unit when possible. If unknown, omit unit.",
    ].join("\n");

    const user = {
      serviceName,
      note: text,
      supplies: supplyOptions,
      output_schema: {
        usages: [
          {
            supplyId: "string (must be one of supplies[].id)",
            quantityUsed: "number",
            unit: "string|null (optional)",
            method: "string (manual|llm|cv)",
          },
        ],
      },
    };

    console.log(`[${requestId}] calling Anthropic...`);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: JSON.stringify(user) }],
      }),
    });

    const raw = await resp.text();
    console.log(`[${requestId}] Anthropic status=${resp.status} ok=${resp.ok} rawLen=${raw.length}`);

    const json = safeJsonParse<any>(raw);

    if (!resp.ok) {
      console.error(`[${requestId}] Anthropic error body (truncated):`, raw.slice(0, 1000));
      return NextResponse.json(
        { error: json?.error?.message ?? `Claude error (${resp.status})`, raw: raw.slice(0, 2000) },
        { status: 500 }
      );
    }

    const textOut: string | undefined =
      json?.content?.find?.((c: any) => c?.type === "text")?.text;

    if (!textOut) {
      console.error(`[${requestId}] No text content from Anthropic. Full json keys:`, Object.keys(json ?? {}));
      return NextResponse.json({ error: "Claude returned no text content", raw: json }, { status: 500 });
    }

    console.log(`[${requestId}] Claude textOut (truncated):`, textOut.slice(0, 800));

    const parsed = safeJsonParse<{ usages: any[] }>(textOut);
    if (!parsed || !Array.isArray(parsed.usages)) {
      console.error(`[${requestId}] Claude output not valid JSON`, { textOut: textOut.slice(0, 800) });
      return NextResponse.json({ error: "Claude output was not valid JSON", textOut: textOut.slice(0, 2000) }, { status: 500 });
    }

    const allowed = new Set(supplies.map((s) => s.id));

    const usages: ParsedUsage[] = parsed.usages
      .filter((u) => u && typeof u.supplyId === "string" && allowed.has(u.supplyId))
      .map((u) => ({
        supplyId: u.supplyId,
        quantityUsed: String(clampNonNegative(Number(u.quantityUsed))),
        unit: typeof u.unit === "string" ? u.unit : null,
        method: "llm",
        rawInput: text,
      }))
      .filter((u) => Number(u.quantityUsed) > 0);

    console.log(`[${requestId}] parsedUsages=${usages.length}`);

    return NextResponse.json({ usages });
  } catch (e: any) {
    console.error(`[${requestId}] Unhandled error:`, e);
    return NextResponse.json({ error: e?.message ?? "Unknown server error" }, { status: 500 });
  }
}
