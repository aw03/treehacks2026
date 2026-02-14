// app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, db: "error", error: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
