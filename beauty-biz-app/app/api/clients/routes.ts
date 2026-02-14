// app/api/clients/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const clients = await prisma.client.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { businessId, name, phone, email, notes } = body;

  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      businessId,
      name: name.trim(),
      phone: typeof phone === "string" ? phone.trim() : null,
      email: typeof email === "string" ? email.trim() : null,
      notes: typeof notes === "string" ? notes.trim() : null,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
