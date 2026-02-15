import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;

  if (!id) {
    return NextResponse.json(
      { error: `Missing service id in route, recieved ${id}` },
      { status: 400 }
    );
  }

  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}
