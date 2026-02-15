import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId : null;
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : null;
  const source = body.source === "WALK_IN" ? "WALK_IN" : "APPOINTMENT";

  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  // Appointment-based instance: upsert by unique appointmentId
  if (appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: { service: true, client: true },
    });
    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const instance = await prisma.serviceInstance.upsert({
      where: { appointmentId }, // unique in your schema
      update: {},
      create: {
        businessId,
        serviceId: appt.serviceId,
        appointmentId,
        source: "APPOINTMENT",
        priceAtCompletion: appt.priceAtBooking ?? null,
      },
      include: {
        appointment: true,
        service: true,
        supplyUsages: { include: { supply: true } },
      },
    });

    return NextResponse.json({ instance });
  }

  // Walk-in instance requires a serviceId
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId for walk-in" }, { status: 400 });

  // confirm service belongs to business
  const svc = await prisma.service.findFirst({ where: { id: serviceId, businessId } });
  if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const instance = await prisma.serviceInstance.create({
    data: {
      businessId,
      serviceId,
      source,
      priceAtCompletion: svc.price, // snapshot at time of walk-in
    },
    include: {
      appointment: true,
      service: true,
      supplyUsages: { include: { supply: true } },
    },
  });

  return NextResponse.json({ instance }, { status: 201 });
}
