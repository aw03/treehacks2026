import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      serviceInstance: { is: null }, // key line
    },
    orderBy: { startTime: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, durationMin: true } },
    },
    take: 50,
  });

  return NextResponse.json({ appointments });
}
