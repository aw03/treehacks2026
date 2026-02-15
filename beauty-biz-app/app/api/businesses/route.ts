import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        walkInEnabled: true,
        timezone: true,
        walkInStartMin: true,
        walkInEndMin: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ businesses });
  } catch (e: any) {
    console.error("BUSINESSES_LIST_ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to load businesses" }, { status: 500 });
  }
}
