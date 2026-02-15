import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const instance = await prisma.serviceInstance.findUnique({
    where: { id },
    include: {
      appointment: true,
      service: true,
      supplyUsages: { include: { supply: true } },
    },
  });

  if (!instance) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ instance });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const actualDurationMin =
    body.actualDurationMin === null || body.actualDurationMin === undefined
      ? null
      : Number(body.actualDurationMin);

  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  const supplyUsages = Array.isArray(body.supplyUsages) ? body.supplyUsages : [];

  // Replace-all strategy for hackathon simplicity:
  // 1) update instance fields
  // 2) delete existing supply usage rows
  // 3) recreate from payload
  const updated = await prisma.$transaction(async (tx) => {
    const instance = await tx.serviceInstance.update({
      where: { id },
      data: {
        actualDurationMin: Number.isFinite(actualDurationMin as any) ? actualDurationMin : null,
        notes,
      },
    });

    await tx.serviceInstanceSupplyUsage.deleteMany({ where: { instanceId: id } });

    if (supplyUsages.length > 0) {
      await tx.serviceInstanceSupplyUsage.createMany({
        data: supplyUsages
          .filter((u: any) => typeof u?.supplyId === "string" && u?.quantityUsed !== undefined && u?.quantityUsed !== null)
          .map((u: any) => ({
            instanceId: id,
            supplyId: u.supplyId,
            quantityUsed: String(u.quantityUsed), // Decimal-safe
            unit: typeof u.unit === "string" ? u.unit : null,
            method: typeof u.method === "string" ? u.method : null,
            rawInput: typeof u.rawInput === "string" ? u.rawInput : null,
          })),
      });
    }

    return tx.serviceInstance.findUnique({
      where: { id },
      include: {
        appointment: true,
        service: true,
        supplyUsages: { include: { supply: true } },
      },
    });
  });

  return NextResponse.json({ instance: updated });
}
