import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseDateOrNull(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) 
{
    try {
        const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  // Default: last 7 days
  const end = parseDateOrNull(searchParams.get("end")) ?? new Date();
  const start =
    parseDateOrNull(searchParams.get("start")) ?? new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const apptWhere = {
    businessId,
    startTime: { gte: start, lte: end },
  } as const;

  const [apptCounts, topServicesRaw, supplies, usageAgg, leadStats, advanceBuckets, busiestDays, busiestHours] =
    await Promise.all([
      prisma.appointment.groupBy({
        by: ["status"],
        where: apptWhere,
        _count: { _all: true },
      }),

      prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { ...apptWhere, status: "COMPLETED" },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      prisma.supplyItem.findMany({
        where: { businessId },
        select: { id: true, name: true, unit: true, quantity: true, reorderAt: true },
        orderBy: { name: "asc" },
      }),

      prisma.serviceInstanceSupplyUsage.groupBy({
        by: ["supplyId"],
        where: { instance: { businessId } },
        _sum: { quantityUsed: true },
        orderBy: { _sum: { quantityUsed: "desc" } },
        take: 5,
      }),

      // Lead time stats (avg + median + same-day %) within period
      prisma.$queryRaw<
        Array<{
          avg_lead_days: number | null;
          median_lead_days: number | null;
          same_day_pct: number | null;
          total: number;
        }>
      >`
        SELECT
          AVG(EXTRACT(EPOCH FROM ("startTime" - "createdAt")) / 86400.0) AS avg_lead_days,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM ("startTime" - "createdAt")) / 86400.0)) AS median_lead_days,
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (SUM(CASE WHEN DATE("startTime") = DATE("createdAt") THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100
          END AS same_day_pct,
          COUNT(*)::int AS total
        FROM "Appointment"
        WHERE "businessId" = ${businessId}
          AND "startTime" >= ${start}
          AND "startTime" <= ${end};
      `,

      // Booking-in-advance buckets
      prisma.$queryRaw<
  Array<{ bucket: string; count: number }>
>`
  WITH lead AS (
    SELECT
      (EXTRACT(EPOCH FROM ("startTime" - "createdAt")) / 86400.0) AS lead_days
    FROM "Appointment"
    WHERE "businessId" = ${businessId}
      AND "startTime" >= ${start}
      AND "startTime" <= ${end}
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN lead_days < 1 THEN 'same-day'
        WHEN lead_days < 3 THEN '1-2 days'
        WHEN lead_days < 7 THEN '3-6 days'
        ELSE '7+ days'
      END AS bucket,
      CASE
        WHEN lead_days < 1 THEN 1
        WHEN lead_days < 3 THEN 2
        WHEN lead_days < 7 THEN 3
        ELSE 4
      END AS sort_key
    FROM lead
  )
  SELECT bucket, COUNT(*)::int AS count
  FROM bucketed
  GROUP BY bucket, sort_key
  ORDER BY sort_key ASC;
`,


      // Busiest days (0=Sunday..6=Saturday)
      prisma.$queryRaw<
        Array<{ dow: number; count: number }>
      >`
        SELECT
          EXTRACT(DOW FROM "startTime")::int AS dow,
          COUNT(*)::int AS count
        FROM "Appointment"
        WHERE "businessId" = ${businessId}
          AND "startTime" >= ${start}
          AND "startTime" <= ${end}
          AND "status" IN ('SCHEDULED','COMPLETED')
        GROUP BY 1
        ORDER BY count DESC;
      `,

      // Busiest hours (0..23)
      prisma.$queryRaw<
        Array<{ hour: number; count: number }>
      >`
        SELECT
          EXTRACT(HOUR FROM "startTime")::int AS hour,
          COUNT(*)::int AS count
        FROM "Appointment"
        WHERE "businessId" = ${businessId}
          AND "startTime" >= ${start}
          AND "startTime" <= ${end}
          AND "status" IN ('SCHEDULED','COMPLETED')
        GROUP BY 1
        ORDER BY count DESC;
      `,
    ]);

  const services = await prisma.service.findMany({
    where: { businessId },
    select: { id: true, name: true, price: true },
  });
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const topServices = topServicesRaw.map((r) => ({
    serviceId: r.serviceId,
    name: serviceById.get(r.serviceId)?.name ?? "Unknown",
    count: r._count._all,
    price: serviceById.get(r.serviceId)?.price?.toString?.() ?? null,
  }));

  const lowSupplies = supplies
    .filter((s) => s.reorderAt !== null && Number(s.quantity) <= Number(s.reorderAt))
    .map((s) => ({
      id: s.id,
      name: s.name,
      quantity: s.quantity?.toString?.() ?? String(s.quantity),
      unit: s.unit,
      reorderAt: s.reorderAt?.toString?.() ?? String(s.reorderAt),
    }));

  const topUsage = usageAgg.map((u) => {
    const supply = supplies.find((s) => s.id === u.supplyId);
    return {
      supplyId: u.supplyId,
      name: supply?.name ?? "Unknown",
      used: u._sum.quantityUsed?.toString?.() ?? String(u._sum.quantityUsed ?? 0),
      unit: supply?.unit ?? null,
    };
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const busiestDaysPretty = busiestDays.map((d) => ({
    day: dayNames[d.dow] ?? String(d.dow),
    count: d.count,
  }));

  const busiestHoursPretty = busiestHours.map((h) => ({
    hour: h.hour,
    label: `${h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour}${h.hour >= 12 ? "PM" : "AM"}`,
    count: h.count,
  }));

  const ls = leadStats?.[0] ?? { avg_lead_days: null, median_lead_days: null, same_day_pct: null, total: 0 };

  return NextResponse.json({
    period: { start: start.toISOString(), end: end.toISOString() },

    appointmentCounts: apptCounts.map((r) => ({ status: r.status, count: r._count._all })),

    bookingInsights: {
      avgLeadDays: ls.avg_lead_days,
      medianLeadDays: ls.median_lead_days,
      sameDayPct: ls.same_day_pct,
      advanceBuckets, // array of { bucket, count }
      busiestDays: busiestDaysPretty.slice(0, 3),
      busiestHours: busiestHoursPretty.slice(0, 5),
    },

    topServices,
    lowSupplies,
    topUsage,

    totals: {
      services: services.length,
      supplies: supplies.length,
    },
  });

    } catch (e: any) {
        console.error("METRICS_ROUTE_CRASH:", e);
        return NextResponse.json(
          { error: e?.message ?? "Metrics route crashed" },
          { status: 500 }
        );
      }
}
