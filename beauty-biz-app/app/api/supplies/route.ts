import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const supplies = await prisma.supplyItem.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ supplies });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { businessId, name, unit, quantity, reorderAt, costPerUnit } = body;

  if (!businessId || typeof businessId !== "string")
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  if (!name || typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const supply = await prisma.supplyItem.create({
    data: {
      businessId,
      name: name.trim(),
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : null,
      quantity: quantity == null ? "0" : String(quantity),
      reorderAt: reorderAt == null ? null : String(reorderAt),
      costPerUnit: costPerUnit == null ? null : String(costPerUnit),
    },
  });

  return NextResponse.json({ supply }, { status: 201 });
}
