import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.serviceInstance.findUnique({
        where: { id },
        include: { supplyUsages: true },
      });

      if (!instance) throw new Error("ServiceInstance not found");

      // If you added finalizedAt, prevent double finalize.
      // If you didn’t, this check is effectively skipped.
      if ((instance as any).finalizedAt) {
        throw new Error("Already finalized");
      }

      // Sum usage by supplyId (in case same supply appears twice)
      const bySupply = new Map<string, number>();
      for (const u of instance.supplyUsages) {
        const used = Number(u.quantityUsed);
        if (!Number.isFinite(used) || used <= 0) continue;
        bySupply.set(u.supplyId, (bySupply.get(u.supplyId) ?? 0) + used);
      }

      for (const [supplyId, used] of bySupply.entries()) {
        // Decrement using a Decimal-safe string arithmetic via Postgres numeric:
        // easiest hackathon-safe: read, compute in JS, write back as string
        const supply = await tx.supplyItem.findUnique({ where: { id: supplyId } });
        if (!supply) continue;

        const current = Number(supply.quantity);
        const next = current - used;

        await tx.supplyItem.update({
          where: { id: supplyId },
          data: { quantity: String(next < 0 ? 0 : next) },
        });
      }

      // mark finalized if field exists
      try {
        await tx.serviceInstance.update({
          where: { id },
          data: { ...( { finalizedAt: new Date() } as any ) },
        });
      } catch {
        // ignore if finalizedAt not in schema yet
      }

      return true;
    });

    return NextResponse.json({ ok: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Finalize failed" }, { status: 400 });
  }
}
