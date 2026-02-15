// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export const runtime = "nodejs";

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
    client, // NEW: { name, phone?, email? }
    serviceId,
    startTime,
    endTime,
    notes,
    status,
    priceAtBooking,
  } = body;

  if (!businessId || typeof businessId !== "string")
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  if (!serviceId || typeof serviceId !== "string")
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  // Resolve clientId: either provided OR create/find by phone/email
  let resolvedClientId: string | null = null;

  if (clientId && typeof clientId === "string") {
    resolvedClientId = clientId;
  } else if (client && typeof client === "object") {
    const name = typeof client.name === "string" ? client.name.trim() : "";
    const phone = typeof client.phone === "string" ? client.phone.trim() : "";
    const email = typeof client.email === "string" ? client.email.trim() : "";

    if (!name) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    if (!phone && !email)
      return NextResponse.json({ error: "Client phone or email is required" }, { status: 400 });

    const existing = await prisma.client.findFirst({
      where: {
        businessId,
        OR: [phone ? { phone } : undefined, email ? { email } : undefined].filter(Boolean) as any,
      },
      select: { id: true },
    });

    if (existing) {
      resolvedClientId = existing.id;
    } else {
      const created = await prisma.client.create({
        data: {
          businessId,
          name,
          phone: phone || null,
          email: email || null,
        },
        select: { id: true },
      });
      resolvedClientId = created.id;
    }
  }

  if (!resolvedClientId) {
    return NextResponse.json(
      { error: "Missing clientId or client object (name + phone/email)" },
      { status: 400 }
    );
  }

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
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Time conflict with another appointment", conflictId: conflict.id },
      { status: 409 }
    );
  }

  // If priceAtBooking isn't provided, use the service price (best for consistent history)
  let resolvedPriceAtBooking: any = null;
  if (priceAtBooking !== undefined && priceAtBooking !== null) {
    resolvedPriceAtBooking = priceAtBooking; // can be string or number; Prisma Decimal accepts either
  } else {
    const svc = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
      select: { price: true },
    });
    resolvedPriceAtBooking = svc?.price ?? null;
  }

  const appt = await prisma.appointment.create({
    data: {
      businessId,
      clientId: resolvedClientId,
      serviceId,
      startTime: start,
      endTime: end,
      notes: typeof notes === "string" ? notes.trim() : null,
      status:
        typeof status === "string" && status in AppointmentStatus
          ? (status as AppointmentStatus)
          : AppointmentStatus.SCHEDULED,
      priceAtBooking: resolvedPriceAtBooking,
    },
    include: { client: true, service: true },
  });

  return NextResponse.json({ appointment: appt }, { status: 201 });
}
