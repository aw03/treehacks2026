import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const requestId = `finalize-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log(`[${requestId}] POST /api/usage/instance/${id}/finalize`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.serviceInstance.findUnique({
        where: { id },
        include: { supplyUsages: true },
      });

      if (!instance) throw new Error("ServiceInstance not found");

      console.log(
        `[${requestId}] supplyUsages=${instance.supplyUsages.length} finalizedAt=${(instance as any).finalizedAt ?? "n/a"}`
      );

      // If finalizedAt exists and is set
      if ((instance as any).finalizedAt) {
        throw new Error("Already finalized");
      }

      // Sum usage by supplyId
      const bySupply = new Map<string, number>();
      for (const u of instance.supplyUsages) {
        const used = Number(u.quantityUsed);
        console.log(`[${requestId}] usageRow supplyId=${u.supplyId} quantityUsed=${String(u.quantityUsed)} asNumber=${used}`);
        if (!Number.isFinite(used) || used <= 0) continue;
        bySupply.set(u.supplyId, (bySupply.get(u.supplyId) ?? 0) + used);
      }

      console.log(`[${requestId}] uniqueSuppliesToDecrement=${bySupply.size}`);

      for (const [supplyId, used] of bySupply.entries()) {
        const supply = await tx.supplyItem.findUnique({ where: { id: supplyId } });
        if (!supply) continue;

        // ✅ IMPORTANT: supply.quantity is a Prisma Decimal in many setups.
        // Number(Decimal) can be NaN depending on runtime/shape.
        // Use toString() first.
        const current = Number((supply.quantity as any)?.toString?.() ?? supply.quantity);
        const next = current - used;

        console.log(`[${requestId}] decrement supplyId=${supplyId} current=${current} used=${used} next=${next}`);

        if (!Number.isFinite(current)) {
          throw new Error(`Supply quantity is not numeric for supplyId=${supplyId}`);
        }

        await tx.supplyItem.update({
          where: { id: supplyId },
          data: { quantity: String(next < 0 ? 0 : next) },
        });
      }

      // mark finalized if field exists (otherwise ignore)
      try {
        await tx.serviceInstance.update({
          where: { id },
          data: { ...({ finalizedAt: new Date() } as any) },
        });
      } catch (e) {
        console.log(`[${requestId}] finalizedAt not in schema or update failed (ignored): ${String((e as any)?.message ?? e)}`);
      }

      return true;
    });

    console.log(`[${requestId}] finalize ok`);
    return NextResponse.json({ ok: result });
  } catch (e: any) {
    console.error(`[${requestId}] finalize error`, e);
    return NextResponse.json({ error: e?.message ?? "Finalize failed" }, { status: 400 });
  }
}
