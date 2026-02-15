import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ParsedUsage = {
  supplyId: string;
  quantityUsed: string; // Decimal-safe string
  unit?: string | null;
  method?: string | null;
  rawInput?: string | null;
  confidence?: string | null; // store as string for safety
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

function extractToolInput(json: any): any | null {
  // Anthropic returns content blocks; tool outputs come as { type: "tool_use", name, input }
  const blocks = json?.content;
  if (!Array.isArray(blocks)) return null;
  const toolUse = blocks.find((b: any) => b?.type === "tool_use" && b?.name === "set_supply_usages");
  return toolUse?.input ?? null;
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

    if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const supplies = await prisma.supplyItem.findMany({
      where: { businessId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: "asc" },
    });

    console.log(`[${requestId}] suppliesLoaded=${supplies.length}`);

    if (supplies.length === 0) {
      return NextResponse.json({ error: "No supplies exist yet for this business." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
    const anthropicVersion = process.env.ANTHROPIC_VERSION ?? "2023-06-01";

    console.log(`[${requestId}] anthropicKeyPresent=${!!apiKey} model=${model} anthropicVersion=${anthropicVersion}`);

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
            unit: s.unit ?? null,
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

    // ✅ Tool schema: forces valid structured output
    const tools = [
      {
        name: "set_supply_usages",
        description:
          "Return structured supply usage extracted from stylist notes. Use only supply IDs provided. If none match, return an empty items array.",
        input_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  supplyId: { type: "string" },
                  quantityUsed: { type: "number", minimum: 0 },
                  unit: { type: ["string", "null"] },
                  method: { type: "string", enum: ["llm"] },
                  confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
                  rawInput: { type: ["string", "null"] },
                },
                required: ["supplyId", "quantityUsed", "method"],
              },
            },
          },
          required: ["items"],
        },
      },
    ];

    const system = [
      "You extract structured supply usage from stylist notes.",
      "Use ONLY supplies from the provided list (match by name/alias; output supplyId).",
      "Return realistic, non-negative numeric quantities; prefer decimals (e.g., 1.5).",
      "If the note is vague (e.g., 'a little'), estimate a small quantity.",
      "If unit is mentioned, include it; otherwise use the supply's unit if it makes sense, else null.",
      "If nothing matches, return items: [].",
      "IMPORTANT: You MUST respond by calling the tool set_supply_usages.",
    ].join("\n");

    const userPayload = {
      serviceName,
      note: text,
      supplies: supplyOptions,
    };

    console.log(`[${requestId}] calling Anthropic (tool_choice forced)...`);

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
        tool_choice: { type: "tool", name: "set_supply_usages" }, // ✅ force tool use
        tools,
        messages: [{ role: "user", content: JSON.stringify(userPayload) }],
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

    if (!json) {
      console.error(`[${requestId}] Anthropic returned non-JSON raw (truncated):`, raw.slice(0, 800));
      return NextResponse.json({ error: "Claude returned non-JSON response", raw: raw.slice(0, 2000) }, { status: 500 });
    }

    // ✅ Read structured output from tool_use.input (no parsing text needed)
    const toolInput = extractToolInput(json);
    if (!toolInput || !Array.isArray(toolInput.items)) {
      console.error(`[${requestId}] Missing tool_use input. Content blocks:`, json?.content);
      return NextResponse.json(
        { error: "Claude did not return tool output", raw: json },
        { status: 500 }
      );
    }

    const allowed = new Set(supplies.map((s) => s.id));

    const usages: ParsedUsage[] = (toolInput.items as any[])
    .filter((u: any) => u && typeof u.supplyId === "string" && allowed.has(u.supplyId))
    .map((u: any) => ({
        supplyId: u.supplyId,
        quantityUsed: String(clampNonNegative(Number(u.quantityUsed))),
        unit: typeof u.unit === "string" ? u.unit : null,
        method: "llm",
        rawInput: text,
        confidence: u.confidence == null ? null : String(u.confidence),
    }))
    .filter((u: ParsedUsage) => Number(u.quantityUsed) > 0);

    console.log(`[${requestId}] parsedUsages=${usages.length}`);

    return NextResponse.json({ usages });
  } catch (e: any) {
    console.error(`[${requestId}] Unhandled error:`, e);
    return NextResponse.json({ error: e?.message ?? "Unknown server error" }, { status: 500 });
  }
}
