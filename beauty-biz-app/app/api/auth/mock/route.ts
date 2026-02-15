import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const mode = body?.mode; // "login" | "register"

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // "login" = find existing; "register" = create if missing
  const existing = await prisma.business.findUnique({ where: { email } });

  if (mode === "login") {
    if (!existing) return NextResponse.json({ error: "No business found for that email" }, { status: 404 });
    return NextResponse.json({ businessId: existing.id, created: false });
  }

  // register (or fallback): create if missing
  const biz =
    existing ??
    (await prisma.business.create({
      data: { email, name: name || "New Business" },
    }));

  return NextResponse.json({ businessId: biz.id, created: !existing });
}
