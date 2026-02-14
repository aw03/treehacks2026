import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // simple query to verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        database: "not connected",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
