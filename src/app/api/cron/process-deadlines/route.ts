import { NextResponse } from "next/server";
import db from "@/db";
import { items, orders, priceProposals, stagnantMarkers } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { completeOrderService } from "@/features/transactions/services";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "precheck_cron_secure_token_local";

  // Check CRON_SECRET if in production
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary: Record<string, number> = {
    expiredReservations: 0,
    expiredProposals: 0,
    autoCompletedOrders: 0,
    stagnantMarkersAdded: 0,
  };

  try {
    // 1. Checkout Reservation Expiry (24 Hours)
    const expiredOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, "PENDING_PAYMENT"),
        lt(orders.expiresAt, now)
      ),
    });

    for (const expOrder of expiredOrders) {
      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({ status: "EXPIRED", updatedAt: now })
          .where(eq(orders.id, expOrder.id));

        await tx
          .update(items)
          .set({
            isReserved: false,
            currentStatus: "LISTED",
            updatedAt: now,
          })
          .where(eq(items.id, expOrder.itemId));
      });
      summary.expiredReservations++;
    }

    // 2. Price Proposal Expiry (3 Calendar Days)
    const expiredProps = await db.query.priceProposals.findMany({
      where: and(
        eq(priceProposals.status, "PENDING_PARTNER"),
        lt(priceProposals.expiresAt, now)
      ),
    });

    for (const expProp of expiredProps) {
      await db.transaction(async (tx) => {
        await tx
          .update(priceProposals)
          .set({
            status: "EXPIRED",
            responseNotes: "Batas 3 hari kalender habis tanpa tanggapan mitra",
            respondedAt: now,
          })
          .where(eq(priceProposals.id, expProp.id));

        if (expProp.proposalType === "INITIAL") {
          // If initial proposal, item is withdrawn (BR-061)
          await tx
            .update(items)
            .set({ currentStatus: "WITHDRAWN", updatedAt: now })
            .where(eq(items.id, expProp.itemId));
        }
      });
      summary.expiredProposals++;
    }

    // 3. Auto-Complete Delivered Orders (2x24 Hours = 48 Hours)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const deliveredOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, "DELIVERED"),
        lt(orders.deliveredAt, fortyEightHoursAgo)
      ),
    });

    for (const delOrder of deliveredOrders) {
      try {
        await completeOrderService(delOrder.buyerId, delOrder.id);
        summary.autoCompletedOrders++;
      } catch (err) {
        console.error(`Auto-complete failed for order ${delOrder.id}:`, err);
      }
    }

    // 4. Stagnant Listing Markers (30, 60, 90 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const stagnantItems = await db.query.items.findMany({
      where: and(
        eq(items.currentStatus, "LISTED"),
        lt(items.listedAt, thirtyDaysAgo)
      ),
      with: {
        stagnantMarkers: true,
      },
    });

    for (const item of stagnantItems) {
      const existingMarkers = item.stagnantMarkers.map((m) => m.markerDays);
      const listedTime = item.listedAt ? new Date(item.listedAt).getTime() : now.getTime();
      const daysListed = Math.floor((now.getTime() - listedTime) / (1000 * 60 * 60 * 24));

      let targetMarker: number | null = null;
      if (daysListed >= 90 && !existingMarkers.includes(90)) targetMarker = 90;
      else if (daysListed >= 60 && !existingMarkers.includes(60)) targetMarker = 60;
      else if (daysListed >= 30 && !existingMarkers.includes(30)) targetMarker = 30;

      if (targetMarker) {
        await db.insert(stagnantMarkers).values({
          itemId: item.id,
          markerDays: targetMarker,
          markedAt: now,
          reviewedByAdmin: false,
        });
        summary.stagnantMarkersAdded++;
      }
    }

    return NextResponse.json({
      status: "success",
      timestamp: now.toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("Cron execution error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed running cron tasks" },
      { status: 500 }
    );
  }
}
