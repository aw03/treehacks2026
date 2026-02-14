// app/api/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { businessId, name, price, durationMin } = body;

  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  if (price === undefined || price === null || isNaN(Number(price))) {
    return NextResponse.json({ error: "Missing/invalid price" }, { status: 400 });
  }
  if (!Number.isInteger(Number(durationMin)) || Number(durationMin) <= 0) {
    return NextResponse.json({ error: "Missing/invalid durationMin" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      businessId,
      name: name.trim(),
      price: (String(price)),
      durationMin: Number(durationMin),
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
