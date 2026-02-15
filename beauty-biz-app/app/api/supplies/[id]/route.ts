import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, unit, quantity, reorderAt, costPerUnit } = body;

  const supply = await prisma.supplyItem.update({
    where: { id: params.id },
    data: {
      name: typeof name === "string" ? name.trim() : undefined,
      unit: typeof unit === "string" ? (unit.trim() || null) : undefined,
      quantity: quantity === undefined ? undefined : String(quantity),
      reorderAt: reorderAt === undefined ? undefined : reorderAt == null ? null : String(reorderAt),
      costPerUnit: costPerUnit === undefined ? undefined : costPerUnit == null ? null : String(costPerUnit),
    },
  });

  return NextResponse.json({ supply });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.supplyItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
