import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeWalkInStatus } from "@/lib/walkin";

export const runtime = "nodejs";

export async function GET(
    _req: Request, 
    ctx: { params: Promise<{ businessId?: string }> }
    ) {
    const params = await ctx.params;
    // const businessId = params.businessId; 
    try {
      const businessId = params.businessId;
  
      if (!businessId) {
        return NextResponse.json(
          { error: "Missing businessId in route params" },
          { status: 400 }
        );
      }
  
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          timezone: true,
          walkInEnabled: true,
          walkInStartMin: true,
          walkInEndMin: true,
        },
      });  

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const services = await prisma.service.findMany({
      where: { businessId },
      select: { id: true, name: true, price: true, durationMin: true },
      orderBy: { name: "asc" },
    });

    const walkIn = computeWalkInStatus({
      timezone: business.timezone,
      walkInEnabled: business.walkInEnabled,
      walkInStartMin: business.walkInStartMin,
      walkInEndMin: business.walkInEndMin,
    });

    return NextResponse.json({
      business,
      services: services.map((s) => ({
        ...s,
        price: s.price.toString(),
      })),
      walkIn,
    });
  } catch (e: any) {
    console.error("BUSINESS_DETAIL_ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to load business" }, { status: 500 });
  }
}
