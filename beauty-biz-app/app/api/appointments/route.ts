// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const from = searchParams.get("from"); // optional ISO date
  const to = searchParams.get("to");     // optional ISO date

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const where: any = { businessId };

  if (from || to) {
    where.startTime = {};
    if (from) where.startTime.gte = new Date(from);
    if (to) where.startTime.lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startTime: "asc" },
    include: { client: true, service: true },
  });

  return NextResponse.json({ appointments });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    businessId,
    clientId,
    serviceId,
    startTime,
    endTime,
    notes,
    status,
    priceAtBooking,
  } = body;

  if (!businessId || typeof businessId !== "string")
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  if (!clientId || typeof clientId !== "string")
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  if (!serviceId || typeof serviceId !== "string")
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid startTime/endTime" }, { status: 400 });
  }

  // OPTIONAL: basic conflict prevention (same business overlapping times)
  const conflict = await prisma.appointment.findFirst({
    where: {
      businessId,
      status: { in: [AppointmentStatus.SCHEDULED] },
      AND: [
        { startTime: { lt: end } },
        { endTime: { gt: start } },
      ],
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Time conflict with another appointment", conflictId: conflict.id },
      { status: 409 }
    );
  }

  const appt = await prisma.appointment.create({
    data: {
      businessId,
      clientId,
      serviceId,
      startTime: start,
      endTime: end,
      notes: typeof notes === "string" ? notes.trim() : null,
      status:
        typeof status === "string" && status in AppointmentStatus
          ? (status as AppointmentStatus)
          : AppointmentStatus.SCHEDULED,
      priceAtBooking:
        priceAtBooking === undefined || priceAtBooking === null
          ? null
          : (String(priceAtBooking)),
    },
    include: { client: true, service: true },
  });

  return NextResponse.json({ appointment: appt }, { status: 201 });
}
