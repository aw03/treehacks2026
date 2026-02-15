import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(
    req: Request,
    ctx: { params: Promise<{ appointmentId: string }>}) {
  try {
    const params = await ctx.params;
    const appointmentId = params.appointmentId;
    if (!appointmentId) return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const status = body.status as string | undefined;
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const allowed = Object.values(AppointmentStatus);
    if (!allowed.includes(status as AppointmentStatus)) {
      return NextResponse.json({ error: `Invalid status. Use one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as AppointmentStatus },
      include: { client: true, service: true },
    });

    return NextResponse.json({ appointment: updated });
  } catch (e: any) {
    console.error("APPT_STATUS_PATCH_ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to update appointment" }, { status: 500 });
  }
}
