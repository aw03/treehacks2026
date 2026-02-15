import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    await prisma.supplyItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();

  const { name, unit, quantity, reorderAt, costPerUnit } = body;

  const supply = await prisma.supplyItem.update({
    where: { id:id },
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
