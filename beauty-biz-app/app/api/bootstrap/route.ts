// app/api/bootstrap/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Demo Business";
    const email = typeof body?.email === "string" && body.email.trim() ? body.email.trim() : null;
    const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

    const existing = await prisma.business.findFirst();
    if (existing) {
      return NextResponse.json({ businessId: existing.id, created: false });
    }

    const biz = await prisma.business.create({
      data: { name, email, phone },
    });

    return NextResponse.json({ businessId: biz.id, created: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
